# app/api/schemas/component_schemas.py

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
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

class ImageModel(BaseModel):
    """
    En submodell för 'image', så man ex. i frontenden kan använda
    component.image?.url för att visa en bild.
    """
    url: Optional[str] = Field(
        None,
        example="http://localhost:8000/uploads/krutm310.jpg",
        description="Fullständig URL till uppladdad bild."
    )

    class Config:
        arbitrary_types_allowed = True


class PurchaseInfo(BaseModel):
    """
    Modell för att lagra inköpsinformation/affiliate-länkar.
    """
    vendor_name: str = Field(..., example="Brownells")
    url: str = Field(..., example="https://www.brownells.se/krut/...")
    region: Optional[str] = Field(None, example="EU", description="Region för butiken, ex. 'EU', 'US' etc.")


class ComponentBase(BaseModel):
    """
    Grundläggande schema för en komponent (ex. krut, hylsa, hagel etc.).
    """
    name: str = Field(..., example="Krut N310")
    aliases: List[str] = Field(
        default_factory=list,
        example=["WSD6000", "Gualandi32"],
        description="Lista med alternativa namn eller produktkoder för samma komponent."
    )
    category: Optional[str] = Field(
        None,
        example="shotgun",
        description="Övergripande kategori, ex. 'shotgun', 'rifle', 'gear' etc."
    )
    type: str = Field(
        ...,
        example="powder",
        description="Typ av komponent (powder, primer, wad, hull, shot, etc.)"
    )
    manufacturer: Optional[str] = Field(
        None,
        example="Vihtavuori",
        description="Tillverkare eller varumärke"
    )
    description: Optional[str] = Field(
        None,
        example="Ett snabbverkande krut för .38 wadcutter-laddningar"
    )
    details: Optional[str] = Field(
        None,
        example="Rekommenderad max-laddning 4.0gn, brinntemperatur ~160°C"
    )
    usage: List[str] = Field(
        default_factory=list,
        example=["clay", "dove", "target"]
    )
    image: Optional[ImageModel] = Field(
        None,
        example={"url": "http://localhost:8000/uploads/krutm310.jpg"},
        description="Objekt som beskriver en tillhörande bild"
    )
    isAvailable: bool = Field(
        True,
        example=True,
        description="Om komponenten är tillgänglig i lager/produktion"
    )
    height: Optional[float] = Field(
        None,
        example=55.0,
        description="Ex. total längd i mm"
    )
    density: Optional[float] = Field(
        None,
        example=1.50,
        description="Täthet i g/cc?"
    )
    purchase_info: List[PurchaseInfo] = Field(
        default_factory=list,
        description="En lista med länkar och info om var komponenten kan köpas."
    )
    properties: Dict[str, Any] = Field(
        default_factory=dict,
        example={"burnRate": "fast"}
    )
    owner_id: Optional[PyObjectId] = Field(None, description="ID of the user who owns this component, if it's a custom component.")


    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class ComponentCreate(ComponentBase):
    """
    Schema för att skapa en ny komponent (POST).
    Ärver allt från ComponentBase.
    """
    pass


class ComponentUpdate(BaseModel):
    """
    Schema för att uppdatera en befintlig komponent (PUT/PATCH).
    Alla fält är valfria (optional).
    """
    name: Optional[str] = Field(None, example="Krut N320")
    category: Optional[str] = Field(None, example="shotgun")
    type: Optional[str] = Field(None, example="powder")
    manufacturer: Optional[str] = Field(None, example="Hodgdon")
    description: Optional[str] = Field(None, example="Allround-krut för .45 ACP")
    details: Optional[str] = Field(None, example="Brinntid, max-laddning m.m.")
    usage: Optional[List[str]] = Field(None, example=["pistol", "hunting"])
    aliases: Optional[List[str]] = Field(None, example=["HS-6"])
    image: Optional[ImageModel] = Field(
        None,
        example={"url": "http://localhost:8000/uploads/hodgdon.jpg"}
    )
    isAvailable: Optional[bool] = Field(None, example=True)
    height: Optional[float] = Field(None, example=60.0)
    density: Optional[float] = Field(None, example=1.45)
    purchase_info: Optional[List[PurchaseInfo]] = Field(None)
    properties: Optional[Dict[str, Any]] = Field(None, example={"burnRate": "medium"})
    owner_id: Optional[str] = Field(None, description="Set the owner of this component.")

    class Config:
        arbitrary_types_allowed = True


class ComponentResponse(ComponentBase):
    """
    Schema för att returnera en komponent (GET /api/components/123).
    _id -> id via alias, så front-end tar emot 'id'.
    """
    id: str = Field(..., alias="_id")
    owner_id: Optional[str] = Field(None)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
