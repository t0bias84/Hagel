from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.core.roles import UserRole

class User(BaseModel):
    id: Optional[str] = None
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: bool = False
    roles: List[str] = [UserRole.USER]  # Standardroll är USER
    hashed_password: str
    created_at: datetime = datetime.utcnow()
    last_login: Optional[datetime] = None
    last_active: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        } 