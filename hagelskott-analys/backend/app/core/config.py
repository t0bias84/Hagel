from pydantic_settings import BaseSettings
from pydantic import Field, AnyUrl
from typing import List, Dict, Optional, Any, Tuple
from pathlib import Path
from datetime import datetime, timedelta


class Settings(BaseSettings):
    # =================== Grundläggande API-inställningar ===================
    PROJECT_NAME: str = "Hagelskott Analys"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False
    VERSION: str = "1.0.0"

    # =================== MongoDB-inställningar ===================
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "hagelskott_db"

    # =================== Säkerhetsinställningar ===================
    SECRET_KEY: str = "your-super-secret-key-change-this-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    ALLOWED_HOSTS: List[str] = ["*"]

    # =================== CORS-inställningar ===================
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]

    # =================== Fil- och bildhantering ===================
    UPLOAD_DIR: Path = Path("uploads")
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/bmp", "image/webp"]
    IMAGE_QUALITY: int = 85           # JPEG-kvalitet
    MAX_IMAGE_DIMENSION: int = 1024   # Max bred/höjd för uppladdade bilder
    THUMBNAIL_SIZE: Tuple[int, int] = (200, 200)  # Storlek för miniatyrer

    # Undermappar för uppladdningar
    UPLOAD_SUBDIRS: Dict[str, str] = {
        "profile_images": "profiles",
        "shotgun_images": "shotguns",
        "dog_images": "dogs",
        "analysis_images": "analysis",
        "temp": "temp",
    }

    # =================== OpenCV-baserad bildanalys ===================
    MIN_SHOT_AREA: int = 10
    MAX_SHOT_AREA: int = 100
    DETECTION_THRESHOLD: int = 30
    BLUR_KERNEL_SIZE: Tuple[int, int] = (5, 5)
    ADAPTIVE_BLOCK_SIZE: int = 11
    ADAPTIVE_C: int = 2
    PATTERN_ANALYSIS: Dict[str, Any] = {
        "min_hits_for_valid_pattern": 3,
        "max_cluster_distance": 50,  # pixlar
        "density_circle_radius": 100,  # pixlar
        "zones": [
            {"name": "center", "radius": 50},
            {"name": "mid", "radius": 150},
            {"name": "outer", "radius": 300},
        ],
    }

    # =================== Cache ===================
    CACHE_TTL: int = 3600  # sekunder
    ENABLE_CACHE: bool = True

    # =================== Loggning ===================
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_FILE: Optional[Path] = Path("logs/app.log")

    # =================== Email (notiser, reset-länkar) ===================
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: Optional[str] = None
    EMAIL_FROM_NAME: Optional[str] = None

    # =================== Prestanda & databaspoolning ===================
    WORKER_COUNT: int = 4
    BATCH_SIZE: int = 100
    DB_POOL_SIZE: int = 10
    DB_MAX_IDLE_TIME_MS: int = 10000

    # =================== Användarinställningar ===================
    MIN_PASSWORD_LENGTH: int = 8
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 24
    MAX_LOGIN_ATTEMPTS: int = 5
    LOGIN_COOLDOWN_MINUTES: int = 15
    MAX_PROFILE_IMAGE_SIZE: int = 5 * 1024 * 1024  # 5 MB
    MAX_EQUIPMENT_IMAGES: int = 5

    # =================== Analysrelaterade konstanter ===================
    VALID_GAUGES: List[str] = ["10", "12", "16", "20", "28", ".410"]
    VALID_CHOKE_TYPES: List[str] = [
        "Cylinder",
        "Improved Cylinder",
        "Modified",
        "Improved Modified",
        "Full",
        "Extra Full",
        "Custom",
    ]
    VALID_SHOT_MATERIALS: List[str] = [
        "Bly",
        "Stål",
        "Vismut",
        "Tungsten",
        "Tungsten Matrix",
        "Zink",
    ]

    # =================== Hundraser ===================
    VALID_DOG_BREEDS: List[str] = [
        "Engelsk Setter",
        "Gordon Setter",
        "Irländsk Setter",
        "Pointer",
        "Kleiner Münsterländer",
        "Grosser Münsterländer",
        "Deutsch Kurzhaar",
        "Bretagne Spaniel",
        "Engelsk Springer Spaniel",
        "Cocker Spaniel",
        "Golden Retriever",
        "Labrador Retriever",
        "Annan",
    ]

    # =================== Defaultinställningar för användare ===================
    DEFAULT_USER_SETTINGS: Dict[str, Any] = {
        "interface": {
            "theme": "light",
            "language": "sv",
            "measurementUnit": "metric",
            "alerts": {
                "newMessages": True,
                "forumMentions": True,
                "productUpdates": True,
            },
            "notifications": {
                "email": True,
                "browser": True,
                "mobile": False,
            },
            "layout": {
                "compactView": False,
                "showSidebar": True,
                "dashboardLayout": "grid",
            },
        },
        "privacy": {
            "profileVisibility": "public",
            "showOnlineStatus": True,
            "showLoadingData": True,
            "showForumStats": True,
        },
        "equipment": {
            "firearms": [],
            "optics": [],
            "accessories": [],
        },
        "connectedAccounts": {
            "google": False,
            "facebook": False,
            "github": False,
        },
        "achievements": {
            "badges": [],
            "rank": "Nybörjare",
            "points": 0,
            "contributions": {
                "forumPosts": 0,
                "loadingData": 0,
                "analyses": 0,
            },
        },
    }

    DEFAULT_FORUM_SETTINGS: Dict[str, Any] = {
        "postsPerPage": 25,
        "defaultSort": "newest",
        "compactView": False,
        "notifications": {"replies": True, "mentions": True, "followedThreads": True},
        "behavior": {"autoQuote": True, "liveUpdates": True},
    }

    DEFAULT_SECURITY_SETTINGS: Dict[str, Any] = {
        "twoFactorEnabled": False,
        "loginNotifications": True,
        "activeDevices": [],
        "lastPasswordChange": None,
    }

    AVAILABLE_LANGUAGES: List[Dict[str, str]] = [
        {"code": "sv", "name": "Svenska"},
        {"code": "en", "name": "English"},
        {"code": "de", "name": "Deutsch"},
        {"code": "it", "name": "Italiano"},
        {"code": "fi", "name": "Suomi"},
        {"code": "es", "name": "Español"},
    ]

    ACHIEVEMENT_LEVELS: Dict[str, int] = {
        "Nybörjare": 0,
        "Erfaren": 1000,
        "Expert": 5000,
        "Mästare": 10000,
        "Legend": 25000,
    }

    MAX_BIO_LENGTH: int = 500
    MAX_DISPLAY_NAME_LENGTH: int = 50
    MAX_EQUIPMENT_PER_USER: int = 20

    DEFAULT_PROFILE_SETTINGS: Dict[str, Any] = {
        "displayName": "",
        "bio": "",
        "location": "",
        "experience": "",
        "showContactInfo": False,
        "preferredDisciplines": [],
    }

    VALID_DISCIPLINES: List[str] = [
        "Sporting",
        "Trap",
        "Skeet",
        "Jakt",
        "FITASC",
        "Compak",
    ]

    DEFAULT_INTERFACE_SETTINGS: Dict[str, Any] = {
        "theme": "light",
        "language": "sv",
        "showGrid": True,
        "showHeatmap": True,
        "compactView": False,
        "measurementUnit": "metric",
    }

    # =================== Utvecklingsinställningar ===================
    ENABLE_SWAGGER: bool = True
    SWAGGER_URL: str = "/docs"

    class Config:
        populate_by_name = True
        extra = "allow"
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

    # =================== Token-hjälpfunktioner ===================
    def get_token_expiry(self) -> timedelta:
        return timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES)

    def get_refresh_token_expiry(self) -> timedelta:
        return timedelta(days=self.REFRESH_TOKEN_EXPIRE_DAYS)

    # =================== Uppladdningsrelaterade funktioner ===================
    def get_upload_dir(self) -> Path:
        """
        Skapa (om det inte redan finns) och returnera huvudmappen för uppladdningar.
        """
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        return self.UPLOAD_DIR

    def get_upload_subdir(self, category: str) -> Path:
        """
        Returnera en undermapp för uppladdningar baserat på en 'kategori'.
        Exempel: category='profile_images' -> uploads/profiles/
        """
        subdir_name = self.UPLOAD_SUBDIRS.get(category, "misc")
        target_dir = self.UPLOAD_DIR / subdir_name
        target_dir.mkdir(parents=True, exist_ok=True)
        return target_dir

    def is_allowed_file_type(self, content_type: str) -> bool:
        """
        Kolla om content_type (ex. 'image/jpeg') finns i ALLOWED_IMAGE_TYPES.
        """
        return content_type in self.ALLOWED_IMAGE_TYPES

    def is_valid_file_size(self, file_size: int) -> bool:
        """
        Kolla om filstorleken är inom MAX_UPLOAD_SIZE.
        """
        return file_size <= self.MAX_UPLOAD_SIZE

    # =================== Logg & filer ===================
    def get_log_file(self) -> Optional[Path]:
        """
        Skapa (om det inte redan finns) och returnera sökväg till loggfil.
        """
        if self.LOG_FILE:
            self.LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
            return self.LOG_FILE
        return None


# Pydantic v2: Rebuild
Settings.model_rebuild()

settings = Settings()

# Init: Skapa uppladdningskataloger etc. (valfritt)
settings.get_upload_dir()
if settings.LOG_FILE:
    settings.get_log_file()

__all__ = ["settings"]
