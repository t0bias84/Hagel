# load_schemas.py

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

#
# =====================================
# 1) Generiska scheman för (ev.) andra typer av laddningar
# =====================================
class LoadBase(BaseModel):
    """
    Basmodell för en (generisk) laddning.
    T.ex. om du vill stödja pistol-, rifle-laddningar etc.
    """
    name: str = Field(..., example="Ex: .308 Win-laddning")
    category: str = Field(..., example="shotshell")  # Kanske "shotshell", "rifle", "pistol"
    description: Optional[str] = Field(None, example="Perfekt för lerduveskytte")
    isPublic: bool = False

    # Flexibelt fält för annan metadata
    loadData: Dict[str, Any] = Field(default_factory=dict)


class LoadCreate(LoadBase):
    """
    Modell för att skapa en ny (generisk) laddning.
    """
    pass


class LoadUpdate(BaseModel):
    """
    Modell för att uppdatera en befintlig (generisk) laddning.
    Alla fält är valfria => Optional.
    """
    name: Optional[str]
    category: Optional[str]
    description: Optional[str]
    isPublic: Optional[bool]
    loadData: Optional[Dict[str, Any]]


class LoadResponse(LoadBase):
    """
    Modell för hur en generisk laddning returneras (GET).
    OBS: Saknar shotshell-specifika fält!
    """
    id: str = Field(..., alias="_id")

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True


#
# =====================================
# 2) Specifika scheman för hagelladdningar (Shotshell)
# =====================================

class ShotLoad(BaseModel):
    """
    Beskriver hagel(delen) i hagelladdningen,
    ex. material, vikt, ev. storlek, expansionsobjekt etc.
    """
    material: str = Field(..., example="steel")
    weight_g: float = Field(..., example=28.0)
    shotSize: Optional[str] = Field(None, example="#4")

    # Möjligt expansionsfält för "shotLoads[*].componentObject"
    componentObject: Optional[Dict[str, Any]] = None


class ShotshellCrimp(BaseModel):
    """
    Typ av förslutning (star, roll, etc.)
    samt ev. overshotCard om det är roll-crimp.
    """
    type: str = Field(..., example="star")  # "star" eller "roll"
    overshotCard: Optional[str] = None


class ShotshellLoadBase(BaseModel):
    """
    Grundläggande fält för en hagelladdning, gemensamt
    för både Create och Response.
    """
    name: str = Field(..., example="Min 28g-laddning #1")
    description: Optional[str] = Field(None, example="24g bly + 4g filler")
    isPublic: bool = False

    gauge: str = Field(..., example="12")         # Ex. "12", "20"
    shellLength: float = Field(..., example=70.0) # Ex. 70 mm, 76 mm etc.

    # Gamla fält (bakåtkompatibilitet)
    hullId: Optional[str] = None
    primerId: Optional[str] = None
    powderId: Optional[str] = None
    powderWeight: Optional[float] = None  # Nytt fält för krutvikt i gram
    wadId: Optional[str] = None
    shotWeight: Optional[float] = None    # Nytt fält för hagelvikt i gram
    shotObject: Optional[Dict[str, Any]] = None  # Nytt fält för hageltyp

    # Nya fält för components array
    components: Optional[List[Dict[str, Any]]] = None

    shotLoads: Optional[List[ShotLoad]] = None  # om det är hagel
    slug: Optional[Dict[str, Any]] = None       # om det är slug
    filler_g: Optional[float] = None
    crimp: Optional[ShotshellCrimp] = None

    velocity: Optional[float] = None
    pressure: Optional[float] = None
    source: Optional[str] = None

    # Kom ihåg att ställa in category="shotshell" om du vill
    category: str = Field(default="shotshell", example="shotshell")

    def process_components(self):
        """Konverterar components array till individuella fält"""
        if not self.components:
            return
        
        for comp in self.components:
            comp_type = comp.get("type")
            comp_id = comp.get("id")
            comp_weight = comp.get("weight")

            if comp_type == "hull":
                self.hullId = comp_id
            elif comp_type == "primer":
                self.primerId = comp_id
            elif comp_type == "powder":
                self.powderId = comp_id
                self.powderWeight = comp_weight  # Uppdaterat för att använda powderWeight
            elif comp_type == "wad":
                self.wadId = comp_id
            elif comp_type == "shot":
                if not self.shotLoads:
                    self.shotLoads = []
                shot_load = ShotLoad(
                    material=comp.get("material", "lead"),
                    weight_g=comp_weight,
                    shotSize=comp.get("shotSize")
                )
                self.shotLoads.append(shot_load)
                self.shotWeight = comp_weight  # Uppdaterat för att spara hagelvikt
                self.shotObject = {  # Lägg till shotObject för hageltyp
                    "name": comp.get("material", "lead"),
                    "type": "shot",
                    "material": comp.get("material", "lead"),
                    "size": comp.get("shotSize")
                }
            elif comp_type == "slug":
                self.slug = {
                    "modelId": comp_id,
                    "weight_g": comp_weight
                }


class ShotshellLoadCreate(ShotshellLoadBase):
    """
    Modell för att POST:a en ny hagelladdning
    (dvs. /api/loads/shotshell).
    Ärver fält från ShotshellLoadBase.
    """
    pass


class ShotshellLoadResponse(ShotshellLoadBase):
    """
    GET/PUT/DELETE-respons för hagelladdningar, 
    med expansionsfält. 
    """
    id: str = Field(..., alias="_id")

    # expansionsdata:
    hullObject: Optional[Dict[str, Any]] = None
    primerObject: Optional[Dict[str, Any]] = None
    powderObject: Optional[Dict[str, Any]] = None
    wadObject: Optional[Dict[str, Any]] = None
    # shotLoads -> componentObject ingår redan i ShotLoad

    # Extra fält: om du vill se vem som äger laddningen
    ownerId: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
