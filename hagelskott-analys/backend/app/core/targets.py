from typing import List, Dict
from pydantic import BaseModel

class VitalZone(BaseModel):
    """Definition av vital träffzon"""
    name: str
    x: float  # x-position i procent av bildbredd
    y: float  # y-position i procent av bildhöjd
    radius: float  # radie i procent av bildhöjd
    lethal_probability: float  # sannolikhet för dödlig träff (0-1)

class Target(BaseModel):
    """Definition av måltyp"""
    id: str
    name: str
    description: str
    silhouette_path: str
    width_mm: float  # verklig bredd i millimeter
    height_mm: float  # verklig höjd i millimeter
    vital_zones: List[VitalZone]
    svg_size: Dict[str, int]  # SVG-filens dimensioner

# Definiera tillgängliga mål
AVAILABLE_TARGETS = {
    "turkey": Target(
        id="turkey",
        name="Kalkon",
        description="Vild kalkon i stående position",
        silhouette_path="targets/turkey.svg",
        width_mm=1000,  # SVG-bredd
        height_mm=1000,  # SVG-höjd
        svg_size={
            "width": 1000,
            "height": 1000
        },
        vital_zones=[
            VitalZone(
                name="kropp",
                x=50,  # centrerad horisontellt
                y=45,  # strax under mitten
                radius=20,  # 20% av höjden
                lethal_probability=0.95
            ),
            VitalZone(
                name="huvud/hals",
                x=50,
                y=15,  # övre delen
                radius=10,
                lethal_probability=1.0
            )
        ]
    )
}

def get_target(target_id: str) -> Target:
    """Hämta måltyp baserat på ID"""
    if target_id not in AVAILABLE_TARGETS:
        raise ValueError(f"Okänd måltyp: {target_id}")
    return AVAILABLE_TARGETS[target_id]

def get_available_targets() -> Dict[str, str]:
    """Hämta lista över tillgängliga mål"""
    return {
        target_id: target.name 
        for target_id, target in AVAILABLE_TARGETS.items()
    }

def calculate_scaled_vital_zones(target: Target, distance_meters: float) -> List[Dict]:
    """
    Beräkna skalade vitala zoner baserat på avstånd
    
    Args:
        target: Målobjekt
        distance_meters: Avstånd i meter
        
    Returns:
        Lista med skalade zoner
    """
    # Grundläggande skalberäkning baserat på avstånd
    # Detta är en förenklad modell som kan behöva justeras
    scale_factor = 40 / distance_meters  # Normaliserat till 40 meters avstånd
    
    scaled_zones = []
    for zone in target.vital_zones:
        scaled_zones.append({
            "name": zone.name,
            "x": zone.x,  # Procent behålls oförändrad
            "y": zone.y,  # Procent behålls oförändrad
            "radius": zone.radius * scale_factor,  # Skala radien baserat på avstånd
            "lethal_probability": zone.lethal_probability
        })
    
    return scaled_zones

def is_point_in_vital_zone(
    x: float,
    y: float,
    zone: Dict,
    target: Target
) -> bool:
    """
    Kontrollera om en punkt träffar en vital zon
    
    Args:
        x: X-koordinat (0-100)
        y: Y-koordinat (0-100)
        zone: Zondata
        target: Målobjekt
        
    Returns:
        Boolean som indikerar träff
    """
    # Beräkna avståndet från punkten till zonens centrum
    dx = x - zone["x"]
    dy = y - zone["y"]
    distance = (dx * dx + dy * dy) ** 0.5
    
    # Kontrollera om avståndet är mindre än zonens radie
    return distance <= zone["radius"]