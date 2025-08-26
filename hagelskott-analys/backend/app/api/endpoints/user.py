import logging
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form

from app.db.mongodb import db
from app.api.routes.auth import get_current_active_user, User
from app.services.analysis_service import analysis_service
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/user")
async def get_user(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.get("/activity")
async def get_user_activity(current_user: User = Depends(get_current_active_user)):
    """
    Exempel: hur många "shots" / analyser
    """
    try:
        database = await db.get_database()
        shots_coll = database["shots"]
        count_docs = await shots_coll.count_documents({"user_id": current_user.id})

        return {
            "totalAnalyses": count_docs,
            "averageAccuracy": 82,  # Exempel-siffra
            "timeline": [
                {"date": "2024-01", "shots": 45, "accuracy": 82},
                {"date": "2024-02", "shots": 52, "accuracy": 85},
                {"date": "2024-03", "shots": 38, "accuracy": 88},
            ],
        }
    except Exception as e:
        logger.error(f"Error fetching activity: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte hämta användaraktivitet")

@router.post("/user/profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """
    Enkel endpoint för att ladda upp profilbild (JPEG/PNG).
    """
    try:
        if file.content_type not in ["image/jpeg", "image/png"]:
            raise HTTPException(400, "Endast JPEG och PNG-bilder är tillåtna")

        profile_dir = Path("static/profile_images")
        profile_dir.mkdir(parents=True, exist_ok=True)

        ext = file.filename.split(".")[-1]
        filename = f"{current_user.id}_{datetime.now(timezone.utc).timestamp()}.{ext}"
        file_path = profile_dir / filename

        with open(file_path, "wb+") as f:
            shutil.copyfileobj(file.file, f)

        image_url = f"/static/profile_images/{filename}"
        database = await db.get_database()
        user_settings_coll = database["user_settings"]

        await user_settings_coll.update_one(
            {"user_id": str(current_user.id)},
            {"$set": {"profileImage": image_url}}
        )
        return {"image_url": image_url}

    except Exception as e:
        logger.error(f"Error uploading profile image: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte ladda upp profilbild")
