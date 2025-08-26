from datetime import datetime
from bson import ObjectId
import logging

from app.db.mongodb import db

logger = logging.getLogger(__name__)

# --- Notification Creation Functions ---

async def create_notification(user_id: str, message: str, notif_type: str, object_id: str):
    """
    Generic helper to create a notification document.
    """
    try:
        db_conn = await db.get_database()
        await db_conn.notifications.insert_one({
            "user_id": user_id,
            "message": message,
            "type": notif_type,
            "object_id": str(object_id),
            "created_at": datetime.utcnow(),
            "read": False
        })
        # Here you could also trigger a real-time push via WebSocket
    except Exception as e:
        logger.error(f"Failed to create notification: {e}")

# --- 'Loads' Related Notifications ---

async def notify_new_comment_on_load(load_id: str, commenter_username: str):
    """
    Notify the load owner about a new comment.
    """
    db_conn = await db.get_database()
    load = await db_conn.loads.find_one({"_id": ObjectId(load_id)})
    if not load:
        return

    load_owner_id = load.get("ownerId")
    # Don't notify the user if they comment on their own load
    if not load_owner_id or load_owner_id == commenter_username: # Assuming ownerId is username for now
        return

    message = f"@{commenter_username} commented on your load: '{load.get('name', 'Untitled')}'"
    await create_notification(load_owner_id, message, "new_comment_on_load", load_id)


async def notify_new_vote_on_load(load_id: str, voter_username: str, vote_type: str):
    """
    Notify the load owner about a new vote.
    """
    db_conn = await db.get_database()
    load = await db_conn.loads.find_one({"_id": ObjectId(load_id)})
    if not load:
        return

    load_owner_id = load.get("ownerId")
    # Don't notify the user if they vote on their own load
    if not load_owner_id or load_owner_id == voter_username:
        return

    vote_action = "upvoted" if vote_type == "up" else "downvoted"
    message = f"@{voter_username} {vote_action} your load: '{load.get('name', 'Untitled')}'"
    await create_notification(load_owner_id, message, "new_vote_on_load", load_id)


# --- Forum Related Notifications (Moved from forum_happenings.py) ---

async def notify_new_thread_in_category(category_id: str, thread_id: str, author_id: str):
    """
    Notify users who follow a category about a new thread.
    """
    db_conn = await db.get_database()
    # ... (Implementation can be moved here) ...

async def notify_new_post_in_thread(thread_id: str, post_author: str):
    """
    Notify users who follow a thread about a new reply.
    """
    db_conn = await db.get_database()
    # ... (Implementation can be moved here) ...

async def notify_mention_in_post(post_id: str, mention_username: str, from_user: str):
    """
    Notify a user who was mentioned in a post.
    """
    db_conn = await db.get_database()
    # ... (Implementation can be moved here) ...
