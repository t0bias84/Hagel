from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.core.roles import UserRole, has_permission
from app.api.routes.auth import get_current_active_user, User
from app.db.mongodb import db
from bson import ObjectId
from pydantic import BaseModel

router = APIRouter()

# ---------------- Pydantic-modeller ----------------
class RoleUpdate(BaseModel):
    role: str

class StatusUpdate(BaseModel):
    disabled: bool

async def get_current_admin(current_user: User = Depends(get_current_active_user)):
    if not has_permission(current_user.roles, "manage_users"):
        raise HTTPException(
            status_code=403,
            detail="Du har inte behörighet att utföra denna åtgärd"
        )
    return current_user

@router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_admin)):
    """Hämta alla användare (endast för admins)"""
    try:
        database = await db.get_database()
        users_collection = database["users"]
        users = await users_collection.find().to_list(length=100)
        
        return [
            User(
                id=str(user["_id"]),
                username=user["username"],
                email=user.get("email"),
                full_name=user.get("full_name"),
                disabled=user.get("disabled", False),
                roles=user.get("roles", [UserRole.USER]),
                created_at=user.get("created_at")
            ) for user in users
        ]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Kunde inte hämta användare: {str(e)}"
        )

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role_update: RoleUpdate,
    current_user: User = Depends(get_current_admin)
):
    """Uppdatera en användares roll (endast för admins)"""
    try:
        database = await db.get_database()
        users_collection = database["users"]
        
        # Kontrollera att användaren finns
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="Användaren hittades inte")
        
        # Konvertera rollen till lowercase för att matcha backend
        role = role_update.role.lower()
        
        # Validera att rollen är giltig
        valid_roles = ["user", "elder", "admin"]
        if role not in valid_roles:
            raise HTTPException(status_code=400, detail="Ogiltig roll")
        
        # Uppdatera rollen
        await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"roles": [role]}}
        )
        
        return {"message": "Användarroll uppdaterad"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Kunde inte uppdatera användarroll: {str(e)}"
        )

@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    status_update: StatusUpdate,
    current_user: User = Depends(get_current_admin)
):
    """Aktivera/inaktivera en användare (endast för admins)"""
    try:
        database = await db.get_database()
        users_collection = database["users"]
        
        # Kontrollera att användaren finns
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="Användaren hittades inte")
        
        # Uppdatera status
        await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"disabled": status_update.disabled}}
        )
        
        return {"message": "Användarstatus uppdaterad"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Kunde inte uppdatera användarstatus: {str(e)}"
        ) 