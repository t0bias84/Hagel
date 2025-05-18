from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from app.db.mongodb import db
from app.api.routes.auth import get_current_active_user
from bson import ObjectId

router = APIRouter()

class FriendRequest(BaseModel):
    from_user: str
    to_user: str
    status: str = "pending"  # pending, accepted, rejected
    created_at: datetime = datetime.utcnow()
    updated_at: Optional[datetime] = None

class Message(BaseModel):
    from_user: str
    to_user: str
    content: str
    read: bool = False
    created_at: datetime = datetime.utcnow()

@router.post("/friend-request")
async def send_friend_request(to_username: str, current_user = Depends(get_current_active_user)):
    try:
        database = await db.get_database()
        friend_requests = database["friend_requests"]
        users = database["users"]
        settings = database["user_settings"]

        # Kontrollera om mottagaren existerar
        to_user = await users.find_one({"username": to_username})
        if not to_user:
            raise HTTPException(status_code=404, detail="Användaren hittades inte")

        # Kontrollera mottagarens inställningar
        user_settings = await settings.find_one({"username": to_username})
        if user_settings and not user_settings.get("social", {}).get("allowFriendRequests", True):
            raise HTTPException(status_code=403, detail="Användaren tar inte emot vänförfrågningar")

        # Kontrollera om förfrågan redan finns
        existing = await friend_requests.find_one({
            "from_user": current_user.username,
            "to_user": to_username,
            "status": "pending"
        })
        if existing:
            raise HTTPException(status_code=400, detail="Vänförfrågan finns redan")

        # Skapa ny förfrågan
        request = FriendRequest(
            from_user=current_user.username,
            to_user=to_username
        )
        await friend_requests.insert_one(request.dict())
        return {"message": "Vänförfrågan skickad"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/friend-requests")
async def get_friend_requests(current_user = Depends(get_current_active_user)):
    try:
        database = await db.get_database()
        friend_requests = database["friend_requests"]
        
        # Hämta både inkommande och utgående förfrågningar
        requests = await friend_requests.find({
            "$or": [
                {"to_user": current_user.username},
                {"from_user": current_user.username}
            ]
        }).to_list(length=None)
        
        return requests
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/friend-request/{request_id}/respond")
async def respond_to_friend_request(
    request_id: str,
    accept: bool,
    current_user = Depends(get_current_active_user)
):
    try:
        database = await db.get_database()
        friend_requests = database["friend_requests"]
        
        request = await friend_requests.find_one({"_id": ObjectId(request_id)})
        if not request:
            raise HTTPException(status_code=404, detail="Vänförfrågan hittades inte")
            
        if request["to_user"] != current_user.username:
            raise HTTPException(status_code=403, detail="Inte behörig att svara på denna förfrågan")
            
        status = "accepted" if accept else "rejected"
        await friend_requests.update_one(
            {"_id": ObjectId(request_id)},
            {
                "$set": {
                    "status": status,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {"message": f"Vänförfrågan {status}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/message")
async def send_message(to_username: str, content: str, current_user = Depends(get_current_active_user)):
    try:
        database = await db.get_database()
        messages = database["messages"]
        users = database["users"]
        settings = database["user_settings"]

        # Kontrollera om mottagaren existerar
        to_user = await users.find_one({"username": to_username})
        if not to_user:
            raise HTTPException(status_code=404, detail="Användaren hittades inte")

        # Kontrollera mottagarens inställningar
        user_settings = await settings.find_one({"username": to_username})
        if user_settings and not user_settings.get("social", {}).get("allowMessages", True):
            raise HTTPException(status_code=403, detail="Användaren tar inte emot meddelanden")

        # Skapa nytt meddelande
        message = Message(
            from_user=current_user.username,
            to_user=to_username,
            content=content
        )
        await messages.insert_one(message.dict())
        return {"message": "Meddelande skickat"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/messages")
async def get_messages(current_user = Depends(get_current_active_user)):
    try:
        database = await db.get_database()
        messages = database["messages"]
        
        # Hämta både skickade och mottagna meddelanden
        user_messages = await messages.find({
            "$or": [
                {"to_user": current_user.username},
                {"from_user": current_user.username}
            ]
        }).sort("created_at", -1).to_list(length=None)
        
        return user_messages
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/message/{message_id}/read")
async def mark_message_as_read(message_id: str, current_user = Depends(get_current_active_user)):
    try:
        database = await db.get_database()
        messages = database["messages"]
        
        message = await messages.find_one({"_id": ObjectId(message_id)})
        if not message:
            raise HTTPException(status_code=404, detail="Meddelande hittades inte")
            
        if message["to_user"] != current_user.username:
            raise HTTPException(status_code=403, detail="Inte behörig att markera detta meddelande som läst")
            
        await messages.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {"read": True}}
        )
        
        return {"message": "Meddelande markerat som läst"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 