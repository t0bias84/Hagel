from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Union, Literal
from datetime import datetime
from enum import Enum

# ------------------ Enums & Constants ------------------

class ChokeName(str, Enum):
    CYLINDER = "Cylinder"
    IMPROVED_CYLINDER = "Improved Cylinder"
    MODIFIED = "Modified"
    IMPROVED_MODIFIED = "Improved Modified"
    FULL = "Full"
    EXTRA_FULL = "Extra Full"
    CUSTOM = "Custom"

class ShotMaterial(str, Enum):
    LEAD = "Bly"
    STEEL = "Stål"
    BISMUTH = "Vismut"
    TUNGSTEN = "Tungsten"
    TUNGSTEN_MATRIX = "Tungsten Matrix"
    ZINC = "Zink"
    OTHER = "Övrigt"

class PrimerType(str, Enum):
    STANDARD = "Standard"
    MAGNUM = "Magnum"
    HIGH_PERFORMANCE = "High Performance"
    LOW_RECOIL = "Low Recoil"

class HullType(str, Enum):
    PLASTIC = "Plast"
    PAPER = "Papper"
    HYBRID = "Hybrid"

# ------------------ Weather ------------------

class WeatherCondition(BaseModel):
    temperature: Optional[float] = Field(None, description="Temperatur i Celsius")
    humidity: Optional[float] = Field(None, description="Luftfuktighet i %")
    wind_speed: Optional[float] = Field(None, description="Vindhastighet i m/s")
    wind_direction: Optional[str] = Field(None, description="Vindriktning (t.ex. N, NO...)")
    precipitation: Optional[str] = Field(None, description="Ex. 'regn'")
    light_conditions: Optional[str] = Field(None, description="Ex. 'soligt', 'mulet'")

    class Config:
        populate_by_name = True

# ------------------ Coordinates ------------------

class Coordinates(BaseModel):
    x: float = Field(..., description="X-koordinat")
    y: float = Field(..., description="Y-koordinat")

    class Config:
        populate_by_name = True

# ------------------ Shotgun Details ------------------

class ShotgunDetails(BaseModel):
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    gauge: Optional[int] = 12
    barrel_length: Optional[float] = Field(None, alias="barrelLength")
    choke: Optional[ChokeName] = None
    custom_choke_constriction: Optional[float] = None
    serial_number: Optional[str] = None
    year_manufactured: Optional[int] = None
    modifications: List[str] = []

    class Config:
        populate_by_name = True

# ------------------ Ammunition Models ------------------

class FactoryAmmunitionComponents(BaseModel):
    type: Literal["factory"] = "factory"
    manufacturer: Optional[str] = None
    modelName: Optional[str] = None
    gauge: Optional[int] = 12
    hullLength: Optional[float] = None

    class Config:
        populate_by_name = True

class HandloadAmmunitionComponents(BaseModel):
    type: Literal["handload"] = "handload"
    hull_manufacturer: Optional[str] = None
    hull_type: Optional[HullType] = None
    hull_length: Optional[float] = None
    primer_type: Optional[PrimerType] = None
    primer_manufacturer: Optional[str] = None
    powder_type: Optional[str] = None
    powder_weight: Optional[float] = None
    wad_type: Optional[str] = None
    wad_manufacturer: Optional[str] = None
    shot_size: Optional[float] = None
    shot_weight: Optional[float] = None
    shot_material: Optional[ShotMaterial] = None
    shot_count: Optional[int] = None

    class Config:
        populate_by_name = True

AmmunitionUnion = Union[FactoryAmmunitionComponents, HandloadAmmunitionComponents]

# ------------------ Shot Metadata ------------------

class ShotMetadata(BaseModel):
    shotgun: Optional[ShotgunDetails] = None
    ammunition: Optional[AmmunitionUnion] = None
    distance: Optional[int] = None
    weather: Optional[WeatherCondition] = None
    date_taken: datetime = Field(default_factory=datetime.utcnow)
    location: Optional[str] = None
    shooter_position: Optional[str] = None
    target_type: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        populate_by_name = True

# ------------------ Pattern Analysis ------------------

class PatternAnalysis(BaseModel):
    hit_count: Optional[int] = None
    pattern_density: Optional[float] = None
    centroid: Optional[Coordinates] = None
    spread: Optional[float] = None
    effective_spread_area: Optional[float] = None
    pattern_efficiency: Optional[float] = None
    hit_distribution: Optional[Dict[str, int]] = None
    density_zones: Optional[List[Dict[str, float]]] = []
    closest_hits: Optional[List[Coordinates]] = None
    outer_hits: Optional[List[Coordinates]] = None
    hit_clusters: Optional[List[Dict]] = None

    individual_pellets: List[Dict[str, float]] = []
    zone_analysis: Optional[Dict[str, Dict]] = {}
    distribution: Optional[Dict[str, Dict]] = {}
    pattern_radius: Optional[float] = None
    ring: Optional[Dict[str, float]] = {}
    image_dimensions: Optional[Dict[str, int]] = {}

    @validator('pattern_efficiency')
    def validate_efficiency(cls, v):
        if v is not None:
            if v < 0 or v > 1:
                # Om du vill 0..100 => justera
                raise ValueError("Mönstereffektivitet måste vara i intervallet [0..1].")
        return v

    class Config:
        populate_by_name = True

# ------------------ ShotAnalysisResult ------------------

class ShotAnalysisResult(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: Optional[str] = None
    metadata: Optional[ShotMetadata] = None
    analysis_results: Optional[PatternAnalysis] = None
    image_url: Optional[str] = None
    image_data: Optional[Dict[str, str]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    tags: List[str] = []
    series_id: Optional[str] = None

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# ------------------ Filter & Extras ------------------

class AnalysisFilter(BaseModel):
    """
    Filter-klass: start_date, end_date, min_hits, max_hits, 
    ammunition_type, gun_manufacturer, gun_model, etc.
    """
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    min_hits: Optional[int] = None
    max_hits: Optional[int] = None

    ammunition_type: Optional[str] = None
    gun_manufacturer: Optional[str] = None
    gun_model: Optional[str] = None
    choke_type: Optional[ChokeName] = None
    shot_material: Optional[ShotMaterial] = None
    distance_range: Optional[Dict[str, int]] = None
    pattern_efficiency_range: Optional[Dict[str, float]] = None
    ammunition_components: Optional[Dict[str, str]] = None

    class Config:
        populate_by_name = True

class SeriesAnalysis(BaseModel):
    series_id: str
    shot_count: int
    average_pattern_density: float
    density_variance: float
    average_hit_count: float
    hit_count_variance: float
    consistency_score: float
    trend_analysis: Dict[str, float]
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class ComparisonResult(BaseModel):
    shot_ids: List[str]
    average_hits: float
    pattern_similarity: float
    spread_variance: float
    density_comparison: Dict[str, float]
    statistical_analysis: Dict[str, float]
    equipment_differences: Dict[str, List[str]]
    performance_factors: Dict[str, float]

    @validator('average_hits')
    def validate_hits(cls, v):
        if v < 0:
            raise ValueError("Genomsnittligt antal träffar kan inte vara negativt")
        return v

    class Config:
        populate_by_name = True
