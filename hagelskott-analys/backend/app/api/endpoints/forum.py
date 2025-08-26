import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query

from app.db.mongodb import db
from app.api.routes.auth import get_current_active_user, User

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/forum/recent")
async def get_recent_forum_posts():
    """
    Returnerar t.ex. de 5 senaste inläggen
    """
    try:
        database = await db.get_database()
        coll = database["forum_posts"]
        posts = await coll.find().sort([("created_at", -1)]).limit(5).to_list(length=5)
        return posts
    except Exception as e:
        logger.error(f"Error fetching forum posts: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte hämta senaste foruminlägg")

@router.get("/forum/mostliked")
async def get_most_liked_posts(
    week: bool = Query(False, description="Om true, returnera bara inlägg från senaste veckan"),
    current_user: User = Depends(get_current_active_user)
):
    try:
        database = await db.get_database()
        posts_coll = database["forum_posts"]

        # Skapa matchning för datum om week=True
        match_stage = {}
        if week:
            one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)
            match_stage = {"created_at": {"$gte": one_week_ago}}

        pipeline = [
            {"$match": match_stage},
            {"$sort": {"likes": -1}},
            {"$limit": 1}
        ]

        result = await posts_coll.aggregate(pipeline).to_list(length=1)
        if not result:
            return None

        post = result[0]
        return {
            "id": str(post["_id"]),
            "title": post.get("title", ""),
            "author": post.get("author", ""),
            "likeCount": post.get("likes", 0)
        }
    except Exception as e:
        logger.error(f"Error fetching most liked posts: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte hämta mest gillade inlägg")

@router.get("/forum/mostdisliked")
async def get_most_disliked_posts(
    week: bool = Query(False, description="Om true, returnera bara inlägg från senaste veckan"),
    current_user: User = Depends(get_current_active_user)
):
    try:
        database = await db.get_database()
        posts_coll = database["forum_posts"]

        # Skapa matchning för datum om week=True
        match_stage = {}
        if week:
            one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)
            match_stage = {"created_at": {"$gte": one_week_ago}}

        pipeline = [
            {"$match": match_stage},
            {"$sort": {"dislikes": -1}},
            {"$limit": 1}
        ]

        result = await posts_coll.aggregate(pipeline).to_list(length=1)
        if not result:
            return None

        post = result[0]
        return {
            "id": str(post["_id"]),
            "title": post.get("title", ""),
            "author": post.get("author", ""),
            "dislikeCount": post.get("dislikes", 0)
        }
    except Exception as e:
        logger.error(f"Error fetching most disliked posts: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte hämta mest ogillade inlägg")
