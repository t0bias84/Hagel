# Fil: app/api/routes/loads.py

import logging
from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    File,
    UploadFile,
    Body,
    Depends
)
from typing import List, Optional, Union
from bson import ObjectId
import shutil
import os
import math  # <--- för exp, log etc.
from datetime import datetime

from app.db.mongodb import db
from app.api.schemas.load_schemas import (
    LoadCreate,
    LoadUpdate,
    LoadResponse,
    ShotshellLoadCreate,
    ShotshellLoadResponse,
)
from app.api.routes.auth import get_current_active_user, User

router = APIRouter()
UPLOAD_FOLDER = "uploads/loads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------
# expand_components_in_loads - stödfunktion för LoadListPage.jsx
# ---------------------------------------------------------
async def expand_components_in_loads(load_docs: Union[dict, list]) -> None:
    if not load_docs:
        return
    if isinstance(load_docs, dict):
        load_list = [load_docs]
    else:
        load_list = load_docs

    component_ids = set()
    for ld in load_list:
        if ld.get("hullId"):
            component_ids.add(ld["hullId"])
        if ld.get("primerId"):
            component_ids.add(ld["primerId"])
        if ld.get("powderId"):
            component_ids.add(ld["powderId"])
        if ld.get("wadId"):
            component_ids.add(ld["wadId"])

        if ld.get("shotLoads"):
            for sh in ld["shotLoads"]:
                model_id = sh.get("modelId")
                if model_id:
                    component_ids.add(model_id)

    if not component_ids:
        return

    database = await db.get_database()
    comps_coll = database["components"]
    valid_ids = [cid for cid in component_ids if cid and ObjectId.is_valid(cid)]
    if not valid_ids:
        return

    cursor = comps_coll.find({"_id": {"$in": [ObjectId(x) for x in valid_ids]}})
    comp_docs = await cursor.to_list(None)

    comp_map = {}
    for c in comp_docs:
        c["_id"] = str(c["_id"])
        comp_map[c["_id"]] = c

    for ld in load_list:
        if ld.get("hullId") in comp_map:
            ld["hullObject"] = comp_map[ld["hullId"]]
        if ld.get("primerId") in comp_map:
            ld["primerObject"] = comp_map[ld["primerId"]]
        if ld.get("powderId") in comp_map:
            ld["powderObject"] = comp_map[ld["powderId"]]
        if ld.get("wadId") in comp_map:
            ld["wadObject"] = comp_map[ld["wadId"]]

        if ld.get("shotLoads"):
            for sh in ld["shotLoads"]:
                mId = sh.get("modelId")
                if mId and mId in comp_map:
                    sh["componentObject"] = comp_map[mId]


# ----------------------------------------------------------------
# 1) Param-baserad endpoint: /penetration-flex-params
# ----------------------------------------------------------------
@router.get("/penetration-flex-params")
async def get_penetration_flex_params(
    muzzle: float = Query(..., description="Önskad muzzle fps, ex. 1300"),
    shotSize: str = Query(..., description="Ex: 1,2,3,4 (utan #)"),
    shotType: str = Query(..., description="Ex: steel, lead, tungsten, hevi"),
    shotLoadGram: float = Query(28.0, description="Hur många gram hagel, ex. 28"),
    current_user: User = Depends(get_current_active_user),
):
    """
    GET /api/loads/penetration-flex-params?muzzle=1300&shotSize=2&shotType=steel&shotLoadGram=28

    Denna endpoint är en *förenklad* forensisk/ballistisk beräkning för hagel:
    - Hämtar en baseline i 'shotgun_baselines'
    - Väljer den vars muzzleVelocity ligger närmast 'muzzle'
    - Gör en exponentiell avtagning av velocity
    - Räknar energi/hagel (J) ~ 1/2 * m(kg) * v(m/s)^2
      (konverterar v_fps -> m/s, och massan via shotLoadGram / pelletCount etc.)
    - Räknar totalEnergy => energy/hagel * pelletCount
    - Räknar 'penetration_in' via en formel inspirerad av forensisk litteratur
      (ex. "Forensic Ballistics" - men är *endast* en uppskattning!)

    OBS! Detta är EJ en garanti för att ett djur faktiskt dör. 
    Värdena är en *matematisk approximation* från vår ballistiska studie.
    """
    logger.info(f"[penetration_flex_params] user={current_user.username}, muzzle={muzzle}, shotSize={shotSize}, shotType={shotType}, shotLoadGram={shotLoadGram}")

    try:
        database = await db.get_database()
        baselines_coll = database["shotgun_baselines"]

        query = {
            "shotSize": shotSize.strip(),
            "shotType": shotType.strip(),
        }
        docs = await baselines_coll.find(query).to_list(None)
        if not docs:
            logger.warning("[penetration_flex_params] Ingen baseline matchad")
            raise HTTPException(status_code=404, detail="Ingen baseline matchad")

        # 1) Välj baseline med muzzleVelocity närmast 'muzzle'
        chosen_doc = sorted(
            docs,
            key=lambda doc: abs(float(doc.get("muzzleVelocity", 0)) - muzzle)
        )[0]

        baseline_muzzle = float(chosen_doc.get("muzzleVelocity", 0))
        data_points = chosen_doc.get("dataPoints", [])
        if not data_points:
            raise HTTPException(status_code=404, detail="Baseline saknar dataPoints")

        # 2) Beräkna exponentiell avtagning
        #    Samt energi/hagel i Joule: E = 1/2 * m * v^2
        #    - v i m/s
        #    - m i kg (ex. hagelvikt = shotLoadGram / pelletCount)
        #    - pelletCount => t.ex. stål #2 => ~125 hagel i 28 g (ex.)
        #    - penetration => pen_in = 0.0025 * diameter_in * v_fps^1.0 * matFactor (ex.)

        # minimal pelletCount => (ex. stål #2 har densitet + storlek):
        #   Du kan lägga en shotCalculator etc. 
        # Här fusk: bestäm 125 hagel om shotSize=2, stål. 
        # Använd valfri metod. Nedan är *väldigt* förenklad.
        def approximate_pellet_count(shotSize, shotType, shotLoadGram):
            # Två exempel:
            # - stål #2 => ~125 st i 28 g
            # - stål #3 => ~140 st i 28 g
            # Bly #2 => ~100 st i 28 g ...
            # etc ...
            # Du kan så klart göra en tabell. Nu en superenkel if-sats:
            s = shotSize.strip()
            t = shotType.lower().strip()
            if t == "steel":
                if s == "2":
                    return int(28.0 / shotLoadGram * 125 * shotLoadGram/28.0)  # dumsimpel
                elif s == "3":
                    return int(28.0 / shotLoadGram * 140 * shotLoadGram/28.0)
                else:
                    return int(28.0 / shotLoadGram * 160 * shotLoadGram/28.0)
            elif t == "tungsten":
                # färre hagel pga tyngre => 28 g ger färre
                # slump:
                return int(28.0 / shotLoadGram * 90 * shotLoadGram/28.0)
            elif t == "hevi":
                return int(28.0 / shotLoadGram * 100 * shotLoadGram/28.0)
            else:
                # antag lead
                return int(28.0 / shotLoadGram * 110 * shotLoadGram/28.0)

        pelletCount = approximate_pellet_count(shotSize, shotType, shotLoadGram)
        if pelletCount < 1:
            pelletCount = 1

        # Materialfaktor => ger en ökning av penetration
        matF = 1.0
        stLower = shotType.lower()
        if "steel" in stLower:
            matF = 1.3
        elif "tungsten" in stLower:
            matF = 1.6
        elif "hevi" in stLower:
            matF = 1.4

        # diameterIn
        size_map = {
            "1": 0.16, "2": 0.15, "3": 0.14,
            "4": 0.13, "5": 0.12, "6": 0.11,
            "7": 0.10, "8": 0.09, "9": 0.08
        }
        diameter_in = size_map.get(shotSize.strip(), 0.10)

        # drag => ex. 0.02 ...
        # slump
        dragC = 0.02 + 0.001*(float(shotSize.strip()) if shotSize.strip().isdigit() else 3)

        # BETA + exponent => forensiskt inspirerad
        BETA = 0.0025
        EXPO = 1.0

        results = []
        # muzzleVelocity i fps => muzzle
        # Konvertera fps->m/s => * 0.3048
        muzzle_mps = muzzle * 0.3048

        # massa/hagel (mycket approx)
        # total mass i kg => shotLoadGram / 1000
        # hagelvikt = totMass / pelletCount
        # E = 1/2 * m * v^2
        total_mass_kg = shotLoadGram/1000.0
        mass_per_pellet_kg = total_mass_kg / pelletCount

        # loop
        for row in data_points:
            dist_yd = float(row.get("distance_yd", 0.0))
            # exponentiell avtagning (endast en approximation):
            # v_mps(d) = muzzle_mps * e^(-dragC * dist_yd)
            # konvertera dist_yd => meter?? 1 yd = 0.9144 m
            dist_m = dist_yd * 0.9144
            v_mps = muzzle_mps * math.exp(-dragC * (dist_m/50.0)) 
            # (delar med 50 för att inte avta för extremt — man får tweaka)

            # konvertera v_mps => fps
            v_fps = v_mps / 0.3048

            # energi per hagel i joule
            e_j_perPellet = 0.5 * mass_per_pellet_kg * (v_mps**2)

            # total energi
            total_j = e_j_perPellet * pelletCount

            # penetration
            pen_in = BETA * diameter_in * (v_fps**EXPO) * matF
            # Se till att penetration inte blir orimligt stor eller negativ
            pen_in = max(0.0, min(pen_in, 10.0))

            results.append({
                "distance_yd": dist_yd,
                "velocity_fps": v_fps,
                "penetration_in": pen_in,
                "energy_per_hagel_j": e_j_perPellet,
                "total_energy_j": total_j
            })

        return {
            "shotType": shotType.strip(),
            "shotSize": shotSize.strip(),
            "shotLoadGram": shotLoadGram,
            "pelletCount": pelletCount,
            "baselineUsed": baseline_muzzle,
            "disclaimer": (
                "Denna formel är endast en uppskattning från en forensisk/ballistisk studie. "
                "Den garanterar INTE att djur avlidit. "
                "Penetrations- och energivärden är matematiska approximationer."
            ),
            "dataPoints": results
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[penetration_flex_params] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------
# 2) Gamla endpoints (exakt match i shotgun_data)
# ---------------------------------------------------
@router.get("/ballistics")
async def get_ballistics_data(
    muzzle: int = Query(...),
    shotSize: str = Query(...),
    shotType: str = Query(...),
    temp: str = Query("70"),
    alt: str = Query("Sea Lvl"),
    current_user: User = Depends(get_current_active_user),
):
    logger.info(f"[ballistics] muzzle={muzzle}, shotSize={shotSize}, shotType={shotType}, temp={temp}, alt={alt}, user={current_user.username}")
    try:
        database = await db.get_database()
        shotdata_coll = database["shotgun_data"]
        query = {
            "muzzle": muzzle,
            "shotSize": shotSize,
            "shotType": shotType,
            "temp": temp,
            "alt": alt,
        }
        docs = await shotdata_coll.find(query).to_list(None)
        logger.info(f"[ballistics] Found {len(docs)} matching docs.")
        for d in docs:
            d["_id"] = str(d["_id"])
        return docs

    except Exception as e:
        logger.error(f"[ballistics] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ballistics_with_penetration")
async def get_ballistics_plus_penetration(
    muzzle: int = Query(...),
    shotSize: str = Query(...),
    shotType: str = Query(...),
    temp: str = Query("70"),
    alt: str = Query("Sea Lvl"),
    current_user: User = Depends(get_current_active_user),
):
    logger.info(f"[ballistics_with_penetration] muzzle={muzzle}, shotSize={shotSize}, shotType={shotType}, temp={temp}, alt={alt}, user={current_user.username}")
    try:
        database = await db.get_database()
        shotdata_coll = database["shotgun_data"]
        query = {
            "muzzle": muzzle,
            "shotSize": shotSize,
            "shotType": shotType,
            "temp": temp,
            "alt": alt,
        }
        docs = await shotdata_coll.find(query).to_list(None)
        logger.info(f"[ballistics_with_penetration] Found {len(docs)} docs.")

        Beta = 0.0025
        diameter_in = 0.10
        for d in docs:
            d["_id"] = str(d["_id"])
            v_fps = float(d.get("Vel", 0))
            d["penetration_in"] = Beta * diameter_in * v_fps

        return docs

    except Exception as e:
        logger.error(f"[ballistics_with_penetration] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------
# 3) CRUD-endpoints för LoadListPage.jsx
# ---------------------------------------------------
@router.get("/", response_model=List[ShotshellLoadResponse])
async def list_loads(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100),
    mine: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
):
    query = {}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]
    if mine:
        query["ownerId"] = str(current_user.id)

    database = await db.get_database()
    loads_coll = database["loads"]
    cursor = loads_coll.find(query).limit(limit)
    results = await cursor.to_list(length=limit)

    for ld in results:
        ld["_id"] = str(ld["_id"])

    await expand_components_in_loads(results)
    return results


@router.post("/shotshell", response_model=ShotshellLoadResponse)
async def create_shotshell_load(
    shotshell_data: ShotshellLoadCreate = Body(...),
    current_user: User = Depends(get_current_active_user),
):
    # Konvertera components array till individuella fält
    shotshell_data.process_components()
    
    doc = shotshell_data.dict()
    doc["ownerId"] = str(current_user.id)
    if "category" not in doc or not doc["category"]:
        doc["category"] = "shotshell"
    database = await db.get_database()
    loads_coll = database["loads"]
    result = await loads_coll.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    await expand_components_in_loads(doc)
    return ShotshellLoadResponse(**doc)


@router.post("/", response_model=LoadResponse)
async def create_load(
    load_data: LoadCreate,
    file: UploadFile = File(None),
    current_user: User = Depends(get_current_active_user),
):
    new_load = load_data.dict()
    new_load["ownerId"] = str(current_user.id)
    if file:
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        if "loadData" not in new_load or new_load["loadData"] is None:
            new_load["loadData"] = {}
        new_load["loadData"]["attachment"] = file_path
    database = await db.get_database()
    loads_coll = database["loads"]
    result = await loads_coll.insert_one(new_load)
    new_load["_id"] = str(result.inserted_id)
    return LoadResponse(**new_load)


@router.put("/{load_id}", response_model=ShotshellLoadResponse)
async def update_load(
    load_id: str,
    updates: LoadUpdate,
    file: UploadFile = File(None),
    current_user: User = Depends(get_current_active_user),
):
    if not ObjectId.is_valid(load_id):
        raise HTTPException(status_code=400, detail="Ogiltigt load ID-format")
    update_data = {
        k: v for k, v in updates.dict(exclude_unset=True).items() if v is not None
    }
    if file:
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        if "loadData" not in update_data or update_data["loadData"] is None:
            update_data["loadData"] = {}
        update_data["loadData"]["attachment"] = file_path
    if not update_data:
        raise HTTPException(status_code=400, detail="Inga fält att uppdatera")
    database = await db.get_database()
    loads_coll = database["loads"]
    result = await loads_coll.update_one(
        {"_id": ObjectId(load_id)},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        existing = await loads_coll.find_one({"_id": ObjectId(load_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Laddningen hittades inte")
    updated_doc = await loads_coll.find_one({"_id": ObjectId(load_id)})
    updated_doc["_id"] = str(updated_doc["_id"])
    await expand_components_in_loads(updated_doc)
    return ShotshellLoadResponse(**updated_doc)


@router.delete("/{load_id}")
async def delete_load(load_id: str, current_user: User = Depends(get_current_active_user)):
    if not ObjectId.is_valid(load_id):
        raise HTTPException(status_code=400, detail="Ogiltigt ID-format")
    database = await db.get_database()
    loads_coll = database["loads"]
    result = await loads_coll.delete_one({"_id": ObjectId(load_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Laddningen hittades inte")
    return {"message": "Laddningen har tagits bort"}


@router.get("/{load_id}", response_model=ShotshellLoadResponse)
async def get_load(load_id: str, current_user: User = Depends(get_current_active_user)):
    if not ObjectId.is_valid(load_id):
        raise HTTPException(status_code=400, detail="Ogiltigt ID-format")
    database = await db.get_database()
    loads_coll = database["loads"]
    doc = await loads_coll.find_one({"_id": ObjectId(load_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Laddningen hittades inte")
    doc["_id"] = str(doc["_id"])
    await expand_components_in_loads(doc)
    return ShotshellLoadResponse(**doc)

# Röstning på laddningar
@router.post("/{load_id}/vote")
async def vote_on_load(
    load_id: str,
    vote_data: dict = Body(...),
    current_user: User = Depends(get_current_active_user)
):
    if not ObjectId.is_valid(load_id):
        raise HTTPException(status_code=400, detail="Ogiltigt laddnings-ID")

    vote_type = vote_data.get("voteType")
    if vote_type not in ["up", "down"]:
        raise HTTPException(status_code=400, detail="Ogiltig rösttyp")

    try:
        database = await db.get_database()
        loads_coll = database["loads"]
        votes_coll = database["load_votes"]

        # Ta bort eventuell tidigare röst
        await votes_coll.delete_one({
            "loadId": load_id,
            "userId": str(current_user.id)
        })

        # Lägg till ny röst
        await votes_coll.insert_one({
            "loadId": load_id,
            "userId": str(current_user.id),
            "voteType": vote_type,
            "createdAt": datetime.utcnow()
        })

        # Räkna röster
        upvotes = await votes_coll.count_documents({
            "loadId": load_id,
            "voteType": "up"
        })
        downvotes = await votes_coll.count_documents({
            "loadId": load_id,
            "voteType": "down"
        })

        return {
            "votes": {
                "upvotes": upvotes,
                "downvotes": downvotes
            }
        }
    except Exception as e:
        logger.error(f"Vote error: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte hantera röstning")

@router.get("/{load_id}/votes")
async def get_load_votes(
    load_id: str,
    current_user: User = Depends(get_current_active_user)
):
    if not ObjectId.is_valid(load_id):
        raise HTTPException(status_code=400, detail="Ogiltigt laddnings-ID")

    try:
        database = await db.get_database()
        votes_coll = database["load_votes"]

        # Räkna röster
        upvotes = await votes_coll.count_documents({
            "loadId": load_id,
            "voteType": "up"
        })
        downvotes = await votes_coll.count_documents({
            "loadId": load_id,
            "voteType": "down"
        })

        # Hämta användarens röst
        user_vote = await votes_coll.find_one({
            "loadId": load_id,
            "userId": str(current_user.id)
        })

        return {
            "votes": {
                "upvotes": upvotes,
                "downvotes": downvotes
            },
            "userVote": user_vote["voteType"] if user_vote else None
        }
    except Exception as e:
        logger.error(f"Get votes error: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte hämta röster")

# Kommentarer på laddningar
@router.post("/{load_id}/comments")
async def add_comment(
    load_id: str,
    comment_data: dict = Body(...),
    current_user: User = Depends(get_current_active_user)
):
    if not ObjectId.is_valid(load_id):
        raise HTTPException(status_code=400, detail="Ogiltigt laddnings-ID")

    content = comment_data.get("content")
    if not content or not content.strip():
        raise HTTPException(status_code=400, detail="Kommentaren får inte vara tom")

    try:
        database = await db.get_database()
        comments_coll = database["load_comments"]

        comment = {
            "loadId": load_id,
            "userId": str(current_user.id),
            "author": current_user.username,
            "content": content.strip(),
            "createdAt": datetime.utcnow()
        }

        result = await comments_coll.insert_one(comment)
        comment["_id"] = str(result.inserted_id)

        return comment
    except Exception as e:
        logger.error(f"Add comment error: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte lägga till kommentar")

@router.get("/{load_id}/comments")
async def get_comments(
    load_id: str,
    current_user: User = Depends(get_current_active_user)
):
    if not ObjectId.is_valid(load_id):
        raise HTTPException(status_code=400, detail="Ogiltigt laddnings-ID")

    try:
        database = await db.get_database()
        comments_coll = database["load_comments"]

        comments = await comments_coll.find(
            {"loadId": load_id}
        ).sort("createdAt", -1).to_list(length=100)

        for comment in comments:
            comment["_id"] = str(comment["_id"])

        return comments
    except Exception as e:
        logger.error(f"Get comments error: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte hämta kommentarer")
