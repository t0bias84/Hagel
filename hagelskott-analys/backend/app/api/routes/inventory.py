from fastapi import APIRouter, Depends, HTTPException
from typing import List
from bson import ObjectId
import logging

from app.db.mongodb import db
from app.api.routes.auth import get_current_active_user, User
from app.api.schemas.inventory_schemas import UserInventoryResponse, InventoryItemCreate

router = APIRouter(prefix="/api/inventory", tags=["inventory"])
logger = logging.getLogger(__name__)


@router.get("/", response_model=UserInventoryResponse)
async def get_inventory(current_user: User = Depends(get_current_active_user)):
    """
    Hämta den inloggade användarens hela inventory, med komponentdetaljer expanderade.
    """
    database = await db.get_database()
    inventory_coll = database["inventories"]

    user_id = str(current_user.id)

    pipeline = [
        {
            "$match": {"userId": user_id}
        },
        {
            "$unwind": {
                "path": "$items",
                "preserveNullAndEmptyArrays": True
            }
        },
        {
            "$addFields": {
                "componentObjectId": {"$toObjectId": "$items.componentId"}
            }
        },
        {
            "$lookup": {
                "from": "components",
                "localField": "componentObjectId",
                "foreignField": "_id",
                "as": "items.component_details"
            }
        },
        {
            "$unwind": {
                "path": "$items.component_details",
                "preserveNullAndEmptyArrays": True
            }
        },
        {
            "$group": {
                "_id": "$_id",
                "userId": {"$first": "$userId"},
                "items": {"$push": "$items"}
            }
        }
    ]

    result = await inventory_coll.aggregate(pipeline).to_list(1)

    if not result:
        # Om inget inventory finns, skapa ett tomt
        new_inventory = {"userId": user_id, "items": []}
        insert_result = await inventory_coll.insert_one(new_inventory)
        new_inventory["_id"] = insert_result.inserted_id
        return UserInventoryResponse(**new_inventory)

    # Rensa bort objekt med tomt componentId (kan hända efter unwind)
    inventory_doc = result[0]
    if inventory_doc.get("items") and inventory_doc["items"][0].get("componentId") is None:
        inventory_doc["items"] = []

    return UserInventoryResponse(**inventory_doc)

@router.post("/", response_model=UserInventoryResponse)
async def add_or_update_inventory_item(
    item: InventoryItemCreate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Lägg till en ny komponent i inventory, eller uppdatera kvantiteten
    om den redan finns.
    """
    database = await db.get_database()
    inventory_coll = database["inventories"]
    user_id = str(current_user.id)

    # Kontrollera först om komponenten finns
    components_coll = database["components"]
    if not await components_coll.find_one({"_id": ObjectId(item.componentId)}):
        raise HTTPException(status_code=404, detail="Component not found")

    # Använd arrayFilters för att uppdatera ett specifikt element i arrayen
    # eller lägg till det om det inte finns.

    # 1. Försök att uppdatera kvantiteten på ett existerande item
    result = await inventory_coll.update_one(
        {"userId": user_id, "items.componentId": item.componentId},
        {"$set": {"items.$.quantity": item.quantity, "items.$.unit": item.unit}}
    )

    # 2. Om inget uppdaterades, betyder det att komponenten inte fanns i listan. Lägg till den.
    if result.matched_count == 0:
        await inventory_coll.update_one(
            {"userId": user_id},
            {"$push": {"items": item.dict()}},
            upsert=True # Skapa inventory-dokumentet om det inte finns
        )

    # Hämta och returnera hela det uppdaterade inventory-dokumentet
    # Använd samma funktion som GET-endpointen för att hålla det konsekvent
    return await get_inventory(current_user)

@router.delete("/{component_id}", response_model=UserInventoryResponse)
async def remove_inventory_item(
    component_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Ta bort en komponent från användarens inventory.
    """
    database = await db.get_database()
    inventory_coll = database["inventories"]
    user_id = str(current_user.id)

    if not ObjectId.is_valid(component_id):
        raise HTTPException(status_code=400, detail="Invalid component ID format")

    await inventory_coll.update_one(
        {"userId": user_id},
        {"$pull": {"items": {"componentId": component_id}}}
    )

    return await get_inventory(current_user)
