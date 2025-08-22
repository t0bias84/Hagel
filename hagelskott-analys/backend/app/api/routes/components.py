# app/api/routes/components.py

from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    File,
    Form,
    UploadFile,
    Depends
)
from typing import List, Optional, Dict, Any
from bson import ObjectId
import shutil
import os
import json

from app.db.mongodb import db  # Din MongoDB-hanterare
from app.api.routes.auth import get_current_active_user
from app.models.user import User

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
    ),
    current_user: User = Depends(get_current_active_user)
):
    """
    Listar komponenter från databasen. Inloggade användare ser globala komponenter
    plus sina egna custom-komponenter.
    """
    filter_query = {}
    if category:
        filter_query["category"] = category
    if ctype:
        filter_query["type"] = ctype
    if manufacturer:
        filter_query["manufacturer"] = manufacturer
    if search:
        filter_query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"aliases": {"$regex": search, "$options": "i"}}
        ]

    # Lägg till logik för att visa globala OCH användarens egna komponenter
    owner_query = {
        "$or": [
            {"owner_id": None},
            {"owner_id": ObjectId(current_user.id)}
        ]
    }

    # Kombinera filter och ägarskaps-query
    final_query = {"$and": [filter_query, owner_query]} if filter_query else owner_query

    database = await db.get_database()
    collection = database["components"]

    length_to_fetch = limit if limit is not None else 1_000_000

    cursor = collection.find(final_query)
    results = await cursor.to_list(length=length_to_fetch)

    for comp in results:
        comp["_id"] = str(comp["_id"])
        if 'owner_id' in comp:
            comp['owner_id'] = str(comp['owner_id'])

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


@router.post("/", description="Skapa en ny custom-komponent som ägs av den inloggade användaren.")
async def create_component(
    name: str = Form(...),
    type: str = Form(...),
    manufacturer: str = Form(""),
    description: str = Form(""),
    caliber: str = Form(""),
    category: str = Form(""),
    aliases: Optional[List[str]] = Form(None),
    properties: Optional[str] = Form(None),
    file: UploadFile = File(None),
    current_user: User = Depends(get_current_active_user)
):
    comp_data = {
        "name": name,
        "type": type,
        "manufacturer": manufacturer,
        "description": description,
        "caliber": caliber,
        "category": category,
        "aliases": aliases or [],
        "owner_id": ObjectId(current_user.id) # Sätt ägaren!
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

    # Returnera det skapade dokumentet
    created_doc = await coll.find_one({"_id": result.inserted_id})
    created_doc["_id"] = str(created_doc["_id"])
    created_doc["owner_id"] = str(created_doc["owner_id"])
    return created_doc


@router.put("/{component_id}", description="Uppdatera en custom-komponent. Användare kan bara uppdatera sina egna komponenter.")
async def update_component(
    component_id: str,
    name: Optional[str] = Form(None),
    type: Optional[str] = Form(None),
    manufacturer: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    caliber: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    aliases: Optional[List[str]] = Form(None),
    properties: Optional[str] = Form(None),
    file: UploadFile = File(None),
    current_user: User = Depends(get_current_active_user)
):
    if not ObjectId.is_valid(component_id):
        raise HTTPException(400, detail="Felaktigt ID-format")

    update_data = {}
    if name is not None: update_data["name"] = name
    if type is not None: update_data["type"] = type
    if manufacturer is not None: update_data["manufacturer"] = manufacturer
    if description is not None: update_data["description"] = description
    if caliber is not None: update_data["caliber"] = caliber
    if category is not None: update_data["category"] = category
    if aliases is not None: update_data["aliases"] = aliases

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

    # Hitta komponenten först för att verifiera ägarskap
    component_to_update = await coll.find_one({"_id": ObjectId(component_id)})
    if not component_to_update:
        raise HTTPException(404, detail="Komponent saknas")

    if 'owner_id' not in component_to_update or str(component_to_update['owner_id']) != current_user.id:
        raise HTTPException(403, detail="Du har inte behörighet att uppdatera denna komponent")

    result = await coll.update_one({"_id": ObjectId(component_id)}, {"$set": update_data})

    updated = await coll.find_one({"_id": ObjectId(component_id)})
    updated["_id"] = str(updated["_id"])
    updated["owner_id"] = str(updated["owner_id"])
    return updated


@router.delete("/{component_id}", description="Radera en custom-komponent. Användare kan bara radera sina egna komponenter.")
async def delete_component(
    component_id: str,
    current_user: User = Depends(get_current_active_user)
):
    if not ObjectId.is_valid(component_id):
        raise HTTPException(400, detail="Felaktigt ID-format")

    database = await db.get_database()
    coll = database["components"]

    # Verifiera ägarskap innan radering
    component_to_delete = await coll.find_one({"_id": ObjectId(component_id)})
    if not component_to_delete:
        raise HTTPException(404, detail="Komponent ej funnen")

    if 'owner_id' not in component_to_delete or str(component_to_delete['owner_id']) != current_user.id:
        raise HTTPException(403, detail="Du har inte behörighet att radera denna komponent")

    result = await coll.delete_one({"_id": ObjectId(component_id)})

    if result.deleted_count == 0:
        raise HTTPException(500, detail="Kunde inte radera komponenten trots verifierat ägarskap")

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
