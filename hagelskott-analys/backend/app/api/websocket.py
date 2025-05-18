from fastapi import WebSocket, WebSocketDisconnect, Depends
from typing import Dict, List, Optional
from datetime import datetime
import json
from app.api.routes.auth import get_current_active_user, User
from app.db.mongodb import db

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_json(message)

    async def broadcast(self, message: dict):
        for connections in self.active_connections.values():
            for connection in connections:
                await connection.send_json(message)

manager = ConnectionManager()

async def get_websocket_user(websocket: WebSocket) -> Optional[User]:
    try:
        # Hämta token från query parameters
        token = websocket.query_params.get("token")
        if not token:
            return None
            
        # Validera token och hämta användare
        user = await get_current_active_user(token)
        return user
    except Exception:
        return None

async def handle_client_message(data: dict, user_id: str):
    """Hantera meddelanden från klienten"""
    try:
        message_type = data.get("type")
        if message_type == "message":
            # Spara meddelandet i databasen
            database = await db.get_database()
            messages_coll = database["messages"]
            
            message_data = {
                "from_user": user_id,
                "to_user": data.get("to_user"),
                "content": data.get("content"),
                "read": False,
                "created_at": datetime.utcnow()
            }
            
            await messages_coll.insert_one(message_data)
            
            # Skicka meddelandet till mottagaren
            await manager.send_personal_message(
                {
                    "type": "new_message",
                    "data": message_data
                },
                data.get("to_user")
            )
            
        elif message_type == "typing":
            # Skicka typing-indikator till mottagaren
            await manager.send_personal_message(
                {
                    "type": "typing",
                    "data": {
                        "user_id": user_id,
                        "typing": data.get("typing", False)
                    }
                },
                data.get("to_user")
            )
    except Exception as e:
        print(f"Error handling client message: {str(e)}")

async def notify_user(user_id: str, notification_type: str, data: dict):
    """Skicka notifikation till användare"""
    try:
        # Spara notifikationen i databasen
        database = await db.get_database()
        notifications_coll = database["notifications"]
        
        notification = {
            "user_id": user_id,
            "type": notification_type,
            "data": data,
            "read": False,
            "created_at": datetime.utcnow()
        }
        
        await notifications_coll.insert_one(notification)
        
        # Skicka realtidsnotifikation
        await manager.send_personal_message(
            {
                "type": "notification",
                "data": notification
            },
            user_id
        )
    except Exception as e:
        print(f"Error sending notification: {str(e)}")

async def websocket_endpoint(websocket: WebSocket):
    user = await get_websocket_user(websocket)
    if not user:
        await websocket.close(code=4001)
        return
        
    await manager.connect(websocket, user.username)
    
    try:
        while True:
            data = await websocket.receive_json()
            await handle_client_message(data, user.username)
    except WebSocketDisconnect:
        manager.disconnect(websocket, user.username)
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        manager.disconnect(websocket, user.username) 