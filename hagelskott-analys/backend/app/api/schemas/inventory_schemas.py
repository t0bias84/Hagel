# app/api/schemas/inventory_schemas.py

from pydantic import BaseModel, Field
from typing import Optional
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class InventoryItemBase(BaseModel):
    """
    Grundläggande schema för ett objekt i en användares inventory.
    """
    component_id: PyObjectId = Field(..., description="ID för komponenten från den globala 'components'-collection.")
    quantity: float = Field(..., example=100.0, description="Antal enheter av komponenten som användaren äger.")
    unit: str = Field("pieces", example="pieces", description="Måttenhet (t.ex. 'pieces', 'grams', 'oz').")
    notes: Optional[str] = Field(None, description="Användarens personliga anteckningar för detta objekt.")

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class InventoryItemCreate(BaseModel):
    """
    Schema för att lägga till ett nytt objekt i inventory.
    user_id kommer att härledas från den autentiserade användaren.
    """
    component_id: str = Field(..., description="ID för komponenten som ska läggas till.")
    quantity: float = Field(..., example=100.0)
    unit: str = Field("pieces", example="pieces")
    notes: Optional[str] = Field(None)


class InventoryItemUpdate(BaseModel):
    """
    Schema för att uppdatera ett befintligt inventory-objekt. Alla fält är valfria.
    """
    quantity: Optional[float] = Field(None, description="Ny kvantitet.")
    unit: Optional[str] = Field(None, description="Ny enhet.")
    notes: Optional[str] = Field(None, description="Nya anteckningar.")

class InventoryItemResponse(BaseModel):
    """
    Schema för att returnera ett inventory-objekt. Inkluderar objektets eget ID.
    """
    id: str = Field(..., alias="_id")
    user_id: str
    component_id: str
    quantity: float
    unit: str
    notes: Optional[str]

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
