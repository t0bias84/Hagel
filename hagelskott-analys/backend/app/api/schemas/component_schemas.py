# app/api/schemas/component_schemas.py

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

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

class ComponentBase(BaseModel):
    """
    Grundläggande schema för en komponent (ex. krut, hylsa, hagel etc.).
    """
    name: str = Field(..., example="Krut N310")
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
    properties: Dict[str, Any] = Field(
        default_factory=dict,
        example={"burnRate": "fast"}
    )

    class Config:
        arbitrary_types_allowed = True


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
    image: Optional[ImageModel] = Field(
        None,
        example={"url": "http://localhost:8000/uploads/hodgdon.jpg"}
    )
    isAvailable: Optional[bool] = Field(None, example=True)
    height: Optional[float] = Field(None, example=60.0)
    density: Optional[float] = Field(None, example=1.45)
    properties: Optional[Dict[str, Any]] = Field(None, example={"burnRate": "medium"})

    class Config:
        arbitrary_types_allowed = True


class ComponentResponse(ComponentBase):
    """
    Schema för att returnera en komponent (GET /api/components/123).
    _id -> id via alias, så front-end tar emot 'id'.
    """
    id: str = Field(..., alias="_id")

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
