#################################################################
# main.py – Uppdaterad, ca 900+ rader enligt din monolitiska variant
#################################################################

import logging
import traceback
import json
import asyncio
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional

# ----------- Motor monkeypatch (valfritt) -----------
def monkeypatch_motor_bools():
    from motor.motor_asyncio import (
        AsyncIOMotorClient,
        AsyncIOMotorDatabase,
        AsyncIOMotorCollection,
        AsyncIOMotorCursor,
    )

    def patch_bool_method(cls):
        def patched_bool(self):
            logging.error(f"=== [MonkeyPatch] bool() kallades på: {cls.__name__} ===")
            logging.error("=== Stacktrace (senaste överst) ===")
            stack_str = "".join(traceback.format_stack())
            logging.error(stack_str)
            logging.error("=== Slut på stacktrace ===")
            return True
        setattr(cls, "__bool__", patched_bool)

    patch_bool_method(AsyncIOMotorClient)
    patch_bool_method(AsyncIOMotorDatabase)
    patch_bool_method(AsyncIOMotorCollection)
    patch_bool_method(AsyncIOMotorCursor)

monkeypatch_motor_bools()

# ----------- Logging -----------
import uvicorn
from fastapi import (
    FastAPI,
    Request,
    HTTPException,
    Depends,
    File,
    Form,
    UploadFile,
    status
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.security import OAuth2PasswordBearer

# [NYTT] – För att kunna serva statiska filer
from fastapi.staticfiles import StaticFiles

# Här är det viktigt att importera DINA "settings" från RÄTT modul:
# du nämnde "app.core.config import settings"
# men hade också "from app.api.routes import settings" i ditt exempel.
# Vi använder "app.core.config" för Pydantic Settings:
from app.core.config import settings

from jose import JWTError

from app.db.mongodb import db            # MongoDB wrapper
from app.core.security import get_password_hash
from app.services.analysis_service import analysis_service
from app.services.pattern_analysis import PatternAnalyzer
from app.core.targets import get_target, get_available_targets

# Forum-relaterade routrar
from app.api.forum_categories import router as forum_categories_router, seed_forum_categories
from app.api.forum_threads import router as forum_threads_router
from app.api.forum_happenings import router as forum_happenings_router

# Övriga routrar
from app.api.routes.loads import router as loads_router
from app.api.routes.components import router as components_router
from app.api.routes import analysis, auth, users
from app.api.routes.auth import get_current_active_user, User, create_test_users
from app.api.routes import quiz as quiz_router

logger = logging.getLogger(__name__)

# ----------- Logging Setup -----------
logging.basicConfig(
    level=settings.LOG_LEVEL,
    format=settings.LOG_FORMAT,
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(settings.LOG_FILE) if settings.LOG_FILE else logging.NullHandler(),
    ],
)
logger = logging.getLogger(__name__)

# ----------- OAuth2 -----------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

#################################################################
# Du kan definiera en bas-URL för bilder om du vill.
#################################################################
IMAGES_BASE_URL = "http://127.0.0.1:8000"

#################################################################
# Lifespan – Hanterar uppstart/nedstängning
#################################################################
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # 1) Koppla upp mot DB
        await db.connect_db()
        logger.info("Database connection established")

        # 2) Skapa "upload" mappar
        for subdir in settings.UPLOAD_SUBDIRS.values():
            upload_path = settings.UPLOAD_DIR / subdir
            upload_path.mkdir(parents=True, exist_ok=True)
        logger.info("Upload directories created")

    except Exception as e:
        logger.error(f"Startup error: {str(e)}")
        raise

    # Här körs appen
    yield

    # Nedstängning
    try:
        await db.close_db()
        logger.info("Database connection closed")
    except Exception as e:
        logger.error(f"Shutdown error: {str(e)}")


#################################################################
# Skapa själva FastAPI-appen
#################################################################
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url=settings.SWAGGER_URL if settings.ENABLE_SWAGGER else None,
    lifespan=lifespan,  # <--- anropar funktionen ovan
)

#################################################################
# Mount /uploads som static
#################################################################
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

#################################################################
# CORS
#################################################################
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

#################################################################
# Inkludera routrar
#################################################################

# Forum categories
app.include_router(forum_categories_router)

# Forum threads
app.include_router(
    forum_threads_router,
    prefix="/api/forum",
    tags=["Forum Threads"]
)

# Components
app.include_router(
    components_router,
    prefix="/api/components",
    tags=["Components"]
)

# Loads
app.include_router(
    loads_router,
    prefix="/api/loads",
    tags=["Loads"]
)

# Analysis
app.include_router(
    analysis.router,
    prefix="/api/analysis",
    tags=["analysis"],
    dependencies=[Depends(get_current_active_user)],
)

# Auth
app.include_router(
    auth.router,
    prefix="/api/auth",
    tags=["auth"]
)

# Users
app.include_router(
    users.router,
    prefix="/api/users",
    tags=["users"],
    dependencies=[Depends(get_current_active_user)]
)

# Forum happenings
app.include_router(
    forum_happenings_router,
    prefix="/api/forum",
    tags=["Forum Actions"]
)

# Quiz
app.include_router(
    quiz_router.router,
    prefix="/api",
    tags=["quiz"]
)

#################################################################
# OM du förut hade: app.include_router(settings.router, ...)
# men fick "Settings object has no attribute 'router'"
# så kan du kommentera ut den:
#################################################################
# app.include_router(settings.router, prefix="/api/users", tags=["settings"])


#################################################################
# Request-logger-middleware
#################################################################
from fastapi import Request

@app.middleware("http")
async def logger_middleware(request: Request, call_next):
    logger.debug(f"Incoming request: {request.method} {request.url}")
    logger.debug(f"Headers: {request.headers}")
    response = await call_next(request)
    logger.debug(f"Response status: {response.status_code}")
    return response


#################################################################
# Startup-event: seed forumkategorier, admin-user, indexes
#################################################################
@app.on_event("startup")
async def init_data_on_startup():
    try:
        database = await db.get_database()

        # 1) seed forumkategorier
        await seed_forum_categories()

        # 2) test_user + admin_user
        await create_test_users(database)

        # 3) index i notifications, forum_posts, shots
        notifications_coll = database["notifications"]
        forum_posts_coll = database["forum_posts"]
        shots_coll = database["shots"]

        await notifications_coll.create_index("user_id")
        await forum_posts_coll.create_index([("created_at", -1)])
        await shots_coll.create_index("user_id")

        logger.info("[Startup] Completed seeding categories, users, indexes.")
    except Exception as e:
        logger.error(f"Startup init_data error: {str(e)}")


#################################################################
# Exempel: Notifieringsmodeller
#################################################################
from pydantic import BaseModel

class Notification(BaseModel):
    id: str
    user_id: str
    message: str
    type: str
    read: bool
    created_at: datetime

class ForumPost(BaseModel):
    id: str
    title: str
    author: str
    content: str
    created_at: datetime
    replies: int

class UserSettings(BaseModel):
    interface: Dict[str, Any]
    privacy: Dict[str, Any]
    equipment: Dict[str, Any]
    connectedAccounts: Dict[str, Any]
    achievements: Dict[str, Any]
    forum: Optional[Dict[str, Any]] = None
    social: Optional[Dict[str, Any]] = None
    security: Optional[Dict[str, Any]] = None


#################################################################
# JSON-Encoder
#################################################################
import json

class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.astimezone(timezone.utc).isoformat()
        try:
            from bson import ObjectId
            if isinstance(obj, ObjectId):
                return str(obj)
        except ImportError:
            pass
        return super().default(obj)

#################################################################
# Extra security-headers
#################################################################
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


#################################################################
# En route för "vem är inloggad user"
#################################################################
@app.get("/api/user")
async def get_user(current_user: User = Depends(get_current_active_user)):
    return current_user


#################################################################
# Exempel: notiser, forum-inlägg, user-activity
#################################################################
@app.get("/api/notifications")
async def get_notifications(current_user: User = Depends(get_current_active_user)):
    try:
        database = await db.get_database()
        notifications_coll = database["notifications"]
        notifs = await notifications_coll.find({"user_id": current_user.id}).to_list(length=100)
        return notifs
    except Exception as e:
        logger.error(f"Error fetching notifications: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte hämta notiser")

@app.get("/api/forum/recent")
async def get_recent_forum_posts():
    """
    Returnerar t.ex. de 5 senaste inläggen
    """
    try:
        database = await db.get_database()
        coll = database["forum_posts"]
        posts = await coll.find().sort([("created_at", -1)]).limit(5).to_list(length=5)
        return posts
    except Exception as e:
        logger.error(f"Error fetching forum posts: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte hämta senaste foruminlägg")

@app.get("/api/activity")
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


#################################################################
# Exempel: user settings
#################################################################
@app.get("/api/user/settings")
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


@app.put("/api/user/settings")
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


#################################################################
# Profilbild-uppladdning
#################################################################
@app.post("/api/user/profile-image")
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

        from pathlib import Path
        profile_dir = Path("static/profile_images")
        profile_dir.mkdir(parents=True, exist_ok=True)

        ext = file.filename.split(".")[-1]
        filename = f"{current_user.id}_{datetime.now(timezone.utc).timestamp()}.{ext}"
        file_path = profile_dir / filename

        import shutil
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


#################################################################
# Analysera hagelsvärms-bild (exempel)
#################################################################
@app.post("/api/analyze")
async def analyze_shot_pattern(
    file: UploadFile = File(...),
    metadata: str = Form(...),
    current_user: User = Depends(get_current_active_user)
):
    """
    Exempel: tar emot en bild + metadata,
    anropar analysis_service -> analysera.
    """
    try:
        metadata_dict = json.loads(metadata)
        if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Fel filtyp. Endast {', '.join(settings.ALLOWED_IMAGE_TYPES)} är tillåtna."
            )

        result = await analysis_service.analyze_shot_image(
            file=file,
            user_id=current_user.username,
            metadata=metadata_dict
        )

        return {
            "pattern_id": str(result["_id"]),
            "results": result["analysis_results"],
            "metadata": result["metadata"],
            "image_url": result.get("image_url")
        }

    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


#################################################################
# Visualization-exempel
#################################################################
@app.get("/visualize")
async def visualize_shots():
    try:
        with open("templates/visualization.html", "r", encoding="utf-8") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    except Exception as e:
        logger.error(f"Visualization error: {str(e)}")
        raise HTTPException(500, "Could not load visualization")


#################################################################
# Targets (tavlor)
#################################################################
@app.get("/api/targets")
async def list_targets():
    try:
        targets = get_available_targets()
        from fastapi.responses import JSONResponse
        return JSONResponse(
            content=targets,
            headers={"Cache-Control": f"max-age={settings.CACHE_TTL}"}
        )
    except Exception as e:
        logger.error(f"Error fetching targets: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not fetch targets")

@app.get("/api/targets/{target_id}")
async def get_target_info(target_id: str):
    try:
        tgt = get_target(target_id)
        from fastapi.responses import JSONResponse
        return JSONResponse(
            content=tgt.dict(),
            headers={"Cache-Control": f"max-age={settings.CACHE_TTL}"}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching target {target_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not fetch target")


#################################################################
# Filuppladdning generellt
#################################################################
import aiofiles

async def save_upload_file(upload_file: UploadFile, category: str) -> str:
    """
    Exempel: spara en fil i "uploads/<category>".
    """
    try:
        subdir = settings.get_upload_subdir(category)
        timestamp_str = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        file_path = subdir / f"{timestamp_str}_{upload_file.filename}"

        if upload_file.content_type.startswith("image/"):
            from PIL import Image
            image = Image.open(upload_file.file)
            image.thumbnail((settings.MAX_IMAGE_DIMENSION, settings.MAX_IMAGE_DIMENSION))
            image.save(file_path, quality=settings.IMAGE_QUALITY, optimize=True)
        else:
            async with aiofiles.open(file_path, "wb") as out_file:
                content = await upload_file.read()
                await out_file.write(content)

        return str(file_path.relative_to(settings.UPLOAD_DIR))

    except Exception as e:
        logger.error(f"File upload error: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not save file")


#################################################################
# Rötter
#################################################################
@app.get("/")
async def root():
    return {
        "message": "Välkommen till Hagelskott Analys API",
        "version": settings.VERSION,
        "status": "operational"
    }

@app.get("/health")
async def health_check():
    try:
        database = await db.get_database()
        await database.command("ping")
        db_status = "connected"
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        db_status = "disconnected"

    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": settings.VERSION,
    }

#################################################################
# Error-handlers
#################################################################
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error(f"HTTP error: {exc.detail} (status: {exc.status_code})")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )

#################################################################
# Huvudkörning (om man kör python main.py)
#################################################################
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        workers=settings.WORKER_COUNT,
        reload=True,
        log_level=settings.LOG_LEVEL.lower(),
    )
