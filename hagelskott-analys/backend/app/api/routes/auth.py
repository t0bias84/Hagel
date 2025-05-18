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
    Request
)
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from jose import JWTError, jwt
from email_validator import validate_email, EmailNotValidError

from app.db.mongodb import db
from app.core.config import settings
from app.utils.email import EmailService

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

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str

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
        logger.error(f"[AUTH] login failed for {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Fel användarnamn eller lösenord",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.disabled:
        logger.error(f"[AUTH] login attempt for disabled user {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kontot är inaktiverat",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.username, expires_delta=access_token_expires
    )
    
    logger.info(f"[AUTH] login success for {form_data.username}")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # i sekunder
    }

@router.post("/register", response_model=dict)
async def register_user(user_data: UserCreate, request: Request):
    """
    Registrera en ny användare
    """
    try:
        database = await db.get_database()
        users_collection = database["users"]
        
        # Kontrollera att lösenorden matchar
        if user_data.password != user_data.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lösenorden matchar inte"
            )
        
        # Kontrollera unik användarnamn
        existing_user = await users_collection.find_one({"username": user_data.username})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Användarnamn finns redan"
            )
        
        # Kontrollera unik e-post
        existing_email = await users_collection.find_one({"email": user_data.email})
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="E-postadressen används redan"
            )
        
        # Hasha lösenord
        hashed_password = get_password_hash(user_data.password)
        
        # Skapa användare och spara i databasen
        new_user = {
            "username": user_data.username,
            "email": user_data.email,
            "hashed_password": hashed_password,
            "full_name": user_data.full_name,
            "disabled": False,
            "roles": ["user"],  # Standard roll
            "created_at": datetime.now(timezone.utc),
            "email_verified": False  # E-post behöver verifieras
        }
        
        await users_collection.insert_one(new_user)
        
        # Skapa en verifieringstoken för e-post
        verification_token = create_access_token(
            subject=user_data.username,
            expires_delta=timedelta(hours=24)  # Giltig i 24 timmar
        )
        
        # Spara verifieringstoken i databasen
        await users_collection.update_one(
            {"username": user_data.username},
            {"$set": {
                "verification_token": verification_token,
                "verification_token_expires": datetime.now(timezone.utc) + timedelta(hours=24)
            }}
        )
        
        # Skapa URL för e-postverifiering
        base_url = str(request.base_url).rstrip('/')
        verification_url = f"{base_url}/verify-email?token={verification_token}"
        
        # Skicka verifieringsmail
        EmailService.send_email_verification(
            recipient_email=user_data.email,
            username=user_data.username,
            verification_url=verification_url
        )
        
        logger.info(f"[AUTH] New user registered: {user_data.username}")
        
        # I utvecklingsmiljö returnerar vi token för testning
        if settings.ENVIRONMENT == "development":
            return {
                "message": "Användare skapad! Vänligen verifiera din e-postadress.",
                "verification_token": verification_token,  # Endast i utvecklingsmiljö
                "verification_url": verification_url       # Endast i utvecklingsmiljö
            }
        
        return {
            "message": "Användare skapad! Vänligen verifiera din e-postadress."
        }
    except HTTPException:
        # Vidarebefordra HTTP-undantag
        raise
    except Exception as e:
        logger.error(f"[AUTH] Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ett fel uppstod vid registrering: {str(e)}"
        )

@router.post("/verify-email")
async def verify_email(token: str):
    """
    Verifiera användarens e-post med token.
    """
    try:
        database = await db.get_database()
        users_collection = database["users"]
        
        # Validera token
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            username = payload.get("sub")
            
            if not username:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ogiltig verifieringstoken"
                )
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ogiltig eller utgången verifieringstoken"
            )
        
        # Kontrollera att användaren finns och token är giltig
        user = await users_collection.find_one({
            "username": username,
            "verification_token": token,
            "verification_token_expires": {"$gt": datetime.now(timezone.utc)}
        })
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ogiltig eller utgången verifieringstoken"
            )
        
        # Uppdatera användarens e-postverifieringsstatus
        result = await users_collection.update_one(
            {"username": username},
            {"$set": {
                "email_verified": True,
                "verification_completed_at": datetime.now(timezone.utc)
            },
            "$unset": {
                "verification_token": "",
                "verification_token_expires": ""
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Användaren hittades inte eller e-posten är redan verifierad"
            )
        
        # Skicka en välkomstmejl
        try:
            EmailService.send_email(
                recipient_email=user.get("email"),
                subject="Välkommen till Hagelskott Analys",
                template_name="welcome",
                username=username,
                app_name=settings.PROJECT_NAME
            )
        except Exception as e:
            logger.error(f"[AUTH] Failed to send welcome email: {str(e)}")
        
        logger.info(f"[AUTH] Email verified for user {username}")
        return {"message": "E-postadress verifierad!"}
    
    except HTTPException:
        # Vidarebefordra HTTP-undantag
        raise
    except Exception as e:
        logger.error(f"[AUTH] Email verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ett fel uppstod vid verifiering av e-postadressen"
        )

@router.post("/password-reset")
async def request_password_reset(password_reset: PasswordReset, request: Request):
    """
    Begär återställning av lösenord via e-post.
    """
    try:
        database = await db.get_database()
        users_collection = database["users"]
        
        # Kontrollera om e-postadressen finns i databasen
        user = await users_collection.find_one({"email": password_reset.email})
        if not user:
            # För säkerhetens skull, låtsas som om det gick bra även om e-postadressen inte finns
            return {"message": "Om e-postadressen finns registrerad, har ett återställningsmail skickats."}
        
        # Skapa en lösenordsåterställningstoken
        reset_token = create_access_token(
            subject=user["username"],
            expires_delta=timedelta(hours=1)  # Giltig i 1 timme
        )
        
        # Spara token i databasen för validering
        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "reset_token": reset_token, 
                "reset_token_expires": datetime.now(timezone.utc) + timedelta(hours=1),
                "reset_requested_at": datetime.now(timezone.utc)
            }}
        )
        
        # Skapa URL för återställning
        base_url = str(request.base_url).rstrip('/')
        reset_url = f"{base_url}/reset-password?token={reset_token}"
        
        # Skicka e-post med återställningslänk
        EmailService.send_password_reset_email(
            recipient_email=password_reset.email,
            username=user["username"],
            reset_url=reset_url
        )
        
        logger.info(f"[AUTH] Password reset requested for {password_reset.email}")
        
        # I produktion returnerar vi inte token, men för utvecklingsändamål kan vi göra det
        if settings.ENVIRONMENT == "development":
            return {
                "message": "Om e-postadressen finns registrerad, har ett återställningsmail skickats.",
                "reset_token": reset_token,  # Endast i utvecklingsmiljö
                "reset_url": reset_url       # Endast i utvecklingsmiljö
            }
        
        return {"message": "Om e-postadressen finns registrerad, har ett återställningsmail skickats."}
    except Exception as e:
        logger.error(f"[AUTH] Password reset error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ett fel uppstod vid begäran om lösenordsåterställning"
        )

@router.post("/reset-password")
async def reset_password(request_data: ResetPasswordRequest):
    """
    Återställ lösenord med token
    """
    try:
        database = await db.get_database()
        users_collection = database["users"]
        
        # Verifiera att lösenorden matchar
        if request_data.new_password != request_data.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lösenorden matchar inte"
            )
        
        # Validera token
        try:
            payload = jwt.decode(
                request_data.token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            username = payload.get("sub")
            token_type = payload.get("type")
            
            if not username or token_type != "password_reset":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ogiltig återställningstoken"
                )
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ogiltig eller utgången återställningstoken"
            )
        
        # Hitta användaren
        user = await users_collection.find_one({"username": username})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Användaren hittades inte"
            )
        
        # Uppdatera lösenordet
        hashed_password = get_password_hash(request_data.new_password)
        result = await users_collection.update_one(
            {"username": username},
            {"$set": {
                "hashed_password": hashed_password,
                "password_last_changed": datetime.now(timezone.utc)
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Lösenordet kunde inte uppdateras"
            )
        
        # Skicka e-post om lösenordsändring
        try:
            EmailService.send_password_changed_notification(
                recipient_email=user.get("email"),
                username=username
            )
        except Exception as e:
            logger.error(f"[AUTH] Failed to send password changed notification: {str(e)}")
        
        logger.info(f"[AUTH] Password reset for user {username}")
        return {"message": "Lösenordet har återställts"}
    
    except HTTPException:
        # Vidarebefordra HTTP-undantag
        raise
    except Exception as e:
        logger.error(f"[AUTH] Password reset error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ett fel uppstod vid återställning av lösenordet"
        )

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

@router.post("/refresh", response_model=Token)
async def refresh_token(current_user: UserInDB = Depends(get_current_active_user)):
    """
    Förnya access token för inloggad användare
    """
    logger.info(f"[AUTH] Refreshing token for user: {current_user.username}")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=current_user.username,
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@router.post("/logout")
async def logout(current_user: UserInDB = Depends(get_current_active_user)):
    """
    Logga ut användaren
    """
    logger.info(f"[AUTH] Logging out user: {current_user.username}")
    # I en mer komplett implementation skulle vi här kunna:
    # 1. Invalidera tokens
    # 2. Rensa sessioner
    # 3. Uppdatera last_logout i databasen
    return {"message": "Successfully logged out"}
