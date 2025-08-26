from pydantic import BaseModel
from datetime import datetime

class ForumPost(BaseModel):
    id: str
    title: str
    author: str
    content: str
    created_at: datetime
    replies: int

    model_config = {
        "arbitrary_types_allowed": True
    }
