from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class ForumThread(BaseModel):
    """
    Model för en forumtråd.
    """
    id: Optional[str] = None
    title: str
    content: str
    author_id: str
    category_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    views: int = 0
    last_activity: Optional[datetime] = None 