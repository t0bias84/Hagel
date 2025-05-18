from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict
from app.db.mongodb import db
from app.api.routes.auth import get_current_active_user


#
# --- Submodeller för user settings ---
#

class Firearm(BaseModel):
    manufacturer: str = "Okänd"
    model: str = "Okänd"
    gauge: str = "12"
    serial: str = "N/A"
    image: Optional[str] = None

class Optic(BaseModel):
    manufacturer: str = "Okänd"
    model: str = "Okänd"
    magnification: str = "4-16x44"
    type: str = "Kikarsikte"

class Equipment(BaseModel):
    firearms: List[Firearm] = Field(default_factory=list)
    optics: List[Optic] = Field(default_factory=list)
    accessories: list = Field(default_factory=list)

class ConnectedAccounts(BaseModel):
    google: bool = False
    facebook: bool = False
    github: bool = False

class SecuritySettings(BaseModel):
    twoFactorEnabled: bool = False

class AchievementBadge(BaseModel):
    id: str = "someBadgeId"
    name: str = "BadgeName"
    description: str = "BadgeDescription"
    progress: int = 0
    total: int = 10
    unlocked: bool = False

class Competition(BaseModel):
    name: str = "Tävlingsnamn"
    position: int = 0
    score: int = 0
    date: str = "2024-01-01"
    participants: int = 0

class AchievementStats(BaseModel):
    totalShots: int = 0
    averageAccuracy: int = 0
    perfectPatterns: int = 0
    competitionsWon: int = 0

class Achievements(BaseModel):
    rank: str = "Nybörjare"
    points: int = 0
    badgeList: List[AchievementBadge] = Field(default_factory=list)
    experiencePoints: int = 0
    experiencePercent: int = 0
    nextLevelPoints: int = 1000
    level: int = 1
    recent: list = Field(default_factory=list)
    competitions: List[Competition] = Field(default_factory=list)
    stats: AchievementStats = Field(default_factory=AchievementStats)

class InterfaceSettings(BaseModel):
    theme: str = Field(default="light")
    language: str = Field(default="sv")
    measurementUnit: str = Field(default="metric")

class PrivacySettings(BaseModel):
    profileVisibility: str = Field(default="public")
    showOnlineStatus: bool = Field(default=True)
    showLoadingData: bool = Field(default=True)
    showForumStats: bool = Field(default=True)

class SocialSettings(BaseModel):
    allowFriendRequests: bool = True
    allowMessages: bool = True
    allowGroupInvites: bool = True
    showActivity: bool = True
    blockedUsers: List[str] = Field(default_factory=list)
    preferredCommunication: str = "both"  # "messages", "comments", "both"
    notificationPreferences: Dict[str, bool] = Field(
        default_factory=lambda: {
            "friendRequests": True,
            "messages": True,
            "mentions": True,
            "loadingComments": True,
            "groupInvites": True
        }
    )

class NotificationSettings(BaseModel):
    email: bool = True
    browser: bool = True
    mobile: bool = False
    frequency: str = "instant"  # "instant", "daily", "weekly"
    types: Dict[str, bool] = Field(
        default_factory=lambda: {
            "friendRequests": True,
            "messages": True,
            "mentions": True,
            "loadingComments": True,
            "groupInvites": True,
            "achievements": True
        }
    )

#
# --- Huvudmodell för user settings ---
#

class UserSettings(BaseModel):
    username: str
    interface: InterfaceSettings = Field(default_factory=InterfaceSettings)
    privacy: PrivacySettings = Field(default_factory=PrivacySettings)
    equipment: Equipment = Field(default_factory=Equipment)
    connectedAccounts: ConnectedAccounts = Field(default_factory=ConnectedAccounts)
    achievements: Achievements = Field(default_factory=Achievements)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    social: SocialSettings = Field(default_factory=SocialSettings)
    notifications: NotificationSettings = Field(default_factory=NotificationSettings)

    displayName: str = "MinProfil"
    bio: str = "Kort presentation om mig..."
    profileImage: Optional[str] = None

    updated_at: Optional[datetime] = None


router = APIRouter()


@router.get("/settings")
async def get_user_settings(current_user=Depends(get_current_active_user)):
    """
    Hämtar inställningarna för inloggad användare.
    Fyller ut saknade fält med Pydantics defaultvärden.
    """
    try:
        database = await db.get_database()
        coll = database["user_settings"]

        doc = await coll.find_one({"username": current_user.username})
        if not doc:
            # Om inga inställningar finns – returnera default
            return UserSettings(username=current_user.username)

        doc.pop("_id", None)  # Ta bort MongoDB:s _id

        # Parsar doc -> Pydantic-objekt (fyller på default om fält saknas)
        user_settings = UserSettings(**doc)
        return user_settings.dict()

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
    Uppdaterar inställningarna för inloggad användare.
    """
    try:
        database = await db.get_database()
        coll = database["user_settings"]

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
