from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.db.mongodb import db
from app.api.routes.auth import get_current_active_user

#
# --- Submodeller för user settings (hämtade från din frontend) ---
#

# Interface
class InterfaceSettings(BaseModel):
    theme: str = Field(default="light")
    language: str = Field(default="sv")
    measurementUnit: str = Field(default="metric")
    # Nedanstående fält är nämnda i frontenden men valfria att spara
    alerts: Dict[str, bool] = Field(default_factory=lambda: {
        "newMessages": True,
        "forumMentions": True,
        "productUpdates": True
    })
    notifications: Dict[str, bool] = Field(default_factory=lambda: {
        "email": True,
        "browser": True,
        "mobile": False
    })
    layout: Dict[str, Any] = Field(default_factory=lambda: {
        "compactView": False,
        "showSidebar": True,
        "dashboardLayout": "grid"
    })


# Privacy
class PrivacySettings(BaseModel):
    profileVisibility: str = Field(default="public")
    showOnlineStatus: bool = Field(default=True)
    showLoadingData: bool = Field(default=True)
    showForumStats: bool = Field(default=True)


# Firearm & Optic
class Firearm(BaseModel):
    manufacturer: str = "Beretta"
    model: str = "Silver Pigeon"
    gauge: str = "12"
    serial: str = "AB1234"
    image: Optional[str] = None

class Optic(BaseModel):
    manufacturer: str = "Zeiss"
    model: str = "Conquest V4"
    magnification: str = "4-16x44"
    type: str = "Kikarsikte"

# Equipment
class Equipment(BaseModel):
    firearms: List[Firearm] = Field(default_factory=list)
    optics: List[Optic] = Field(default_factory=list)
    accessories: List[Any] = Field(default_factory=list)


# ConnectedAccounts
class ConnectedAccounts(BaseModel):
    google: bool = False
    facebook: bool = False
    github: bool = False


# Achievements
class Badge(BaseModel):
    id: str
    name: str
    description: str
    progress: int
    total: int
    unlocked: bool

class Achievements(BaseModel):
    rank: str = "Nybörjare"
    points: int = 0
    badgeList: List[Badge] = Field(default_factory=list)
    experiencePoints: int = 0
    experiencePercent: int = 0
    nextLevelPoints: int = 1000
    level: int = 1
    recent: List[Any] = Field(default_factory=list)
    competitions: List[Any] = Field(default_factory=list)
    stats: Dict[str, int] = Field(default_factory=lambda: {
        "totalShots": 0,
        "averageAccuracy": 0,
        "perfectPatterns": 0,
        "competitionsWon": 0
    })


# Security
class SecuritySettings(BaseModel):
    twoFactorEnabled: bool = False


# Huvudmodell
class UserSettings(BaseModel):
    username: str

    interface: InterfaceSettings = Field(default_factory=InterfaceSettings)
    privacy: PrivacySettings = Field(default_factory=PrivacySettings)
    equipment: Equipment = Field(default_factory=Equipment)
    connectedAccounts: ConnectedAccounts = Field(default_factory=ConnectedAccounts)
    achievements: Achievements = Field(default_factory=Achievements)
    security: SecuritySettings = Field(default_factory=SecuritySettings)

    displayName: str = "MinProfil"
    bio: str = "Kort presentation om mig..."
    profileImage: Optional[str] = None

    updated_at: Optional[datetime] = None


router = APIRouter()

@router.get("/settings")
async def get_user_settings(current_user=Depends(get_current_active_user)):
    """
    GET: Hämta användarens inställningar.
    Om inga finns i DB -> returnera ett ny-instansierat UserSettings (med defaultvärden).
    """
    try:
        database = await db.get_database()
        coll = database["user_settings"]

        # Hitta dokument för username
        doc = await coll.find_one({"username": current_user.username})
        if not doc:
            # Returnera defaults (Pydantic genererar default)
            return UserSettings(username=current_user.username)

        doc.pop("_id", None)  # Ta bort MongoDBs _id

        # Parsar doc -> Pydantic (för att fylla på om fält saknas)
        loaded_settings = UserSettings(**doc)
        return loaded_settings.dict()  # Returnera som dict/JSON
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Kunde inte hämta inställningar: {str(e)}"
        )

@router.put("/settings")
async def update_user_settings(
    new_settings: UserSettings,
    current_user=Depends(get_current_active_user)
):
    """
    PUT: Uppdatera användarens inställningar (eller skapa om inte finns).
    """
    try:
        database = await db.get_database()
        coll = database["user_settings"]

        # Säkerställ att username stämmer
        new_settings.username = current_user.username
        new_settings.updated_at = datetime.utcnow()

        # Upsert – sparar eller uppdaterar inställningarna
        await coll.update_one(
            {"username": current_user.username},
            {"$set": new_settings.dict()},
            upsert=True
        )
        return {"message": "Settings updated successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Kunde inte uppdatera inställningar: {str(e)}"
        )
