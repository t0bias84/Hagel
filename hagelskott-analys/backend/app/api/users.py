from fastapi import APIRouter, Depends, HTTPException
from typing import List
from bson import ObjectId

from app.db.mongodb import db
from app.api.routes.auth import get_current_active_user, UserInDB

router = APIRouter(
    tags=["Users"],
)

@router.get("/users", response_model=List[dict])
async def get_users(current_user: UserInDB = Depends(get_current_active_user)):
    """
    Hämta alla användare (kräver admin-rättigheter).
    """
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        database = await db.get_database()
        users = await database.users.find().to_list(None)
        
        # Konvertera ObjectId till str och ta bort känslig information
        for user in users:
            user["_id"] = str(user["_id"])
            if "password" in user:
                del user["password"]
        
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 