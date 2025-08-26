#################################################################
# main.py – Uppdaterad, ca 900+ rader enligt din monolitiska variant
#################################################################

import logging
import traceback
import json
import asyncio
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional


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
    status,
    Query
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
from app.api.forum_categories import router as forum_categories_router, seed_forum_categories_internal
from app.api.forum_threads import router as forum_threads_router
from app.api.forum_happenings import router as forum_happenings_router
from app.api.routes.social import router as social_router

# Övriga routrar
from app.api.routes.loads import router as loads_router
from app.api.routes.components import router as components_router
from app.api.routes import analysis, auth, users
from app.api.routes.auth import get_current_active_user, User, create_test_users
from app.api.routes import quiz as quiz_router
from app.api.routes import admin
from app.api.websocket import websocket_endpoint
from app.api.users import router as users_router

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
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


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

        # 3) Seed forum categories
        await seed_forum_categories_internal()
        logger.info("Forum categories seeded")

        # 4) Create test users and admin
        database = await db.get_database()
        await create_test_users(database)
        logger.info("Test users created")

        # 5) Create indexes
        notifications_coll = database["notifications"]
        forum_posts_coll = database["forum_posts"]
        shots_coll = database["shots"]

        await notifications_coll.create_index("user_id")
        await forum_posts_coll.create_index([("created_at", -1)])
        await shots_coll.create_index("user_id")
        logger.info("Database indexes created")

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
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

#################################################################
# Inkludera routrar
#################################################################

# Forum categories
app.include_router(
    forum_categories_router,
    prefix="/api/forum",
    tags=["Forum Categories"]
)

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
    users_router,
    prefix="/api/users",
    tags=["users"]
)

# Forum happenings
app.include_router(
    forum_happenings_router,
    prefix="/api/forum",
    tags=["Forum Actions"]
)

# Forum endpoints
from app.api.endpoints import forum as forum_endpoints_router
app.include_router(
    forum_endpoints_router.router,
    prefix="/api",
    tags=["forum_endpoints"],
)

# Misc endpoints
from app.api.endpoints import misc as misc_router
app.include_router(
    misc_router.router,
    prefix="/api",
    tags=["misc"],
)

# Social
app.include_router(social_router, prefix="/api/social", tags=["social"])

# User
from app.api.endpoints import user as user_router
app.include_router(
    user_router.router,
    prefix="/api",
    tags=["user"],
    dependencies=[Depends(get_current_active_user)],
)

# Settings
from app.api.endpoints import settings as settings_router
app.include_router(
    settings_router.router,
    prefix="/api",
    tags=["settings"],
    dependencies=[Depends(get_current_active_user)],
)

# Quiz
app.include_router(
    quiz_router.router,
    prefix="/api",
    tags=["quiz"]
)

# Admin routes
app.include_router(
    admin.router,
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_active_user)]
)

# WebSocket endpoint
app.add_websocket_route("/ws", websocket_endpoint)

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
        host="0.0.0.0",
        port=8000,
        workers=settings.WORKER_COUNT,
        reload=True,
        log_level=settings.LOG_LEVEL.lower(),
    )
