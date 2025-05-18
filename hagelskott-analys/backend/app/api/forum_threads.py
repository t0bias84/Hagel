import datetime
import os
from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import logging
from datetime import timedelta

from app.db.mongodb import db
from app.models.forum_thread import ForumThread
from app.models.user import User
from app.utils.forum_utils import generate_english_name, upload_file
from app.api.routes.auth import get_current_user, get_current_active_user, UserInDB

# Konfigurera logger
logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Forum Threads"],
)

# Pydantic models
class ThreadCreateModel(BaseModel):
    """Used if you want to POST raw JSON to create a thread."""
    title: str
    content: str
    author_id: str

class ThreadUpdateModel(BaseModel):
    """For PUT/patch updates of a thread."""
    title: Optional[str] = None
    content: Optional[str] = None

class ThreadResponse(BaseModel):
    """Returned when getting or listing threads."""
    id: str
    title: str
    content: str
    author_id: str
    category_id: str
    created_at: datetime
    updated_at: datetime
    views: int
    
    model_config = {
        "arbitrary_types_allowed": True
    }

class PostCreateModel(BaseModel):
    """Used to create posts via JSON body."""
    content: str
    author_id: str

class PostUpdateModel(BaseModel):
    """For PUT/patch of existing post."""
    content: Optional[str] = None

class PostResponse(BaseModel):
    """Returned when getting or listing posts."""
    id: str
    content: str
    author_id: str
    thread_id: str
    created_at: datetime
    updated_at: datetime
    # If you want to return reactions in the response:
    # reactions: Optional[List[dict]] = None
    
    model_config = {
        "arbitrary_types_allowed": True
    }

class ReactionModel(BaseModel):
    """Used to submit reactions (emoji or text)."""
    user_id: str
    reaction: str  # e.g. "👍", "wtf", "❤️" etc.

@router.get("/threads", response_description="List all forum threads")
async def get_threads(
    limit: int = 50,
    skip: int = 0,
    category_id: Optional[str] = None,
):
    """
    Get all forum threads with optional filtering by category.
    """
    database = await db.get_database()
    query = {}
    if category_id:
        query["category_id"] = category_id

    # Sort threads by created_at in descending order
    cursor = database.threads.find(query).sort("created_at", -1).skip(skip).limit(limit)
    threads = []
    
    for thread in await cursor.to_list(length=limit):
        # Get category info
        category = await database.categories.find_one({"_id": ObjectId(thread["category_id"])})
        
        # Get author info
        author = await database.users.find_one({"_id": ObjectId(thread["author_id"])})
        author_name = author["username"] if author else "Unknown User"
        
        # Get post count
        post_count = await database.posts.count_documents({"thread_id": str(thread["_id"])})
        
        thread_obj = {
            "id": str(thread["_id"]),
            "title": thread["title"],
            "category_id": thread["category_id"],
            "category_name": category["name"] if category else "Unknown Category",
            "category_english_name": category.get("english_name", "") if category else "",
            "author_id": thread["author_id"],
            "author_name": author_name,
            "created_at": thread["created_at"],
            "updated_at": thread["updated_at"],
            "post_count": post_count,
            "views": thread.get("views", 0),
            "last_activity": thread.get("last_activity", thread["created_at"]),
        }
        threads.append(thread_obj)
    
    return threads

@router.post("/categories/{category_id}/threads", response_model=ThreadResponse)
async def create_thread(
    category_id: str,
    title: str = Form(...),
    content: str = Form(...),
    author_id: str = Form(...),
    attachments: List[UploadFile] = File([])  # ev. bifogade filer
):
    """
    Skapa en ny tråd (i en viss kategori) via form-data.
    Om du vill spara bilagor i DB eller på disk – anpassa koden nedan.
    """
    db_conn = await db.get_database()

    # 1) Kolla category_id
    if not ObjectId.is_valid(category_id):
        raise HTTPException(status_code=400, detail="Ogiltigt category_id-format")

    cat_doc = await db_conn.categories.find_one({"_id": ObjectId(category_id)})
    if not cat_doc:
        raise HTTPException(status_code=404, detail="Kategorin hittades inte")

    # 2) Validera title/content/author
    if not title.strip():
        raise HTTPException(status_code=400, detail="Titel får ej vara tom.")
    if not content.strip():
        raise HTTPException(status_code=400, detail="Innehåll får ej vara tomt.")
    if not author_id.strip():
        raise HTTPException(status_code=400, detail="author_id får ej vara tomt.")

    # 3) Bygg tråd-dokument
    now = datetime.datetime.utcnow()
    thread_data = {
        "title": title.strip(),
        "content": content.strip(),
        "author_id": author_id.strip(),
        "category_id": category_id.strip(),
        "created_at": now,
        "updated_at": now,
        "views": 0,
        "last_activity": now,
    }

    # 4) Infoga i DB
    res = await db_conn.threads.insert_one(thread_data)
    if not res.acknowledged:
        raise HTTPException(status_code=500, detail="Kunde inte skapa tråd i databasen.")

    # 5) Spara ev. bifogade filer
    #    (HÄR bestämmer du hur du vill hantera filerna)
    # for file in attachments:
    #    content_bytes = await file.read()
    #    filename = file.filename
    #    # Spara i en 'uploads' collection eller på disk, etc.

    thread_data["id"] = str(res.inserted_id)
    return ThreadResponse(
        **thread_data,
        views=thread_data["views"]
    )

@router.get("/threads/{thread_id}", response_description="Get a single thread")
async def get_thread(
    thread_id: str,
):
    """
    Get a single thread by ID and increment view count.
    """
    database = await db.get_database()
    if not ObjectId.is_valid(thread_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid thread ID")

    # Increment views
    thread = await database.threads.find_one_and_update(
        {"_id": ObjectId(thread_id)},
        {"$inc": {"views": 1}},
        return_document=True
    )
    
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    
    # Get category info
    category = await database.categories.find_one({"_id": ObjectId(thread["category_id"])})
    
    # Get author info
    author = await database.users.find_one({"_id": ObjectId(thread["author_id"])})
    
    # Get first post content
    first_post = await database.posts.find_one(
        {"thread_id": thread_id},
        sort=[("created_at", 1)]
    )
    
    return {
        "id": str(thread["_id"]),
        "title": thread["title"],
        "category_id": thread["category_id"],
        "category_name": category["name"] if category else "Unknown Category",
        "category_english_name": category.get("english_name", "") if category else "",
        "author_id": thread["author_id"],
        "author_name": author["username"] if author else "Unknown User",
        "content": first_post["content"] if first_post else "",
        "created_at": thread["created_at"],
        "updated_at": thread["updated_at"],
        "views": thread["views"],
        "last_activity": thread.get("last_activity", thread["created_at"]),
    }

@router.put("/threads/{thread_id}", response_description="Update a thread")
async def update_thread(
    thread_id: str,
    updates: ThreadUpdateModel,
    current_user = Depends(get_current_active_user),
):
    """
    Update an existing thread title or content.
    """
    database = await db.get_database()
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    if not ObjectId.is_valid(thread_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid thread ID")
    
    # Check if thread exists and user is the author
    thread = await database.threads.find_one({"_id": ObjectId(thread_id)})
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    
    if thread["author_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this thread")
    
    # Prepare update data
    update_data = {}
    if updates.title is not None:
        update_data["title"] = updates.title

    if updates.content is not None:
        # Update the first post content
        first_post = await database.posts.find_one(
            {"thread_id": thread_id},
            sort=[("created_at", 1)]
        )
        if first_post:
            await database.posts.update_one(
                {"_id": first_post["_id"]},
                {"$set": {"content": updates.content, "updated_at": datetime.datetime.utcnow()}}
            )
    
    if update_data:
        update_data["updated_at"] = datetime.datetime.utcnow()
        await database.threads.update_one(
        {"_id": ObjectId(thread_id)},
            {"$set": update_data}
        )
    
    # Get updated thread
    updated_thread = await database.threads.find_one({"_id": ObjectId(thread_id)})
    
    return {
        "id": str(updated_thread["_id"]),
        "title": updated_thread["title"],
        "updated_at": updated_thread["updated_at"],
    }

@router.delete("/threads/{thread_id}", response_description="Delete a thread")
async def delete_thread(
    thread_id: str,
    current_user = Depends(get_current_active_user),
):
    """
    Delete a thread and all its posts.
    """
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    if not ObjectId.is_valid(thread_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid thread ID")
    
    # Check if thread exists and user is the author
    thread = await db.threads.find_one({"_id": ObjectId(thread_id)})
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    
    if thread["author_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this thread")
    
    # Delete all posts in the thread
    await db.posts.delete_many({"thread_id": thread_id})
    
    # Delete the thread
    await db.threads.delete_one({"_id": ObjectId(thread_id)})
    
    return {"message": "Thread and all its posts deleted successfully"}

@router.get("/threads/{thread_id}/posts", response_description="Get posts in a thread")
async def get_posts(
    thread_id: str,
    skip: int = 0,
    limit: int = 50,
):
    """
    Get all posts in a thread.
    """
    if not ObjectId.is_valid(thread_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid thread ID")
    
    # Check if thread exists
    thread = await db.threads.find_one({"_id": ObjectId(thread_id)})
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    
    cursor = db.posts.find({"thread_id": thread_id}).sort("created_at", 1).skip(skip).limit(limit)
    posts = []
    
    for post in await cursor.to_list(length=limit):
        # Get author info
        author = await db.users.find_one({"_id": ObjectId(post["author_id"])})
        
        post_obj = {
            "id": str(post["_id"]),
            "content": post["content"],
            "author_id": post["author_id"],
            "author_name": author["username"] if author else "Unknown User",
            "created_at": post["created_at"],
            "updated_at": post["updated_at"],
            "attachments": post.get("attachments", []),
        }
        posts.append(post_obj)
    
    return posts

@router.post("/threads/{thread_id}/posts", response_description="Create a new post")
async def create_post(
    thread_id: str,
    content: str = Form(...),
    files: List[UploadFile] = File([]),
    current_user = Depends(get_current_active_user),
):
    """
    Create a new post in a thread with optional file attachments.
    """
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    if not ObjectId.is_valid(thread_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid thread ID")
    
    # Check if thread exists
    thread = await db.threads.find_one({"_id": ObjectId(thread_id)})
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Content is required")
    
    # Create the post
    now = datetime.datetime.utcnow()
    post = {
        "thread_id": thread_id,
        "content": content,
        "author_id": str(current_user["_id"]),
        "created_at": now,
        "updated_at": now,
        "attachments": [],
    }
    
    # Handle file uploads if any
    if files:
        for file in files:
            if file.filename:
                file_path = await upload_file(file, "forum")
                if file_path:
                    post["attachments"].append({
                        "filename": file.filename,
                        "path": file_path,
                        "uploaded_at": now,
                    })
    
    # Insert post into database
    try:
        result = await db.posts.insert_one(post)
        post_id = str(result.inserted_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating post: {str(e)}"
        )
    
    # Update thread last_activity
    await db.threads.update_one(
        {"_id": ObjectId(thread_id)},
        {"$set": {"last_activity": now, "updated_at": now}}
    )
    
    return {"post_id": post_id}

@router.put("/posts/{post_id}", response_description="Update a post")
async def update_post(
    post_id: str,
    content: str = Form(...),
    current_user = Depends(get_current_active_user),
):
    """
    Update an existing post content.
    """
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    if not ObjectId.is_valid(post_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid post ID")
    
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Content is required")
    
    # Check if post exists and user is the author
    post = await db.posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    
    if post["author_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this post")
    
    # Update post
    now = datetime.datetime.utcnow()
    await db.posts.update_one(
        {"_id": ObjectId(post_id)},
        {"$set": {"content": content, "updated_at": now}}
    )
    
    # Update thread last_activity
    await db.threads.update_one(
        {"_id": ObjectId(post["thread_id"])},
        {"$set": {"last_activity": now, "updated_at": now}}
    )
    
    return {"message": "Post updated successfully"}

@router.delete("/posts/{post_id}", response_description="Delete a post")
async def delete_post(
    post_id: str,
    current_user = Depends(get_current_active_user),
):
    """
    Delete a post.
    """
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    if not ObjectId.is_valid(post_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid post ID")
    
    # Check if post exists and user is the author
    post = await db.posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    
    if post["author_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this post")
    
    # Delete post
    await db.posts.delete_one({"_id": ObjectId(post_id)})
    
    return {"message": "Post deleted successfully"}

@router.post("/posts/{post_id}/react", response_description="React to a post")
async def react_to_post(
    post_id: str,
    reaction: ReactionModel,
    current_user = Depends(get_current_active_user),
):
    """
    Add a reaction to a post.
    """
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    if not ObjectId.is_valid(post_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid post ID")
    
    # Check if post exists
    post = await db.posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    
    # Check if user already reacted
    existing_reaction = await db.forum_reactions.find_one({
        "post_id": post_id,
        "user_id": str(current_user["_id"]),
    })
    
    if existing_reaction:
        # Update existing reaction
        await db.forum_reactions.update_one(
            {"_id": existing_reaction["_id"]},
            {"$set": {"reaction": reaction.reaction, "updated_at": datetime.datetime.utcnow()}}
        )
        message = "Reaction updated"
    else:
        # Create new reaction
        new_reaction = {
            "post_id": post_id,
            "user_id": str(current_user["_id"]),
            "reaction": reaction.reaction,
            "created_at": datetime.datetime.utcnow(),
            "updated_at": datetime.datetime.utcnow(),
        }
        await db.forum_reactions.insert_one(new_reaction)
        message = "Reaction added"
    
    # Get count of reactions
    reaction_count = await db.forum_reactions.count_documents({"post_id": post_id})
    
    return {"message": message, "reaction_count": reaction_count}

@router.get("/hot", response_model=List[ThreadResponse])
async def get_hot_threads(
    limit: int = Query(5, ge=1, le=20)
):
    try:
        database = await db.get_database()
        
        # Hämta trådar från de senaste 7 dagarna
        cutoff_date = datetime.datetime.utcnow() - timedelta(days=7)
        
        # Hämta trådar och sortera efter antal svar
        cursor = database.threads.find({
            "created_at": {"$gte": cutoff_date}
        }).sort("reply_count", -1).limit(limit)
        
        threads = await cursor.to_list(length=limit)
        
        # Formatera svaret
        return [
            ThreadResponse(
                id=str(thread["_id"]),
                title=thread["title"],
                content=thread["content"],
                author_id=str(thread["author_id"]),
                category_id=str(thread["category_id"]),
                created_at=thread["created_at"],
                updated_at=thread["updated_at"],
                views=thread.get("views", 0)
            )
            for thread in threads
        ]
    except Exception as e:
        logger.error(f"Error fetching hot threads: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch hot threads")
