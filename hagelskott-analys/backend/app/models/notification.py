from pydantic import BaseModel
from datetime import datetime

class Notification(BaseModel):
    id: str
    user_id: str
    message: str
    type: str
    read: bool
    created_at: datetime

    model_config = {
        "arbitrary_types_allowed": True
    }
