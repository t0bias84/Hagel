from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
import logging
from pathlib import Path
import shutil
import os
from PIL import Image
import io

from app.core.config import settings
from app.db.mongodb import db
from app.api.routes.auth import get_current_active_user, User, UserInDB
from pydantic import BaseModel, EmailStr, Field

# Konfigurera logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users", tags=["users"])

# --------------------- Pydantic-modeller ---------------------
class DogBase(BaseModel):
    name: str
    breed: str
    birthDate: Optional[str]
    notes: Optional[str]
    imageUrl: Optional[str]

class ShotgunBase(BaseModel):
    manufacturer: str
    model: str
    gauge: str
    serialNumber: Optional[str]
    purchaseDate: Optional[str]
    notes: Optional[str]
    imageUrl: Optional[str]
    choke: Optional[str]
    barrelLength: Optional[float]

class UserProfile(BaseModel):
    displayName: Optional[str]
    bio: Optional[str]
    location: Optional[str]
    experience: Optional[str]
    imageUrl: Optional[str]
    preferredDisciplines: List[str] = []
    contactEmail: Optional[EmailStr]
    phoneNumber: Optional[str]
    showContactInfo: bool = False

class DisplaySettings(BaseModel):
    darkMode: bool = False
    showGrid: bool = True
    showHeatmap: bool = True
    compactView: bool = False
    defaultZoom: int = 100
    showStatistics: bool = True

class GeneralSettings(BaseModel):
    defaultDistance: int = 25
    preferredGauge: str = "12"
    measurementUnit: str = "metric"
    language: str = "sv"

class NotificationSettings(BaseModel):
    emailNotifications: bool = True
    analysisComplete: bool = True
    weeklyReport: bool = False
    improvementSuggestions: bool = True
    pushNotifications: bool = False

class Equipment(BaseModel):
    shotguns: List[ShotgunBase] = []
    dogs: List[DogBase] = []

class CompleteUserSettings(BaseModel):
    profile: UserProfile
    display: DisplaySettings
    general: GeneralSettings
    notifications: NotificationSettings
    equipment: Equipment

# --------------------- Hjälpfunktioner för filhantering ---------------------
async def save_upload_file(upload_file: UploadFile, folder: str) -> str:
    """
    Spara uppladdad fil och returnera sökvägen
    Skapar mappen om den inte finns.
    Om filen är en bild (jpg/png) skalar vi ner den till max 1024x1024
    och sparar i quality=85 för enkel optimering.
    """
    try:
        # Skapa målmapp om den inte finns
        save_path = Path(settings.UPLOAD_DIR) / folder
        save_path.mkdir(parents=True, exist_ok=True)

        # Generera unikt filnamn
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = Path(upload_file.filename).suffix.lower()
        unique_filename = f"{timestamp}_{ObjectId()}{file_extension}"
        file_path = save_path / unique_filename

        # Om det är en bild, optimera/storleksändra
        if file_extension in [".jpg", ".jpeg", ".png"]:
            image = Image.open(upload_file.file)
            image.thumbnail((1024, 1024))
            image.save(file_path, optimize=True, quality=85)
        else:
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(upload_file.file, buffer)

        # Returnera den relativa sökvägen
        return str(file_path.relative_to(settings.UPLOAD_DIR))
    except Exception as e:
        logger.error(f"File upload error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Kunde inte spara filen"
        )

# --------------------- ENDPOINTS ---------------------

@router.get("/profile", response_model=UserProfile)
async def get_user_profile(current_user: User = Depends(get_current_active_user)):
    """
    Hämta användarprofil
    Om ingen profil finns, skapas en standardprofil.
    """
    try:
        database = await db.get_database()
        profiles_coll = database["profiles"]

        profile = await profiles_coll.find_one({"username": current_user.username})
        if not profile:
            profile = {
                "username": current_user.username,
                "displayName": current_user.username,
                "bio": "",
                "location": "",
                "imageUrl": None,
                "experience": "",
                "preferredDisciplines": [],
                "created_at": datetime.utcnow()
            }
            await profiles_coll.insert_one(profile)

        return UserProfile(**profile)
    except Exception as e:
        logger.error(f"Error fetching profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte hämta profil")


@router.put("/profile")
async def update_user_profile(
    displayName: str = Form(None),
    bio: str = Form(None),
    location: str = Form(None),
    experience: str = Form(None),
    profile_image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_active_user)
):
    """Uppdatera användarprofil med stöd för filuppladdning"""
    try:
        update_data = {
            "displayName": displayName,
            "bio": bio,
            "location": location,
            "experience": experience
        }

        # Hantera profilbild
        if profile_image:
            file_path = await save_upload_file(profile_image, "profile_images")
            update_data["imageUrl"] = file_path

        database = await db.get_database()
        profiles_coll = database["profiles"]

        result = await profiles_coll.update_one(
            {"username": current_user.username},
            {"$set": update_data}
        )

        # Om ingen profil uppdaterades, kanske den inte fanns → skapa
        if result.modified_count == 0:
            update_data["username"] = current_user.username
            update_data["created_at"] = datetime.utcnow()
            await profiles_coll.insert_one(update_data)

        return {"message": "Profil uppdaterad", "profile": update_data}
    except Exception as e:
        logger.error(f"Profile update error: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte uppdatera profil")


@router.get("/settings", response_model=CompleteUserSettings)
async def get_user_settings(current_user: User = Depends(get_current_active_user)):
    """Hämta alla användarinställningar"""
    try:
        database = await db.get_database()
        settings_coll = database["settings"]

        user_settings = await settings_coll.find_one({"username": current_user.username})
        if not user_settings:
            # Returnera standardinställningar
            return CompleteUserSettings(
                profile=UserProfile(displayName=current_user.username),
                display=DisplaySettings(),
                general=GeneralSettings(),
                notifications=NotificationSettings(),
                equipment=Equipment()
            )

        return CompleteUserSettings(**user_settings)
    except Exception as e:
        logger.error(f"Settings fetch error: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte hämta inställningar")


@router.put("/settings")
async def update_user_settings(
    settings_data: CompleteUserSettings,
    current_user: User = Depends(get_current_active_user)
):
    """Uppdatera användarinställningar"""
    try:
        database = await db.get_database()
        settings_coll = database["settings"]

        settings_dict = settings_data.dict()
        settings_dict["username"] = current_user.username
        settings_dict["updated_at"] = datetime.utcnow()

        await settings_coll.update_one(
            {"username": current_user.username},
            {"$set": settings_dict},
            upsert=True
        )

        return {"message": "Inställningar uppdaterade"}
    except Exception as e:
        logger.error(f"Settings update error: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte uppdatera inställningar")


@router.post("/equipment/shotgun")
async def add_shotgun(
    manufacturer: str = Form(...),
    model: str = Form(...),
    gauge: str = Form(...),
    serialNumber: str = Form(None),
    notes: str = Form(None),
    image: Optional[UploadFile] = File(None),
    choke: str = Form(None),
    barrelLength: float = Form(None),
    current_user: User = Depends(get_current_active_user)
):
    """Lägg till nytt vapen med bilduppladdning"""
    try:
        shotgun_data = {
            "manufacturer": manufacturer,
            "model": model,
            "gauge": gauge,
            "serialNumber": serialNumber,
            "notes": notes,
            "choke": choke,
            "barrelLength": barrelLength,
            "created_at": datetime.utcnow()
        }

        if image:
            file_path = await save_upload_file(image, "shotgun_images")
            shotgun_data["imageUrl"] = file_path

        database = await db.get_database()
        settings_coll = database["settings"]

        # Lägg till i användarens vapensamling
        await settings_coll.update_one(
            {"username": current_user.username},
            {"$push": {"equipment.shotguns": shotgun_data}},
            upsert=True
        )

        return {"message": "Vapen tillagt", "shotgun": shotgun_data}
    except Exception as e:
        logger.error(f"Shotgun add error: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte lägga till vapen")


@router.post("/equipment/dog")
async def add_dog(
    name: str = Form(...),
    breed: str = Form(...),
    birthDate: str = Form(None),
    notes: str = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_active_user)
):
    """Lägg till ny hund med bilduppladdning"""
    try:
        dog_data = {
            "name": name,
            "breed": breed,
            "birthDate": birthDate,
            "notes": notes,
            "created_at": datetime.utcnow()
        }

        if image:
            file_path = await save_upload_file(image, "dog_images")
            dog_data["imageUrl"] = file_path

        database = await db.get_database()
        settings_coll = database["settings"]

        # Lägg till i användarens hundlista
        await settings_coll.update_one(
            {"username": current_user.username},
            {"$push": {"equipment.dogs": dog_data}},
            upsert=True
        )

        return {"message": "Hund tillagd", "dog": dog_data}
    except Exception as e:
        logger.error(f"Dog add error: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte lägga till hund")


@router.delete("/equipment/shotgun/{shotgun_id}")
async def delete_shotgun(
    shotgun_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Ta bort vapen från användarens samling"""
    try:
        if not ObjectId.is_valid(shotgun_id):
            raise HTTPException(status_code=400, detail="Invalid shotgun ID format")

        database = await db.get_database()
        settings_coll = database["settings"]

        result = await settings_coll.update_one(
            {"username": current_user.username},
            {"$pull": {"equipment.shotguns": {"_id": ObjectId(shotgun_id)}}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Vapen hittades inte")
            
        return {"message": "Vapen borttaget"}
    except Exception as e:
        logger.error(f"Shotgun delete error: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte ta bort vapen")


@router.delete("/equipment/dog/{dog_id}")
async def delete_dog(
    dog_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Ta bort hund från användarens lista"""
    try:
        if not ObjectId.is_valid(dog_id):
            raise HTTPException(status_code=400, detail="Invalid dog ID format")

        database = await db.get_database()
        settings_coll = database["settings"]

        result = await settings_coll.update_one(
            {"username": current_user.username},
            {"$pull": {"equipment.dogs": {"_id": ObjectId(dog_id)}}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Hund hittades inte")
            
        return {"message": "Hund borttagen"}
    except Exception as e:
        logger.error(f"Dog delete error: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte ta bort hund")


@router.post("/settings/reset")
async def reset_user_settings(current_user: User = Depends(get_current_active_user)):
    """Återställ alla användarinställningar till standard"""
    try:
        default_settings = CompleteUserSettings(
            profile=UserProfile(displayName=current_user.username),
            display=DisplaySettings(),
            general=GeneralSettings(),
            notifications=NotificationSettings(),
            equipment=Equipment()
        )

        database = await db.get_database()
        settings_coll = database["settings"]

        await settings_coll.update_one(
            {"username": current_user.username},
            {"$set": default_settings.dict()},
            upsert=True
        )

        return {"message": "Inställningar återställda", "settings": default_settings}
    except Exception as e:
        logger.error(f"Settings reset error: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte återställa inställningar")
