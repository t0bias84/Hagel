# app/api/routes/auth.py

import logging
import secrets
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Union, List

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from jose import JWTError, jwt
from email_validator import validate_email, EmailNotValidError

from app.db.mongodb import db
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# ----------------- OAuth2 scheme -----------------
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login",  # Används för /token-endpoints
    auto_error=True
)

# ----------------- Pydantic-modeller -----------------
class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

class TokenData(BaseModel):
    username: Optional[str] = None
    exp: Optional[datetime] = None

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = None
    disabled: Optional[bool] = False

class User(UserBase):
    """
    Returneras t.ex. från /me. 
    Innehåller inte lösenords-hash.
    """
    id: Optional[str] = None
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    roles: Optional[List[str]] = None

    class Config:
        arbitrary_types_allowed = True

class UserInDB(User):
    # Lagrar bcrypt-hash i databasen
    hashed_password: str
    password_changed_at: Optional[datetime] = None
    failed_login_attempts: Optional[int] = 0
    locked_until: Optional[datetime] = None

    class Config:
        arbitrary_types_allowed = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

# ----------------- Lösenord & JWT-helper -----------------
def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Skapa en JWT för inloggning med en 'exp' (expire).
    subject = username
    expires_delta = tidsintervall
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt

# ----------------- Databas-access-funktioner -----------------
async def get_user(username: str) -> Optional[UserInDB]:
    """
    Hämtar en användare ur 'users'-kollektionen (MongoDB) via `username`.
    Returnerar None om ingen hittas.
    """
    database = await db.get_database()
    user_doc = await database.users.find_one({"username": username})
    if not user_doc:
        return None
    user_doc["id"] = str(user_doc["_id"])
    user_doc.pop("_id", None)
    return UserInDB(**user_doc)

async def authenticate_user(username: str, password: str) -> Union[UserInDB, bool]:
    """
    Verifierar username & password. Returnerar UserInDB vid succé, annars False.
    """
    user = await get_user(username)
    if not user:
        return False

    if not verify_password(password, user.hashed_password):
        # Öka failed_login_attempts
        database = await db.get_database()
        await database.users.update_one(
            {"username": username},
            {"$inc": {"failed_login_attempts": 1}}
        )
        return False

    # Nollställ failed_login_attempts + uppdatera last_login
    database = await db.get_database()
    await database.users.update_one(
        {"username": username},
        {
            "$set": {
                "failed_login_attempts": 0,
                "last_login": datetime.now(timezone.utc)
            }
        }
    )
    return user

# ----------------- Dependencies (med extra debug) -----------------
async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    logger.info(f"[AUTH] get_current_user called with token={token}")
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        username: str = payload.get("sub")
        logger.info(f"[AUTH] JWT decode success, username={username}")
        if username is None:
            logger.error("[AUTH] username is None -> credentials_exception")
            raise credentials_exception
    except JWTError as e:
        logger.error(f"[AUTH] JWTError: {e}")
        raise credentials_exception

    user = await get_user(username)
    if not user:
        logger.error(f"[AUTH] No user found in DB with username={username}")
        raise credentials_exception

    logger.info(f"[AUTH] Found user {user.username}, disabled={user.disabled}, roles={user.roles}")
    return user

async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    logger.info(f"[AUTH] get_current_active_user called, current_user={current_user.username}, disabled={current_user.disabled}")
    if current_user.disabled:
        logger.error(f"[AUTH] current_user is disabled => raise 400")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is disabled"
        )
    return current_user

# ----------------- Admin-check -----------------
async def require_admin(current_user: UserInDB = Depends(get_current_active_user)) -> UserInDB:
    if not current_user.roles or "admin" not in current_user.roles:
        logger.error(f"[AUTH] require_admin => user {current_user.username} does not have 'admin' role.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# ----------------- Skapa testanvändare & admin -----------------
async def create_test_users():
    database = await db.get_database()
    users_coll = database["users"]
    now_utc = datetime.now(timezone.utc)

    test_users = [
        {
            "username": "test_user",
            "email": "test@example.com",
            "hashed_password": get_password_hash("test_password"),
            "disabled": False,
            "created_at": now_utc,
            "roles": []
        },
        {
            "username": "admin_user",
            "email": "admin@example.com",
            "hashed_password": get_password_hash("secret_admin_password"),
            "disabled": False,
            "created_at": now_utc,
            "roles": ["admin"]
        }
    ]

    for data in test_users:
        existing = await users_coll.find_one({"username": data["username"]})
        if existing:
            await users_coll.update_one(
                {"_id": existing["_id"]},
                {"$set": data}
            )
            logger.info(f"[AUTH] Updated existing user '{data['username']}'.")
        else:
            await users_coll.insert_one(data)
            logger.info(f"[AUTH] Created user '{data['username']}'.")

# ----------------- Auth-Endpoints -----------------
@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Logga in med username/password. Returnerar en JWT 'access_token'.
    """
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        logger.warning(f"[AUTH] Login failed for user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.username,
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }

@router.post("/register", response_model=User)
async def register_user(user_data: UserCreate):
    """
    Registrera ny användare: 
    - Kollar om lösenordsfälten stämmer 
    - Kollar unik username och email 
    - Hashar lösenord & spar i DB
    """
    if user_data.password != user_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )

    # Kolla e-post
    try:
        validate_email(user_data.email)
    except EmailNotValidError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid email address: {str(e)}"
        )

    database = await db.get_database()
    users_coll = database["users"]

    existing = await users_coll.find_one({
        "$or": [
            {"username": user_data.username.lower()},
            {"email": user_data.email.lower()}
        ]
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )

    now_utc = datetime.now(timezone.utc)
    new_user_doc = {
        "username": user_data.username.lower(),
        "email": user_data.email.lower(),
        "full_name": user_data.full_name,
        "disabled": False,
        "hashed_password": get_password_hash(user_data.password),
        "created_at": now_utc,
        "roles": []
    }

    result = await users_coll.insert_one(new_user_doc)
    logger.info(f"[AUTH] New user created: {user_data.username.lower()}")

    created = await get_user(user_data.username.lower())
    if not created:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User creation failed unexpectedly."
        )
    return created

@router.post("/password-reset")
async def request_password_reset(reset_req: PasswordReset):
    """
    Begär lösenordsåterställning (dummy-exempel).
    Skulle i en riktig app:
    1) Generera en engångslänk eller token 
    2) Skicka mail till user
    """
    database = await db.get_database()
    user_doc = await database.users.find_one({"email": reset_req.email.lower()})
    if user_doc:
        reset_token = secrets.token_urlsafe(32)
        logger.info(f"[AUTH] Password reset for {user_doc['username']} => {reset_token}")
        # Spara i DB t.ex. i "password_resets", skicka e-post etc.

    return {
        "message": "If the email exists, a reset link/token will be sent."
    }

@router.post("/change-password")
async def change_password(
    pwd_update: PasswordUpdate,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Byter lösenord: 
    1) Verifiera gamla lösenordet 
    2) Kolla att new_password == confirm_password 
    3) Spara ny hash i DB
    """
    if not verify_password(pwd_update.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password incorrect")

    if pwd_update.new_password != pwd_update.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")

    new_hash = get_password_hash(pwd_update.new_password)
    database = await db.get_database()

    await database.users.update_one(
        {"username": current_user.username},
        {
            "$set": {
                "hashed_password": new_hash,
                "password_changed_at": datetime.now(timezone.utc)
            }
        }
    )
    logger.info(f"[AUTH] Password changed for user: {current_user.username}")

    return {"message": "Password updated successfully"}

@router.get("/me", response_model=User)
async def read_users_me(current_user: UserInDB = Depends(get_current_active_user)):
    """
    Returnerar data om den inloggade användaren.
    """
    logger.info(f"[AUTH] read_users_me => current_user={current_user.username}")
    return current_user
