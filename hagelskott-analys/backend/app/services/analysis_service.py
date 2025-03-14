from datetime import datetime
from typing import Dict, Any, List
import logging
import cv2
import numpy as np
from fastapi import HTTPException, UploadFile
from bson import ObjectId
import aiofiles
import os
from pathlib import Path

from app.core.config import settings
from app.db.mongodb import db

# Import av mönsteranalys (om du vill anropa PatternAnalyzer i stället)
from app.services.pattern_analysis import PatternAnalyzer
from app.services.image_processing import ImageProcessor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Publik åtkomst (ex. http://127.0.0.1:8000 => statiska bilder)
IMAGES_BASE_URL = "http://127.0.0.1:8000"


class AnalysisService:
    """
    AnalysisService
    --------------
    Hanterar uppladdning av hagelträffsbild, kör bildförbehandling + pattern-analysering,
    samt sparar resultat i databasen. Tillhandahåller även logik för att
    uppdatera hagelträffar (pellets) och ring manuellt.

    Metoder (översikt):
      1) analyze_shot_image(file, user_id, metadata)
      2) get_shot_analysis(shot_id, user_id)
      3) update_shot_analysis(shot_id, user_id, final_data)
      4) delete_analysis(shot_id, user_id)
      5) add_hits_to_analysis(shot_id, user_id, hits_to_add)
      6) remove_hits_from_analysis(shot_id, user_id, hits_to_remove)
      7) update_ring(shot_id, user_id, ring_data)

    Nytt/utökat:
      - _recalc_analysis_stats(analysis_results) => snabb omberäkning av hit_count, spread, etc.
        baserat på existerande individual_pellets.
    """

    def __init__(self):
        self.pattern_analyzer = PatternAnalyzer()
        self.image_processor = ImageProcessor()

        # Vilka filtyper som är tillåtna
        self.valid_image_types = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/bmp": ".bmp"
        }

    async def analyze_shot_image(
        self,
        file: UploadFile,
        user_id: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Tar emot en uppladdad bild + metadata, kör analys och sparar i DB.

        Steg:
          1) Verifiera filtyp + storlek.
          2) Öppna med OpenCV.
          3) Spara originalbild lokalt.
          4) Preprocess + pattern_analysis.
          5) Bygg shot_doc, inkl. image_info + image_url.
          6) Spara i DB (shots) och returnera doc.
        """
        logger.info("=== [AnalysisService] analyze_shot_image: START ===")
        try:
            # 1) Filtyp & storlek
            logger.debug(
                "Kontrollerar bildtyp=%s, filnamn=%s, user_id=%s",
                file.content_type, file.filename, user_id
            )
            if file.content_type not in self.valid_image_types:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Otillåten bildtyp '{file.content_type}'. "
                        f"Tillåtet är: {list(self.valid_image_types.keys())}"
                    )
                )

            contents = await file.read()
            if not contents:
                raise HTTPException(400, "Uppladdad bild är tom (inga bytes).")

            file_size = len(contents)
            logger.debug("[AnalysisService] Filstorlek (bytes): %d", file_size)
            if file_size > settings.MAX_UPLOAD_SIZE:
                max_mb = settings.MAX_UPLOAD_SIZE / (1024 * 1024)
                raise HTTPException(
                    400,
                    detail=f"Bildfilen överskrider {max_mb:.2f} MB."
                )

            # 2) Läs in via OpenCV
            nparr = np.frombuffer(contents, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if image is None:
                logger.error("OpenCV kunde ej avkoda bilden => korrupt fil?")
                raise HTTPException(400, "Fel: kunde ej avkoda bilddata via OpenCV.")

            logger.info(
                "[AnalysisService] Fil mottagen -> %s, shape=%s, size_bytes=%d",
                file.filename, image.shape, file_size
            )

            # 3) Spara bild lokalt
            file_path = await self._save_image(contents, file.filename, user_id)
            logger.debug("Lokalt sparad bild: %s", file_path)

            # 4) Förbehandling + analys
            try:
                logger.debug("Preprocessar bild via ImageProcessor...")
                processed_img = self.image_processor.preprocess_image(image)
                quality_metrics = self.image_processor.analyze_image_quality(processed_img)
                logger.debug("image_quality => %s", quality_metrics)
            except Exception as e:
                logger.error("Fel i image_processor => %s", e, exc_info=True)
                raise HTTPException(500, f"Fel vid bildförbehandling: {str(e)}")

            try:
                logger.debug("Kallar pattern_analyzer.analyze_shot_pattern...")
                analysis_results = self.pattern_analyzer.analyze_shot_pattern(processed_img)
                # Se till att "individual_pellets" alltid finns
                if "individual_pellets" not in analysis_results:
                    logger.debug("Ingen 'individual_pellets' => skapar tom []")
                    analysis_results["individual_pellets"] = []

                logger.info(
                    "Pattern analysis => hits=%s, ring=%s",
                    analysis_results.get('hit_count'),
                    analysis_results.get('ring')
                )
            except Exception as e:
                logger.error("pattern_analyzer-fel => %s", e, exc_info=True)
                raise HTTPException(500, f"Kunde ej genomföra pattern-analys: {str(e)}")

            # 5) Bygg shot_doc
            valid_meta = self._validate_metadata(metadata)
            shot_doc = {
                "user_id": user_id,
                "metadata": valid_meta,  # shotgun/ammunition/conditions
                "analysis_results": analysis_results,
                "image_quality": quality_metrics,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "status": "auto_detected"
            }

            # Lägg till info om bild
            shot_doc["image_info"] = {
                "filename": file.filename,
                "saved_path": file_path,
                "width": image.shape[1],
                "height": image.shape[0],
                "content_type": file.content_type,
                "size_bytes": file_size
            }
            # Publik URL
            basename = os.path.basename(file_path)
            shot_doc["image_url"] = f"{IMAGES_BASE_URL}/uploads/{user_id}/{basename}"

            # Bygg tags
            shot_doc["tags"] = self._generate_tags(valid_meta, analysis_results)
            logger.debug("shot_doc => %s", shot_doc)

            # 6) Spara i DB
            try:
                db_conn = await db.get_database()
                shots_coll = db_conn["shots"]
                resp = await shots_coll.insert_one(shot_doc)
                shot_doc["_id"] = str(resp.inserted_id)

                # Uppdatera user-stats
                await self._update_user_statistics(user_id, analysis_results)

                logger.info("Sparat _id=%s i 'shots'.", shot_doc["_id"])
                return shot_doc

            except Exception as e:
                logger.error("DB insert fel => %s", e, exc_info=True)
                await self._cleanup_image(file_path)  # rensa fil om insert failar
                raise HTTPException(500, "Kunde inte spara analys i databasen.")

        except HTTPException:
            logger.error("HTTPException => re-raise.")
            raise
        except Exception as e:
            logger.error("Oväntat fel => %s", e, exc_info=True)
            raise HTTPException(500, f"Oväntat fel: {str(e)}")
        finally:
            logger.info("=== [AnalysisService] analyze_shot_image: END ===")

    async def get_shot_analysis(self, shot_id: str, user_id: str) -> Dict[str, Any]:
        """
        Hämtar ett sparat dokument (shot) i DB via _id + user_id.
        Returnerar det som en dict, inklusive 'analysis_results' m.m.
        """
        logger.debug("get_shot_analysis => shot_id=%s, user_id=%s", shot_id, user_id)
        try:
            db_conn = await db.get_database()
            shots_coll = db_conn["shots"]
            doc = await shots_coll.find_one({"_id": ObjectId(shot_id), "user_id": user_id})
            if not doc:
                logger.warning("Ingen analys funnen för shot_id=%s", shot_id)
                raise HTTPException(404, "Analysen hittades ej (fel id eller user).")

            doc["_id"] = str(doc["_id"])
            return doc

        except HTTPException:
            raise
        except Exception as e:
            logger.error("get_shot_analysis fel => %s", e, exc_info=True)
            raise HTTPException(500, "Kunde inte hämta analysen.")

    async def update_shot_analysis(
        self,
        shot_id: str,
        user_id: str,
        final_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Exempel: ange ring/pellets manuellt => spara i 'analysis_results'.
        OBS: denna "allt i ett"-metod är ibland ersatt av add_hits_to_analysis / remove_hits_from_analysis / update_ring.
        """
        logger.debug("update_shot_analysis => shot_id=%s, user_id=%s", shot_id, user_id)
        try:
            db_conn = await db.get_database()
            shots_coll = db_conn["shots"]

            existing = await shots_coll.find_one({"_id": ObjectId(shot_id), "user_id": user_id})
            if not existing:
                logger.warning("Inget doc funnet => shot_id=%s, user_id=%s", shot_id, user_id)
                raise HTTPException(404, "Analysen finns ej eller fel user.")

            analysis_results = existing.get("analysis_results", {})
            logger.debug("Befintliga analysis_results => %s", analysis_results)

            # Ex: final_ring
            if "ring" in final_data:
                logger.info("Sätter final_ring => %s", final_data["ring"])
                analysis_results["final_ring"] = dict(final_data["ring"])

            # Ex: final_pellets
            if "pellets" in final_data:
                logger.info("Sätter final_pellets => %s", final_data["pellets"])
                analysis_results["final_pellets"] = list(final_data["pellets"])

            # Räkna om stats (enkel approach)
            final_count = len(analysis_results.get("final_pellets", []))
            new_density = round(final_count / 100.0, 2)
            analysis_results["hit_count"] = final_count
            analysis_results["pattern_density"] = new_density

            existing["status"] = "completed"
            existing["analysis_results"] = analysis_results
            existing["updated_at"] = datetime.utcnow()

            logger.debug("Uppdaterade analysis_results => %s", analysis_results)

            result = await shots_coll.update_one(
                {"_id": ObjectId(shot_id)},
                {
                    "$set": {
                        "analysis_results": analysis_results,
                        "status": "completed",
                        "updated_at": existing["updated_at"]
                    }
                }
            )
            if result.modified_count == 0:
                logger.error("DB update => modified_count=0 => ingen uppdatering.")
                raise HTTPException(500, "Kunde inte uppdatera shot i databasen.")

            # uppdatera user-stats
            await self._update_user_statistics(user_id, analysis_results)

            existing["_id"] = str(existing["_id"])
            return existing

        except HTTPException:
            raise
        except Exception as e:
            logger.error("update_shot_analysis fel => %s", e, exc_info=True)
            raise HTTPException(500, f"Kunde ej uppdatera analys => {str(e)}")

    async def delete_analysis(self, shot_id: str, user_id: str) -> Dict[str, str]:
        """
        Raderar en analys + ev. dess sparade bildfil från disk.
        """
        logger.debug("delete_analysis => shot_id=%s", shot_id)
        try:
            doc = await self.get_shot_analysis(shot_id, user_id)
            db_conn = await db.get_database()
            shots_coll = db_conn["shots"]

            res = await shots_coll.delete_one({"_id": ObjectId(shot_id), "user_id": user_id})
            if res.deleted_count == 0:
                logger.warning("delete_analysis => ingen doc raderades, shot_id=%s", shot_id)
                raise HTTPException(404, "Analysen fanns ej eller fel user?")

            # Rensa fil om den finns
            saved_path = doc.get("image_info", {}).get("saved_path")
            if saved_path:
                logger.info("Rensar fil => %s", saved_path)
                await self._cleanup_image(saved_path)

            return {"message": "Analysen raderades."}

        except HTTPException:
            raise
        except Exception as e:
            logger.error("delete_analysis fel => %s", e, exc_info=True)
            raise HTTPException(500, "Kunde inte radera analysen.")

    # -------------------------------------------------
    # Hjälp-funktioner för hits/ring
    # -------------------------------------------------

    async def add_hits_to_analysis(self, shot_id: str, user_id: str,
                                   hits_to_add: List[Dict[str, float]]) -> Dict[str, Any]:
        """
        Lägger till nya hagelträffar (individual_pellets) i analysis_results.
        Reberäknar sedan statistiken innan vi sparar.
        """
        logger.debug("add_hits_to_analysis => shot_id=%s, hits_to_add=%s", shot_id, hits_to_add)
        try:
            db_conn = await db.get_database()
            shots_coll = db_conn["shots"]
            doc = await shots_coll.find_one({"_id": ObjectId(shot_id), "user_id": user_id})
            if not doc:
                raise HTTPException(404, "Analysen finns ej eller fel user.")

            analysis_results = doc.get("analysis_results", {})
            # se till att individual_pellets finns
            analysis_results.setdefault("individual_pellets", [])

            for h in hits_to_add:
                new_hit = {"x": h["x"], "y": h["y"]}
                analysis_results["individual_pellets"].append(new_hit)

            # => Recalc stats (utökad metod)
            analysis_results = self._recalc_analysis_stats(doc, analysis_results)

            # Spara
            doc["analysis_results"] = analysis_results
            doc["updated_at"] = datetime.utcnow()

            await shots_coll.update_one(
                {"_id": ObjectId(shot_id)},
                {"$set": {
                    "analysis_results": analysis_results,
                    "updated_at": doc["updated_at"]
                }}
            )

            # uppdatera user-stats
            await self._update_user_statistics(user_id, analysis_results)

            doc["_id"] = str(doc["_id"])
            return doc

        except Exception as e:
            logger.error("add_hits_to_analysis fel => %s", e, exc_info=True)
            raise HTTPException(500, f"Kunde ej lägga till hagelträffar => {str(e)}")

    async def remove_hits_from_analysis(self, shot_id: str, user_id: str,
                                        hits_to_remove: List[Dict[str, float]]) -> Dict[str, Any]:
        """
        Tar bort hagelträffar (individual_pellets) baserat på exakta (x,y)-matchningar.
        Reberäknar sedan statistiken.
        """
        logger.debug("remove_hits_from_analysis => shot_id=%s, hits_to_remove=%s", shot_id, hits_to_remove)
        try:
            db_conn = await db.get_database()
            shots_coll = db_conn["shots"]
            doc = await shots_coll.find_one({"_id": ObjectId(shot_id), "user_id": user_id})
            if not doc:
                raise HTTPException(404, "Analysen finns ej eller fel user.")

            analysis_results = doc.get("analysis_results", {})
            pellets = analysis_results.get("individual_pellets", [])

            remove_set = {(h["x"], h["y"]) for h in hits_to_remove}
            new_pellets = [p for p in pellets if (p["x"], p["y"]) not in remove_set]
            analysis_results["individual_pellets"] = new_pellets

            # => Recalc stats
            analysis_results = self._recalc_analysis_stats(doc, analysis_results)

            doc["analysis_results"] = analysis_results
            doc["updated_at"] = datetime.utcnow()

            await shots_coll.update_one(
                {"_id": ObjectId(shot_id)},
                {"$set": {
                    "analysis_results": analysis_results,
                    "updated_at": doc["updated_at"]
                }}
            )

            # uppdatera user-stats
            await self._update_user_statistics(user_id, analysis_results)

            doc["_id"] = str(doc["_id"])
            return doc

        except Exception as e:
            logger.error("remove_hits_from_analysis fel => %s", e, exc_info=True)
            raise HTTPException(500, f"Kunde ej ta bort hagelträffar => {str(e)}")

    async def update_ring(self, shot_id: str, user_id: str, ring_data: Dict[str, float]) -> Dict[str, Any]:
        """
        Uppdaterar/definierar ring i analysis_results.ring.
        Ex. ring_data: { "centerX": 50, "centerY": 50, "radiusPx": 40 }
        """
        logger.debug("update_ring => shot_id=%s, ring_data=%s", shot_id, ring_data)
        try:
            db_conn = await db.get_database()
            shots_coll = db_conn["shots"]
            doc = await shots_coll.find_one({"_id": ObjectId(shot_id), "user_id": user_id})
            if not doc:
                raise HTTPException(404, "Analysen finns ej eller fel user?")

            analysis_results = doc.get("analysis_results", {})
            # se till att ring finns
            analysis_results["ring"] = {
                "centerX": ring_data["centerX"],
                "centerY": ring_data["centerY"],
                "radius_px": ring_data["radiusPx"]
            }

            # Om du vill kan du re-calc nåt baserat på ring, men här är det valfritt
            doc["analysis_results"] = analysis_results
            doc["updated_at"] = datetime.utcnow()

            await shots_coll.update_one(
                {"_id": ObjectId(shot_id)},
                {
                    "$set": {
                        "analysis_results": analysis_results,
                        "updated_at": doc["updated_at"]
                    }
                }
            )

            doc["_id"] = str(doc["_id"])
            return doc

        except Exception as e:
            logger.error("update_ring fel => %s", e, exc_info=True)
            raise HTTPException(500, f"Kunde ej uppdatera ring => {str(e)}")

    # -------------------------------------------------
    # Hjälpmetoder för filhantering & metadata
    # -------------------------------------------------
    async def _save_image(self, image_data: bytes, filename: str, user_id: str) -> str:
        """
        Sparar bilden i UPLOAD_DIR/<user_id>/<timestamp>_ObjectId.<ext>
        Returnerar den absoluta sökvägen.
        """
        logger.debug("_save_image => user_id=%s, filename=%s", user_id, filename)
        try:
            user_dir = Path(settings.UPLOAD_DIR) / user_id
            user_dir.mkdir(parents=True, exist_ok=True)

            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            extension = Path(filename).suffix
            new_filename = f"{timestamp}_{ObjectId()}{extension}"
            file_path = user_dir / new_filename

            async with aiofiles.open(file_path, "wb") as out_file:
                await out_file.write(image_data)

            logger.info("Sparade bild => %s", file_path)
            return str(file_path)

        except Exception as e:
            logger.error("_save_image => %s", e, exc_info=True)
            raise HTTPException(500, f"Kunde inte spara bildfil: {str(e)}")

    async def _cleanup_image(self, file_path: str) -> None:
        """
        Raderar fil från disk om den existerar.
        """
        logger.debug("_cleanup_image => %s", file_path)
        try:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
                logger.debug("Fil raderad => %s", file_path)
        except Exception as e:
            logger.error("_cleanup_image => %s", e, exc_info=True)
            # ingen HTTPException => vill inte stoppa flödet

    def _validate_metadata(self, meta: Dict[str, Any]) -> Dict[str, Any]:
        """
        Säkerställer att metadata innehåller åtminstone: 'shotgun', 'ammunition', 'conditions'.
        """
        logger.debug("_validate_metadata => %s", meta)
        required_keys = ["shotgun", "ammunition", "conditions"]
        for rk in required_keys:
            if rk not in meta:
                meta[rk] = {}
        return meta

    # -------------------------------------------------
    # Stats-uppdatering
    # -------------------------------------------------
    async def _update_user_statistics(self, user_id: str, analysis_results: Dict[str, Any]) -> None:
        """
        Uppdaterar user-statistik i 'user_statistics', ex. total_shots, total_hits etc.
        Kallas t.ex. i slutet av 'analyze_shot_image', 'add_hits_to_analysis' m.fl.
        Hindrar ej flödet om error uppstår.
        """
        logger.debug("_update_user_statistics => user=%s", user_id)
        try:
            db_conn = await db.get_database()
            stats_coll = db_conn["user_statistics"]

            new_hits = analysis_results.get("hit_count", 0)
            new_density = analysis_results.get("pattern_density", 0.0)

            existing = await stats_coll.find_one({"user_id": user_id})
            if not existing:
                doc = {
                    "user_id": user_id,
                    "total_shots": 1,
                    "total_hits": new_hits,
                    "average_hits": new_hits,
                    "best_pattern_density": new_density,
                    "last_updated": datetime.utcnow()
                }
                await stats_coll.insert_one(doc)
                logger.debug("Skapade ny user_stats => %s", doc)
            else:
                # Enkelt exempel – men tänk på att remove hits ev. borde sänka total_hits
                total_shots = existing.get("total_shots", 0) + 1
                total_hits = existing.get("total_hits", 0) + new_hits
                avg_hits = round(total_hits / total_shots, 2) if total_shots > 0 else new_hits
                best_density = max(existing.get("best_pattern_density", 0.0), new_density)

                await stats_coll.update_one(
                    {"user_id": user_id},
                    {
                        "$set": {
                            "total_shots": total_shots,
                            "total_hits": total_hits,
                            "average_hits": avg_hits,
                            "best_pattern_density": best_density,
                            "last_updated": datetime.utcnow()
                        }
                    }
                )
                logger.debug(
                    "Uppdaterade user_stats => user_id=%s, total_shots=%d, total_hits=%d",
                    user_id, total_shots, total_hits
                )
        except Exception as e:
            logger.error("update_user_statistics => %s", e, exc_info=True)
            # Kastar ingen HTTPException => vill ej stoppa flödet pga stats-fel.

    # -------------------------------------------------
    # Generera "tags"
    # -------------------------------------------------
    def _generate_tags(self, metadata: Dict[str, Any], analysis_results: Dict[str, Any]) -> List[str]:
        """
        Returnerar en enkel lista av "tags" utifrån metadata + results.
        Exempel: shotgun:Benelli, model:Nova, gauge:12, ...
        """
        logger.debug("_generate_tags => meta=%s, results=%s", metadata, analysis_results)
        tags = []
        shotgun = metadata.get("shotgun", {})

        if shotgun.get("manufacturer"):
            tags.append(f"shotgun:{shotgun['manufacturer']}")
        if shotgun.get("model"):
            tags.append(f"model:{shotgun['model']}")
        if shotgun.get("gauge"):
            tags.append(f"gauge:{shotgun['gauge']}")
        if shotgun.get("choke"):
            tags.append(f"choke:{shotgun['choke']}")

        ammo = metadata.get("ammunition", {})
        if ammo.get("type"):
            tags.append(f"type:{ammo['type']}")
        if ammo.get("manufacturer"):
            tags.append(f"ammo:{ammo['manufacturer']}")

        # Ex. hits/density
        hits = analysis_results.get("hit_count", 0)
        density = analysis_results.get("pattern_density", 0.0)

        if hits > 200:
            tags.append("high_hit_count")
        elif hits < 50:
            tags.append("low_hit_count")

        # Obs: du väljer själv thresholds
        if density > 70:
            tags.append("high_density")
        elif density < 30:
            tags.append("low_density")

        unique_tags = list(set(tags))
        logger.debug("Slutliga tags => %s", unique_tags)
        return unique_tags

    # -------------------------------------------------
    # Ny helper: Recalc stats från pellets
    # -------------------------------------------------
    def _recalc_analysis_stats(self, doc: Dict[str, Any], analysis_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        En förenklad metod som återberäknar ex. hit_count, spread, closest_hits baserat på
        'individual_pellets'. Vi vill *inte* köra om hela OpenCV-analysen, utan bara räkna om
        statistiken utifrån kända pellets.

        Om du vill ha en mer avancerad approach (t.ex. DBSCAN, zone_analysis),
        kan du kopiera logik från pattern_analysis.py.
        """

        logger.debug("[_recalc_analysis_stats] Startar omberäkning baserat på pellets...")

        pellets = analysis_results.get("individual_pellets", [])
        if not pellets:
            analysis_results["hit_count"] = 0
            analysis_results["pattern_density"] = 0.0
            analysis_results["spread"] = 0.0
            analysis_results["closest_hits"] = []
            analysis_results["outer_hits"] = []
            return analysis_results

        # 1) Räkna antalet
        count_hits = len(pellets)

        # 2) Hämta bildstorlek (om det finns i doc["image_info"])
        width = doc.get("image_info", {}).get("width", 1)
        height = doc.get("image_info", {}).get("height", 1)

        # 3) Räkna centroid (i pixlar)
        #    pellets är i procent? -> Kolla hur ni sparar. I exempelkoden är x,y i %
        #    men om de redan är i % ställer vi om dem till px innan spridning
        px_coords = []
        for p in pellets:
            x_px = (p["x"] / 100.0) * width
            y_px = (p["y"] / 100.0) * height
            px_coords.append((x_px, y_px))

        # centroid:
        x_sum = sum([pt[0] for pt in px_coords])
        y_sum = sum([pt[1] for pt in px_coords])
        centroid_x_px = x_sum / count_hits
        centroid_y_px = y_sum / count_hits

        # 4) Räkna spread = standardavvikelse i radie (förenklat)
        import math
        import statistics
        dists = []
        for pt in px_coords:
            dx = pt[0] - centroid_x_px
            dy = pt[1] - centroid_y_px
            dist = math.sqrt(dx * dx + dy * dy)
            dists.append(dist)

        spread_val = statistics.pstdev(dists) if len(dists) > 1 else 0.0

        # 5) ex. pattern_density = hits / ( pi * max_dist^2 )? Eller en enkel approach
        #    Här kan vi göra en enkel approach:
        #    pattern_density = count_hits / 100.0
        pattern_density = round(count_hits / 100.0, 2)

        # 6) Hitta closest/outer hits (top 5) från centroid
        #    Sortera dists
        sorted_indices = sorted(range(len(dists)), key=lambda i: dists[i])
        closest = sorted_indices[:5]
        outer = sorted_indices[-5:] if len(sorted_indices) >= 5 else sorted_indices

        closest_hits = []
        outer_hits = []
        for i in closest:
            # transform back to x%, y%
            pct_x = (px_coords[i][0] / width) * 100.0
            pct_y = (px_coords[i][1] / height) * 100.0
            closest_hits.append({"x": pct_x, "y": pct_y, "distance": dists[i]})
        for i in outer:
            pct_x = (px_coords[i][0] / width) * 100.0
            pct_y = (px_coords[i][1] / height) * 100.0
            outer_hits.append({"x": pct_x, "y": pct_y, "distance": dists[i]})

        # 7) Spara tillbaka i analysis_results
        analysis_results["hit_count"] = count_hits
        analysis_results["pattern_density"] = pattern_density
        analysis_results["spread"] = round(spread_val, 2)

        # centroid i %:
        analysis_results["centroid"] = {
            "x": round((centroid_x_px / width) * 100, 2),
            "y": round((centroid_y_px / height) * 100, 2)
        }

        analysis_results["closest_hits"] = closest_hits
        analysis_results["outer_hits"] = outer_hits

        logger.debug("[_recalc_analysis_stats] KLAR -> hits=%s, density=%.2f, spread=%.2f",
                     count_hits, pattern_density, spread_val)
        return analysis_results


# Singleton-instans att importera och använda i dina rutter
analysis_service = AnalysisService()
