from pydantic import BaseModel, Field
from typing import List, Optional
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
    componentId: str = Field(..., description="The ID of the component from the 'components' collection.")
    quantity: float = Field(..., description="The amount of the component, e.g., number of primers or grams of powder.")
    unit: str = Field(..., description="The unit of measurement, e.g., 'pieces', 'g', 'kg'.")

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemResponse(InventoryItemBase):
    component_details: Optional[dict] = Field(None, description="Expanded details of the component.")

class UserInventoryBase(BaseModel):
    userId: str = Field(..., description="The ID of the user who owns this inventory.")

class UserInventoryResponse(UserInventoryBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    items: List[InventoryItemResponse] = Field([], description="A list of components in the user's inventory.")

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
