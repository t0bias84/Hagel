from fastapi import (
    APIRouter,
    UploadFile,
    File,
    HTTPException,
    Query,
    Depends,
    Body
)
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
import logging
import cv2
import numpy as np
from pydantic import BaseModel

# Egna imports
from app.services.pattern_analysis import PatternAnalyzer
from app.services.image_processing import ImageProcessor
from app.db.mongodb import db
# OBS: Importera RÄTT "AnalysisFilter" från schemas/analysis.py, 
# där du har ammunition_type, gun_manufacturer, etc.
from app.api.schemas.analysis import (
    ShotAnalysisResult,
    ShotMetadata,
    AnalysisFilter,   # se till att denna har ammunition_type, gun_manufacturer, etc.
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
router = APIRouter()


def _cast_floats(obj):
    """
    Rekursiv konvertering av np.float32/float64 => Python float.
    Undviker 'cannot encode object' i MongoDB.
    """
    if isinstance(obj, dict):
        return {k: _cast_floats(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_cast_floats(x) for x in obj]
    elif isinstance(obj, (np.float32, np.float64)):
        return float(obj)
    return obj


class ExtendedShotMetadata(ShotMetadata):
    """
    Extra metadata (tidigare använt):
    - conditions: Dict[str, Optional[str]]
    - shotgun: Dict[str, Optional[str]]
    - ammunition: Dict[str, Optional[str]]
    """
    conditions: Optional[Dict[str, Optional[str]]] = None
    shotgun: Optional[Dict[str, Optional[str]]] = None
    ammunition: Optional[Dict[str, Optional[str]]] = None


@router.post("/upload", response_model=ShotAnalysisResult)
async def upload_shot_image(
    file: UploadFile = File(...),
    metadata: ExtendedShotMetadata = Depends()
):
    """
    Ladda upp en hagelskottsbild + metadata.
    1) Läser bild i OpenCV
    2) Sparar bilden fysiskt i 'uploads/<filnamn>'
    3) Analyserar med (ex) sensitivity=0.5, pix_per_cm=1.0
    4) Sparar 'image_path' => reanalyze_shot kan läsa från disk
    """
    try:
        valid_formats = {".jpg", ".jpeg", ".png", ".bmp"}
        file_ext = "." + file.filename.split(".")[-1].lower()
        if file_ext not in valid_formats:
            raise HTTPException(
                status_code=400,
                detail=f"Ogiltigt filformat '{file_ext}'."
            )

        # 1) Läs filen i minnet
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise HTTPException(400, "Kunde ej avkoda bilden (OpenCV gav None).")

        # 2) Spara bilden på disk => "uploads/<filnamn>"
        #    Se till att mappen "uploads" finns på servern
        save_path = f"uploads/{file.filename}"
        cv2.imwrite(save_path, image)

        # 3) Analysera i PatternAnalyzer
        analyzer = PatternAnalyzer()
        processed = ImageProcessor().preprocess_image(image)
        analysis_results = analyzer.analyze_shot_pattern(
            processed,
            sensitivity=0.5,   # default
            pix_per_cm=1.0
        )
        analysis_results = _cast_floats(analysis_results)

        # 4) Bygg doc med all metadata
        doc = {
            "filename": file.filename,
            "timestamp": datetime.utcnow(),
            "metadata": metadata.dict(),
            "analysis_results": analysis_results,
            "image_dimensions": {
                "width": image.shape[1],
                "height": image.shape[0]
            },
            "image_path": save_path  # Viktigt för reAnalyze
        }

        db_conn = await db.get_database()
        shots_coll = db_conn["shots"]
        insert_res = await shots_coll.insert_one(doc)

        return JSONResponse(
            status_code=200,
            content={
                "id": str(insert_res.inserted_id),
                "results": analysis_results,
                "metadata": metadata.dict(),
                "message": "Analys genomförd och sparad."
            }
        )

    except Exception as e:
        logger.error(f"Fel i /upload => {e}", exc_info=True)
        raise HTTPException(500, f"Fel vid upload_shot_image => {e}")


@router.get("/results/{shot_id}", response_model=ShotAnalysisResult)
async def get_shot_results(shot_id: str):
    """
    Hämtar ett sparat skott (analysis) via _id.
    Returnerar 'analysis_results', 'metadata', 'image_path' etc.
    """
    try:
        db_conn = await db.get_database()
        shots_coll = db_conn["shots"]
        doc = await shots_coll.find_one({"_id": ObjectId(shot_id)})
        if not doc:
            raise HTTPException(404, "Analysen hittades ej.")
        doc["_id"] = str(doc["_id"])
        return doc

    except Exception as e:
        logger.error(f"Fel i get_shot_results => {e}", exc_info=True)
        raise HTTPException(500, "Kunde inte hämta analys.")


@router.get("/results", response_model=List[ShotAnalysisResult])
async def get_all_results(
    limit: int = Query(10, ge=1, le=100),
    skip: int = Query(0, ge=0),
    sort_by: str = Query("timestamp", regex="^(timestamp|hit_count|spread)$"),
    sort_order: int = Query(-1, ge=-1, le=1),
    filter_params: AnalysisFilter = Depends()
):
    """
    Hämtar flera resultat med ev. filter:
      - start_date/end_date
      - min_hits / max_hits
      - ammunition_type
      - gun_manufacturer, gun_model
      - ...
    """
    try:
        db_conn = await db.get_database()
        shots_coll = db_conn["shots"]
        q: Dict[str, Any] = {}

        # Datumfilter
        if filter_params.start_date or filter_params.end_date:
            q["timestamp"] = {}
            if filter_params.start_date:
                q["timestamp"]["$gte"] = filter_params.start_date
            if filter_params.end_date:
                q["timestamp"]["$lte"] = filter_params.end_date

        # hits
        if filter_params.min_hits is not None or filter_params.max_hits is not None:
            q.setdefault("analysis_results.hit_count", {})
            if filter_params.min_hits is not None:
                q["analysis_results.hit_count"]["$gte"] = filter_params.min_hits
            if filter_params.max_hits is not None:
                q["analysis_results.hit_count"]["$lte"] = filter_params.max_hits

        # ammunition_type => "metadata.ammunition.type"
        if filter_params.ammunition_type:
            q["metadata.ammunition.type"] = filter_params.ammunition_type

        # gun_manufacturer => "metadata.shotgun.manufacturer"
        if filter_params.gun_manufacturer:
            q["metadata.shotgun.manufacturer"] = filter_params.gun_manufacturer

        # gun_model => "metadata.shotgun.model"
        if filter_params.gun_model:
            q["metadata.shotgun.model"] = filter_params.gun_model

        # Du kan lägga fler filter om du vill

        cursor = shots_coll.find(q)\
            .sort(sort_by, sort_order)\
            .skip(skip)\
            .limit(limit)

        results = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            results.append(doc)

        return results

    except Exception as e:
        logger.error(f"Fel i get_all_results => {e}", exc_info=True)
        raise HTTPException(500, "Kunde inte hämta listan av resultat.")


@router.delete("/results/{shot_id}")
async def delete_shot_result(shot_id: str):
    """
    Raderar en analys från DB.
    """
    try:
        db_conn = await db.get_database()
        shots_coll = db_conn["shots"]
        res = await shots_coll.delete_one({"_id": ObjectId(shot_id)})

        if res.deleted_count == 0:
            raise HTTPException(404, "Hittade ingen att radera.")

        return {"message": "Resultatet raderat."}

    except Exception as e:
        logger.error(f"Fel i delete_shot_result => {e}", exc_info=True)
        raise HTTPException(500, f"Kunde inte radera: {e}")


@router.post("/compare")
async def compare_shots(shot_ids: List[str] = Body(...)):
    """
    Jämför flera analyser – ex. skillnader i hit_count, spread, pattern_similarity.
    Body: [ "shotId1", "shotId2", ... ] (minst 2 st).
    """
    try:
        if len(shot_ids) < 2:
            raise HTTPException(400, "Minst två ID krävs för jämförelse.")

        db_conn = await db.get_database()
        shots_coll = db_conn["shots"]
        obj_ids = [ObjectId(_id) for _id in shot_ids]

        cursor = shots_coll.find({"_id": {"$in": obj_ids}})
        docs = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            docs.append(doc)

        if len(docs) < 2:
            raise HTTPException(404, "Några ID saknas i databasen.")

        from app.services.pattern_analysis import PatternAnalyzer
        import numpy as np

        hits = [d["analysis_results"].get("hit_count", 0) for d in docs]
        spreads = [d["analysis_results"].get("spread", 0) for d in docs]

        try:
            similarity = PatternAnalyzer.calculate_pattern_similarity(docs)
        except Exception:
            similarity = 0.0

        return {
            "shots": docs,
            "comparison": {
                "hit_count_variance": float(np.var(hits)),
                "spread_variance": float(np.var(spreads)),
                "pattern_similarity": similarity
            }
        }

    except Exception as e:
        logger.error(f"Fel i /compare => {e}", exc_info=True)
        raise HTTPException(500, f"Kunde inte jämföra => {e}")


# -------------------------------- PATCH /hits --------------------------------

class HitsUpdateModel(BaseModel):
    addedHits: Optional[List[Dict[str, float]]] = None
    removedHits: Optional[List[Dict[str, float]]] = None

@router.patch("/results/{shot_id}/hits")
async def update_hits(shot_id: str, update_data: HitsUpdateModel):
    """
    Lägg till / ta bort hagelträffar i 'analysis_results.individual_pellets',
    sedan re-beräkna stats (spread, density, centroid m.m.) "offline".
    """
    try:
        db_conn = await db.get_database()
        shots_coll = db_conn["shots"]
        doc = await shots_coll.find_one({"_id": ObjectId(shot_id)})
        if not doc:
            raise HTTPException(404, "Analysen saknas.")

        if "analysis_results" not in doc:
            doc["analysis_results"] = {}
        if "individual_pellets" not in doc["analysis_results"]:
            doc["analysis_results"]["individual_pellets"] = []

        pellets = doc["analysis_results"]["individual_pellets"]

        # 1) add
        if update_data.addedHits:
            for h in update_data.addedHits:
                pellets.append({"x": float(h["x"]), "y": float(h["y"])})

        # 2) remove
        if update_data.removedHits:
            remove_set = {(float(r["x"]), float(r["y"])) for r in update_data.removedHits}
            pellets = [
                p for p in pellets
                if (float(p["x"]), float(p["y"])) not in remove_set
            ]

        doc["analysis_results"]["individual_pellets"] = pellets
        new_count = len(pellets)
        doc["analysis_results"]["hit_count"] = new_count

        w = doc["analysis_results"].get("image_dimensions", {}).get("width", 0)
        h = doc["analysis_results"].get("image_dimensions", {}).get("height", 0)

        if w > 0 and h > 0 and new_count > 0:
            import numpy as np
            from app.services.pattern_analysis import Point

            point_list = []
            for p in pellets:
                px = (p["x"] / 100.0) * w
                py = (p["y"] / 100.0) * h
                point_list.append(Point(px, py))

            if point_list:
                arr = np.array([[pt.x, pt.y] for pt in point_list], dtype=np.float32)
                c = np.mean(arr, axis=0)
                dists = np.linalg.norm(arr - c, axis=1)

                doc["analysis_results"]["spread"] = float(np.std(dists))
                max_dist = float(np.max(dists))
                area = np.pi * (max_dist ** 2)
                dens = float(new_count / area) if area > 0 else 0.0

                doc["analysis_results"]["centroid"] = {
                    "x": round((c[0] / w) * 100, 2),
                    "y": round((c[1] / h) * 100, 2)
                }
                doc["analysis_results"]["pattern_radius"] = round(max_dist, 2)
                doc["analysis_results"]["pattern_density"] = round(dens, 4)

                # ex. offline zoneAnalysis
                doc["analysis_results"]["zone_analysis"] = {}
        else:
            # Om inga pellets / ingen dimension => enbart uppdatera hit_count
            pass

        doc["analysis_results"] = _cast_floats(doc["analysis_results"])
        await shots_coll.update_one(
            {"_id": ObjectId(shot_id)},
            {
                "$set": {
                    "analysis_results": doc["analysis_results"],
                    "updated_at": datetime.utcnow()
                }
            }
        )

        return {
            "message": "Hagelträffar uppdaterade.",
            "totalHits": len(pellets)
        }

    except Exception as e:
        logger.error(f"[update_hits] => {e}", exc_info=True)
        raise HTTPException(500, f"Kunde inte uppdatera hagelträffar => {e}")


# -------------------------------- PATCH /ring --------------------------------

class RingUpdateModel(BaseModel):
    centerX: float
    centerY: float
    radiusPx: float

@router.patch("/results/{shot_id}/ring")
async def update_ring(shot_id: str, ring_data: RingUpdateModel):
    """
    Uppdaterar ring i 'analysis_results.ring'.
    """
    try:
        db_conn = await db.get_database()
        shots_coll = db_conn["shots"]
        doc = await shots_coll.find_one({"_id": ObjectId(shot_id)})

        if not doc:
            raise HTTPException(404, "Hittade ingen analysis.")

        if "analysis_results" not in doc:
            doc["analysis_results"] = {}

        doc["analysis_results"]["ring"] = {
            "centerX": float(ring_data.centerX),
            "centerY": float(ring_data.centerY),
            "radius_px": float(ring_data.radiusPx)
        }
        doc["analysis_results"] = _cast_floats(doc["analysis_results"])

        await shots_coll.update_one(
            {"_id": ObjectId(shot_id)},
            {
                "$set": {
                    "analysis_results.ring": doc["analysis_results"]["ring"],
                    "updated_at": datetime.utcnow()
                }
            }
        )

        return {
            "message": "Ring uppdaterad.",
            "ring": doc["analysis_results"]["ring"]
        }

    except Exception as e:
        logger.error(f"Fel i update_ring => {e}", exc_info=True)
        raise HTTPException(500, f"Kunde inte uppdatera ring => {e}")


# -------------------------------- PATCH /reanalyze --------------------------------

class ReAnalyzeModel(BaseModel):
    sensitivity: float = 0.5
    pixPerCm: float = 1.0

@router.patch("/results/{shot_id}/reanalyze")
async def reanalyze_shot(shot_id: str, body: ReAnalyzeModel):
    """
    Ladda doc->image_path => re-run PatternAnalyzer med ny 'sensitivity' + 'pixPerCm'.
    Spara nya 'analysis_results'.
    """
    try:
        db_conn = await db.get_database()
        shots_coll = db_conn["shots"]
        doc = await shots_coll.find_one({"_id": ObjectId(shot_id)})

        if not doc:
            raise HTTPException(404, "Analysen saknas.")

        # image_path => se till att den fysiskt finns (ex. 'uploads/<fil>')
        image_path = doc.get("image_path")
        if not image_path:
            raise HTTPException(400, "Ingen image_path => kan ej reAnalyze.")

        image = cv2.imread(image_path)
        if image is None:
            raise HTTPException(400, f"Kunde ej läsa bild: {image_path}")

        processed = ImageProcessor().preprocess_image(image)
        analyzer = PatternAnalyzer()

        new_res = analyzer.analyze_shot_pattern(
            processed,
            sensitivity=body.sensitivity,
            pix_per_cm=body.pixPerCm
        )
        new_res = _cast_floats(new_res)

        doc["analysis_results"] = new_res
        doc["analysis_results"]["image_dimensions"] = {
            "width": image.shape[1],
            "height": image.shape[0]
        }

        await shots_coll.update_one(
            {"_id": ObjectId(shot_id)},
            {
                "$set": {
                    "analysis_results": doc["analysis_results"],
                    "updated_at": datetime.utcnow()
                }
            }
        )

        doc["_id"] = str(doc["_id"])
        return doc

    except Exception as e:
        logger.error(f"Fel i reanalyze_shot => {e}", exc_info=True)
        raise HTTPException(500, f"Kunde inte reanalysera => {e}")
