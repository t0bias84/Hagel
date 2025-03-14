# app/api/routes/components.py

from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    File,
    Form,
    UploadFile
)
from typing import List, Optional, Dict, Any
from bson import ObjectId
import shutil
import os
import json

from app.db.mongodb import db  # Din MongoDB-hanterare

router = APIRouter()

# Bas-URL för bilder (kan ändras efter behov)
IMAGES_BASE_URL = "http://127.0.0.1:8000"

UPLOAD_FOLDER = "uploads/components"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def _store_image(upload_file: UploadFile) -> str:
    filename = upload_file.filename
    if not filename:
        raise HTTPException(400, detail="Ingen fil vald eller filnamn saknas")

    file_path = os.path.join(UPLOAD_FOLDER, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)

    return f"{IMAGES_BASE_URL}/uploads/components/{filename}"


@router.get("/")
async def list_components(
    category: Optional[str] = Query(None),
    ctype: Optional[str] = Query(None),
    manufacturer: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: Optional[int] = Query(
        None,
        description="Max antal komponenter att returnera. Lämna tomt för att hämta alla."
    )
):
    """
    Listar komponenter från databasen. Du kan filtrera på:
      - category (ex. 'Ammunition')
      - ctype (ex. 'powder', 'primer', 'wad')
      - manufacturer (ex. 'Hodgdon', 'Cheddite')
      - search (söker i name och description)
    Om du anger ?limit=50 returneras max 50 st.
    Lämnar du limit tomt returneras (nästan) alla.
    """
    query = {}
    if category:
        query["category"] = category
    if ctype:
        query["type"] = ctype
    if manufacturer:
        query["manufacturer"] = manufacturer
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]

    database = await db.get_database()
    collection = database["components"]

    # Om limit är satt → använd den, annars en stor siffra för att hämta alla
    length_to_fetch = limit if limit is not None else 1_000_000

    cursor = collection.find(query)
    results = await cursor.to_list(length=length_to_fetch)

    for comp in results:
        comp["_id"] = str(comp["_id"])
    return results


@router.get("/{component_id}")
async def get_component(component_id: str):
    if not ObjectId.is_valid(component_id):
        raise HTTPException(400, detail="Felaktigt format på ID")

    database = await db.get_database()
    collection = database["components"]
    doc = await collection.find_one({"_id": ObjectId(component_id)})
    if not doc:
        raise HTTPException(404, detail="Komponent saknas")

    doc["_id"] = str(doc["_id"])
    return doc


@router.post("/")
async def create_component(
    name: str = Form(...),
    type: str = Form(...),
    manufacturer: str = Form(""),
    description: str = Form(""),
    caliber: str = Form(""),
    category: str = Form(""),
    properties: Optional[str] = Form(None),
    file: UploadFile = File(None)
):
    comp_data = {
        "name": name,
        "type": type,
        "manufacturer": manufacturer,
        "description": description,
        "caliber": caliber,
        "category": category,
    }

    if properties:
        try:
            parsed = json.loads(properties)
            comp_data["properties"] = parsed
        except json.JSONDecodeError:
            raise HTTPException(400, detail="Ogiltig JSON i 'properties'")

    if file:
        image_url = _store_image(file)
        comp_data["image"] = {"url": image_url}

    database = await db.get_database()
    coll = database["components"]
    result = await coll.insert_one(comp_data)
    comp_data["_id"] = str(result.inserted_id)
    return comp_data


@router.put("/{component_id}")
async def update_component(
    component_id: str,
    name: Optional[str] = Form(None),
    type: Optional[str] = Form(None),
    manufacturer: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    caliber: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    properties: Optional[str] = Form(None),
    file: UploadFile = File(None)
):
    if not ObjectId.is_valid(component_id):
        raise HTTPException(400, detail="Felaktigt ID-format")

    update_data = {}
    if name is not None:
        update_data["name"] = name
    if type is not None:
        update_data["type"] = type
    if manufacturer is not None:
        update_data["manufacturer"] = manufacturer
    if description is not None:
        update_data["description"] = description
    if caliber is not None:
        update_data["caliber"] = caliber
    if category is not None:
        update_data["category"] = category

    if properties:
        try:
            parsed = json.loads(properties)
            update_data["properties"] = parsed
        except json.JSONDecodeError:
            raise HTTPException(400, detail="Ogiltig JSON i 'properties'")

    if file:
        image_url = _store_image(file)
        update_data["image"] = {"url": image_url}

    if not update_data:
        raise HTTPException(400, detail="Inga fält att uppdatera")

    database = await db.get_database()
    coll = database["components"]
    result = await coll.update_one({"_id": ObjectId(component_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(404, detail="Komponent saknas (ingen match)")

    updated = await coll.find_one({"_id": ObjectId(component_id)})
    updated["_id"] = str(updated["_id"])
    return updated


@router.delete("/{component_id}")
async def delete_component(component_id: str):
    if not ObjectId.is_valid(component_id):
        raise HTTPException(400, detail="Felaktigt ID-format")

    database = await db.get_database()
    coll = database["components"]
    result = await coll.delete_one({"_id": ObjectId(component_id)})

    if result.deleted_count == 0:
        raise HTTPException(404, detail="Komponent ej funnen / redan raderad")

    return {"message": "Komponent raderad"}


@router.post("/upload-image")
async def upload_component_image(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(400, detail="Ingen fil vald")

    image_url = _store_image(file)
    return {"image": {"url": image_url}}


# ---- NY BATCH-ENDPOINT ----
@router.post("/batch")
async def create_components_in_batch(components: List[Dict[str, Any]]):
    """
    Tar emot en lista (array) av komponent-objekt i JSON-format
    och skapar alla i databasen på en gång (insert_many).
    """
    database = await db.get_database()
    coll = database["components"]

    result = await coll.insert_many(components)
    inserted_ids = [str(_id) for _id in result.inserted_ids]

    return {
        "message": f"{len(inserted_ids)} komponent(er) skapades.",
        "inserted_ids": inserted_ids
    }
