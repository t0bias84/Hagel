from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Dict, List, Set
from datetime import datetime
from enum import Enum

class GaugeType(str, Enum):
    GAUGE_10 = "10"
    GAUGE_12 = "12"
    GAUGE_16 = "16"
    GAUGE_20 = "20"
    GAUGE_28 = "28"
    GAUGE_410 = ".410"

class ChokeName(str, Enum):
    CYLINDER = "Cylinder"
    IMPROVED_CYLINDER = "Improved Cylinder"
    MODIFIED = "Modified"
    IMPROVED_MODIFIED = "Improved Modified"
    FULL = "Full"
    EXTRA_FULL = "Extra Full"
    CUSTOM = "Custom"

class Shotgun(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    manufacturer: str
    model: str
    gauge: GaugeType
    barrel_length: float  # i centimeter
    chokes: List[ChokeName]
    serial_number: Optional[str] = None
    year_manufactured: Optional[int] = None
    purchase_date: Optional[datetime] = None
    last_service: Optional[datetime] = None
    notes: Optional[str] = None
    modifications: List[str] = Field(default_factory=list)
    is_favorite: bool = False
    
    class Config:
        allow_population_by_field_name = True

class AmmunitionPreference(BaseModel):
    manufacturer: str
    model: str
    shot_size: float
    shot_weight: float
    is_favorite: bool = False
    notes: Optional[str] = None

class ShootingLocation(BaseModel):
    name: str
    address: Optional[str] = None
    coordinates: Optional[Dict[str, float]] = None
    is_favorite: bool = False
    notes: Optional[str] = None

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    disabled: bool = False

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'password' in values and v != values['password']:
            raise ValueError('Lösenorden matchar inte')
        return v

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    disabled: Optional[bool] = None

class ShootingExperience(BaseModel):
    years_of_experience: Optional[int] = None
    preferred_disciplines: List[str] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    club_memberships: List[str] = Field(default_factory=list)

class UserPreferences(BaseModel):
    default_shotgun_id: Optional[str] = None
    default_ammunition: Optional[AmmunitionPreference] = None
    preferred_location_id: Optional[str] = None
    measurement_units: str = "metric"
    email_notifications: bool = True
    push_notifications: bool = False
    theme: str = "light"
    language: str = "sv"
    default_analysis_settings: Dict = Field(
        default_factory=lambda: {
            "show_grid": True,
            "show_heat_map": True,
            "show_statistics": True
        }
    )

class UserStatistics(BaseModel):
    total_shots: int = 0
    total_sessions: int = 0
    total_shells_used: int = 0
    average_pattern_density: float = 0.0
    best_pattern_density: float = 0.0
    favorite_shotgun_stats: Dict[str, Dict] = Field(default_factory=dict)
    session_history: List[Dict] = Field(default_factory=list)
    improvement_trends: Dict[str, float] = Field(default_factory=dict)

class UserProfile(BaseModel):
    user_id: str
    shooting_experience: ShootingExperience
    shotguns: List[Shotgun] = Field(default_factory=list)
    preferred_ammunition: List[AmmunitionPreference] = Field(default_factory=list)
    favorite_locations: List[ShootingLocation] = Field(default_factory=list)
    preferences: UserPreferences
    statistics: UserStatistics
    achievements: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class UserInDB(UserBase):
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    last_active: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class UserSession(BaseModel):
    user_id: str
    session_id: str
    login_time: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    is_active: bool = True

class UserActivity(BaseModel):
    user_id: str
    activity_type: str
    details: Dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class PasswordReset(BaseModel):
    user_id: str
    reset_token: str
    expires_at: datetime
    used: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None
    exp: Optional[datetime] = None

class ShotgunInventoryUpdate(BaseModel):
    shotgun: Shotgun
    action: str = Field(..., regex='^(add|update|remove)$')