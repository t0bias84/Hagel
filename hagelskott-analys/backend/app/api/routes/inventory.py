# app/api/routes/inventory.py

from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List
from bson import ObjectId
import logging

from app.db.mongodb import db
from app.api.routes.auth import get_current_active_user
from app.models.user import User
from app.api.schemas.inventory_schemas import (
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryItemResponse,
)

router = APIRouter(
    prefix="/api/inventory",
    tags=["Inventory"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)


@router.get("/", response_model=List[InventoryItemResponse])
async def get_user_inventory(current_user: User = Depends(get_current_active_user)):
    """
    Hämta hela inventory för den inloggade användaren.
    """
    database = await db.get_database()
    inventory_coll = database["inventories"]

    user_id = ObjectId(current_user.id)

    items_cursor = inventory_coll.find({"user_id": user_id})
    items = await items_cursor.to_list(length=None)

    # Konvertera ObjectId till str för Pydantic-modellen
    response_items = []
    for item in items:
        item['id'] = str(item['_id'])
        item['user_id'] = str(item['user_id'])
        item['component_id'] = str(item['component_id'])
        response_items.append(InventoryItemResponse(**item))

    return response_items


@router.post("/", response_model=InventoryItemResponse)
async def add_inventory_item(
    item: InventoryItemCreate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Lägg till ett nytt objekt i användarens inventory.
    Om objektet redan finns, adderas kvantiteten.
    """
    database = await db.get_database()
    inventory_coll = database["inventories"]
    components_coll = database["components"]

    user_id = ObjectId(current_user.id)

    if not ObjectId.is_valid(item.component_id):
        raise HTTPException(status_code=400, detail="Invalid component_id format")
    component_id = ObjectId(item.component_id)

    # 1. Kontrollera att komponenten existerar
    component = await components_coll.find_one({"_id": component_id})
    if not component:
        raise HTTPException(status_code=404, detail=f"Component with id {item.component_id} not found")

    # 2. Kontrollera om användaren redan har denna komponent
    existing_item = await inventory_coll.find_one({
        "user_id": user_id,
        "component_id": component_id
    })

    if existing_item:
        # Om den finns, uppdatera kvantiteten
        new_quantity = existing_item['quantity'] + item.quantity
        await inventory_coll.update_one(
            {"_id": existing_item['_id']},
            {"$set": {"quantity": new_quantity}}
        )
        updated_doc = await inventory_coll.find_one({"_id": existing_item['_id']})
    else:
        # Om den inte finns, skapa ett nytt inventory-objekt
        new_item_data = item.dict()
        new_item_data['user_id'] = user_id
        new_item_data['component_id'] = component_id

        result = await inventory_coll.insert_one(new_item_data)
        updated_doc = await inventory_coll.find_one({"_id": result.inserted_id})

    updated_doc['id'] = str(updated_doc['_id'])
    updated_doc['user_id'] = str(updated_doc['user_id'])
    updated_doc['component_id'] = str(updated_doc['component_id'])
    return InventoryItemResponse(**updated_doc)


@router.put("/{item_id}", response_model=InventoryItemResponse)
async def update_inventory_item(
    item_id: str,
    item_update: InventoryItemUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Uppdatera ett specifikt objekt i inventory (kvantitet, enhet, anteckningar).
    """
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID format")

    database = await db.get_database()
    inventory_coll = database["inventories"]

    update_data = {k: v for k, v in item_update.dict().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await inventory_coll.update_one(
        {"_id": ObjectId(item_id), "user_id": ObjectId(current_user.id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found or you don't have permission to edit it")

    updated_doc = await inventory_coll.find_one({"_id": ObjectId(item_id)})
    updated_doc['id'] = str(updated_doc['_id'])
    updated_doc['user_id'] = str(updated_doc['user_id'])
    updated_doc['component_id'] = str(updated_doc['component_id'])
    return InventoryItemResponse(**updated_doc)


@router.delete("/{item_id}", status_code=204)
async def delete_inventory_item(
    item_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Ta bort ett objekt från användarens inventory.
    """
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID format")

    database = await db.get_database()
    inventory_coll = database["inventories"]

    result = await inventory_coll.delete_one(
        {"_id": ObjectId(item_id), "user_id": ObjectId(current_user.id)}
    )

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found or you don't have permission to delete it")

    return
