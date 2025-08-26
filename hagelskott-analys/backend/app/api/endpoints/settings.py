import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException

from app.db.mongodb import db
from app.api.routes.auth import get_current_active_user, User
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

class UserSettings(BaseModel):
    interface: Dict[str, Any]
    privacy: Dict[str, Any]
    equipment: Dict[str, Any]
    connectedAccounts: Dict[str, Any]
    achievements: Dict[str, Any]
    forum: Optional[Dict[str, Any]] = None
    social: Optional[Dict[str, Any]] = None
    security: Optional[Dict[str, Any]] = None


@router.get("/user/settings", response_model=UserSettings)
async def get_user_settings_endpoint(current_user: User = Depends(get_current_active_user)):
    """
    Hämtar user_settings eller returnerar default
    """
    try:
        database = await db.get_database()
        coll = database["user_settings"]
        found = await coll.find_one({"user_id": str(current_user.id)})
        if not found:
            # default
            return {
                "interface": {
                    "theme": "light",
                    "language": "sv",
                    "measurementUnit": "metric",
                    "alerts": {
                        "newMessages": True,
                        "forumMentions": True,
                        "productUpdates": True
                    },
                    "notifications": {
                        "email": True,
                        "browser": True,
                        "mobile": False
                    },
                    "layout": {
                        "compactView": False,
                        "showSidebar": True,
                        "dashboardLayout": "grid"
                    }
                },
                "privacy": {
                    "profileVisibility": "public",
                    "showOnlineStatus": True,
                    "showLoadingData": True,
                    "showForumStats": True
                },
                "equipment": {
                    "firearms": [],
                    "optics": [],
                    "accessories": []
                },
                "connectedAccounts": {
                    "google": False,
                    "facebook": False,
                    "github": False
                },
                "achievements": {
                    "badges": [],
                    "rank": "Nybörjare",
                    "points": 0,
                    "contributions": {
                        "forumPosts": 0,
                        "loadingData": 0,
                        "analyses": 0
                    }
                },
            }

        found.pop("_id", None)
        return found

    except Exception as e:
        logger.error(f"Error fetching user settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte hämta användarinställningar")


@router.put("/user/settings")
async def update_user_settings_endpoint(
    settings: UserSettings,
    current_user: User = Depends(get_current_active_user)
):
    """
    Uppdaterar user_settings för inloggad användare.
    """
    try:
        database = await db.get_database()
        coll = database["user_settings"]
        new_settings = settings.dict()
        new_settings["user_id"] = str(current_user.id)
        new_settings["updated_at"] = datetime.now(timezone.utc)

        await coll.update_one(
            {"user_id": str(current_user.id)},
            {"$set": new_settings},
            upsert=True
        )
        return {"message": "Inställningar uppdaterade"}
    except Exception as e:
        logger.error(f"Error updating user settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte uppdatera inställningar")
