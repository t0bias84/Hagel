# forum_happenings.py

from datetime import datetime
from typing import Optional, List
from bson import ObjectId
from fastapi import (
    APIRouter,
    HTTPException,
    Depends,
    status,
    Body
)

# Dina hjälp-filer för DB, auth etc.
from app.db.mongodb import db
from app.api.routes.auth import get_current_active_user, UserInDB

router = APIRouter()

#################################################################
# 1) Prenumeration på trådar & kategorier
#################################################################

@router.post("/threads/{thread_id}/subscribe")
async def subscribe_thread(
    thread_id: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Användare prenumererar (följer) en enskild tråd.
    Detta innebär att användaren ska få notiser om nya poster i tråden.
    """
    database = await db.get_database()

    # Validera thread_id
    if not ObjectId.is_valid(thread_id):
        raise HTTPException(400, "Ogiltigt thread_id-format")

    # Kolla om tråden finns
    thread_doc = await database.threads.find_one({"_id": ObjectId(thread_id)})
    if not thread_doc:
        raise HTTPException(404, "Tråden finns inte.")

    # Kolla om användaren redan följer
    existing_sub = await database.thread_subscriptions.find_one({
        "thread_id": thread_id,
        "user_id": current_user.username
    })
    if existing_sub:
        return {"message": "Du följer redan denna tråd."}

    # Annars skapa sub
    sub_doc = {
        "thread_id": thread_id,
        "user_id": current_user.username,  # eller user_id i DB
        "created_at": datetime.utcnow()
    }
    await database.thread_subscriptions.insert_one(sub_doc)

    return {"message": "Du följer nu tråden."}


@router.delete("/threads/{thread_id}/subscribe")
async def unsubscribe_thread(
    thread_id: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Avsluta prenumeration (sluta följa) en tråd.
    """
    database = await db.get_database()

    if not ObjectId.is_valid(thread_id):
        raise HTTPException(400, "Ogiltigt thread_id-format")

    res = await database.thread_subscriptions.delete_one({
        "thread_id": thread_id,
        "user_id": current_user.username
    })
    if res.deleted_count == 0:
        raise HTTPException(404, "Du följer inte denna tråd eller den finns inte.")
    return {"message": "Du följer inte längre tråden."}


@router.post("/categories/{category_id}/subscribe")
async def subscribe_category(
    category_id: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Prenumerera på en kategori. Då får man t.ex. notis när en ny tråd skapas i kategorin.
    """
    database = await db.get_database()

    # Kolla om Kategori finns
    if not ObjectId.is_valid(category_id):
        raise HTTPException(400, "Ogiltigt category_id-format")
    category_doc = await database.categories.find_one({"_id": ObjectId(category_id)})
    if not category_doc:
        raise HTTPException(404, "Kategorin finns inte.")

    # Kolla om redan sub
    existing_sub = await database.category_subscriptions.find_one({
        "category_id": category_id,
        "user_id": current_user.username
    })
    if existing_sub:
        return {"message": "Du följer redan kategorin."}

    sub_doc = {
        "category_id": category_id,
        "user_id": current_user.username,
        "created_at": datetime.utcnow()
    }
    await database.category_subscriptions.insert_one(sub_doc)
    return {"message": "Du följer nu kategorin."}


@router.delete("/categories/{category_id}/subscribe")
async def unsubscribe_category(
    category_id: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Avsluta prenumeration på en kategori."""
    database = await db.get_database()

    if not ObjectId.is_valid(category_id):
        raise HTTPException(400, "Ogiltigt category_id-format")

    res = await database.category_subscriptions.delete_one({
        "category_id": category_id,
        "user_id": current_user.username
    })
    if res.deleted_count == 0:
        raise HTTPException(404, "Du följer inte denna kategori eller den finns inte.")
    return {"message": "Du följer inte längre kategorin."}


#################################################################
# 2) Rapportering / anmälan av olämpligt innehåll
#################################################################

@router.post("/report")
async def report_content(
    object_type: str = Body(...),
    object_id: str = Body(...),
    reason: str = Body(...),
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Anmäl en tråd eller ett inlägg som olämpligt. 
    object_type: "thread" eller "post"
    object_id:   str, ex. thread_id eller post_id
    reason:      str, orsak/beskrivning av anmälan
    """
    if object_type not in ["thread", "post"]:
        raise HTTPException(400, "object_type måste vara 'thread' eller 'post'")

    database = await db.get_database()

    if not ObjectId.is_valid(object_id):
        raise HTTPException(400, "Ogiltigt ID-format")

    # Kolla om objektet finns
    if object_type == "thread":
        found = await database.threads.find_one({"_id": ObjectId(object_id)})
    else:
        found = await database.posts.find_one({"_id": ObjectId(object_id)})

    if not found:
        raise HTTPException(404, "Objektet du försöker anmäla finns inte.")

    # Spara report
    report_doc = {
        "reporting_user": current_user.username,
        "object_type": object_type,
        "object_id": object_id,
        "reason": reason.strip(),
        "created_at": datetime.utcnow(),
        "status": "pending"  # "pending", "reviewed", "closed" ...
    }
    await database.reports.insert_one(report_doc)
    return {"message": "Anmälan har sparats och kommer granskas av moderator."}


#################################################################
# 3) Reaktioner / gilla-markeringar
#################################################################

@router.post("/posts/{post_id}/react")
async def react_to_post(
    post_id: str,
    reaction: str = Body(..., example="like"),
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Reagera på ett inlägg med t.ex. "like", "heart", "laugh", "dislike", "wtf" etc.
    Spara i t.ex. posts_reactions-kollektionen.
    """
    database = await db.get_database()
    if not ObjectId.is_valid(post_id):
        raise HTTPException(400, "Ogiltigt post_id-format")

    # Kolla om post finns
    post_doc = await database.posts.find_one({"_id": ObjectId(post_id)})
    if not post_doc:
        raise HTTPException(404, "Inlägget finns ej")

    # Spara / uppdatera reaktion
    # Ex. key = { user_id, post_id }, value = reaction
    existing = await database.posts_reactions.find_one({
        "post_id": post_id,
        "user_id": current_user.username
    })
    if existing:
        # Om man klickar samma reaktion -> ta bort? Byt reaktion?
        if existing["reaction"] == reaction:
            # ta bort reaktionen
            await database.posts_reactions.delete_one({"_id": existing["_id"]})
            return {"message": "Reaktion återkallad (borttagen)."}
        else:
            # uppdatera reaktionen
            await database.posts_reactions.update_one(
                {"_id": existing["_id"]},
                {"$set": {"reaction": reaction}}
            )
            return {"message": f"Reaktion uppdaterad till {reaction}."}
    else:
        # skapa ny reaktion
        doc = {
            "post_id": post_id,
            "user_id": current_user.username,
            "reaction": reaction,
            "created_at": datetime.utcnow()
        }
        await database.posts_reactions.insert_one(doc)
        return {"message": f"Reaktion '{reaction}' tillagd."}


#################################################################
# 4) Notifierings-funktioner (anropas från forum_threads, t.ex.)
#################################################################

async def notify_new_thread_in_category(category_id: str, thread_id: str, author_id: str):
    """
    Intern hjälpfunktion som kallas när en ny tråd skapas i en kategori.
    Skickar notiser till alla som följer kategorin, utom den som skapade tråden.
    """
    db_conn = await db.get_database()

    cat_doc = await db_conn.categories.find_one({"_id": ObjectId(category_id)})
    if not cat_doc:
        return

    # Hämta alla subscriptions på kategorin
    subs = await db_conn.category_subscriptions.find({"category_id": category_id}).to_list(None)
    user_ids = [s["user_id"] for s in subs if s["user_id"] != author_id]

    # Hämta tråd (för titel)
    thread_doc = await db_conn.threads.find_one({"_id": ObjectId(thread_id)})
    if not thread_doc:
        return

    # Skapa notiser
    for uid in set(user_ids):
        await db_conn.notifications.insert_one({
            "user_id": uid,
            "message": f"Ny tråd i kategorin '{cat_doc['name']}': {thread_doc['title']}",
            "type": "new_thread_in_category",
            "object_id": thread_id,
            "created_at": datetime.utcnow(),
            "read": False
        })


async def notify_new_post_in_thread(thread_id: str, post_author: str):
    """
    Intern hjälpfunktion som kallas när en ny post skapas i en tråd.
    Skickar notiser till alla som följer tråden, samt ev. trådskaparen om denne inte redan följer.
    """
    db_conn = await db.get_database()

    # Hämta tråd => kolla trådskapare
    thread_doc = await db_conn.threads.find_one({"_id": ObjectId(thread_id)})
    if not thread_doc:
        return  # om tråden inte finns – avbryt

    # 1) Hämta alla subscriptions
    subs = await db_conn.thread_subscriptions.find({"thread_id": thread_id}).to_list(None)
    subscribers = [s["user_id"] for s in subs if s["user_id"] != post_author]

    # 2) Skapa notis => /notifications
    for uid in set(subscribers):
        await db_conn.notifications.insert_one({
            "user_id": uid,
            "message": f"Nytt inlägg i tråden '{thread_doc['title']}'",
            "type": "thread_reply",
            "object_id": thread_id,
            "created_at": datetime.utcnow(),
            "read": False
        })

    # 3) Trådskaparen
    thread_owner = thread_doc["author_id"]
    if thread_owner != post_author and thread_owner not in subscribers:
        await db_conn.notifications.insert_one({
            "user_id": thread_owner,
            "message": f"Någon svarade i din tråd '{thread_doc['title']}'",
            "type": "thread_reply",
            "object_id": thread_id,
            "created_at": datetime.utcnow(),
            "read": False
        })


async def notify_mention_in_post(post_id: str, mention_username: str, from_user: str):
    """
    Intern hjälpfunktion anropas om man hittar en @username i texten.
    Skickar notis om man @-taggat (mention) någon i sitt inlägg.
    """
    db_conn = await db.get_database()

    # Kolla om mention_username finns i users
    user_doc = await db_conn.users.find_one({"username": mention_username})
    if not user_doc:
        return  # Om user inte finns, gör inget.

    # Kolla post => thread => ev. thread_title
    post_doc = await db_conn.posts.find_one({"_id": ObjectId(post_id)})
    if not post_doc:
        return
    thread_doc = await db_conn.threads.find_one({"_id": ObjectId(post_doc["thread_id"])})
    thread_title = thread_doc["title"] if thread_doc else "okänd"

    # Spara notis
    await db_conn.notifications.insert_one({
        "user_id": mention_username,
        "message": f"@{from_user} nämnde dig i tråden '{thread_title}'",
        "type": "mention",
        "object_id": str(post_id),
        "created_at": datetime.utcnow(),
        "read": False
    })


#################################################################
# 5) Admin-funktioner: pin/låsa trådar (exempel)
#################################################################

@router.post("/threads/{thread_id}/pin")
async def pin_thread(
    thread_id: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Sätt en tråd som "pinned" (klistrad högst upp).
    Kräver admin-behörighet, ex. att current_user.roles innehåller "admin".
    """
    if "admin" not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Endast admin kan göra detta.")

    db_conn = await db.get_database()
    if not ObjectId.is_valid(thread_id):
        raise HTTPException(400, "Ogiltigt thread_id-format")

    updated = await db_conn.threads.find_one_and_update(
        {"_id": ObjectId(thread_id)},
        {"$set": {"pinned": True}},
        return_document=True
    )
    if not updated:
        raise HTTPException(404, "Tråden hittades inte.")
    return {"message": f"Tråd '{updated['title']}' är nu pin:ad."}


@router.post("/threads/{thread_id}/unpin")
async def unpin_thread(
    thread_id: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Ta bort 'pin' på en tråd."""
    if "admin" not in (current_user.roles or []):
        raise HTTPException(403, detail="Endast admin kan göra detta.")

    db_conn = await db.get_database()
    if not ObjectId.is_valid(thread_id):
        raise HTTPException(400, "Ogiltigt thread_id-format")

    updated = await db_conn.threads.find_one_and_update(
        {"_id": ObjectId(thread_id)},
        {"$set": {"pinned": False}},
        return_document=True
    )
    if not updated:
        raise HTTPException(404, "Tråden hittades inte.")
    return {"message": f"Tråd '{updated['title']}' är inte längre pin:ad."}


@router.post("/threads/{thread_id}/lock")
async def lock_thread(
    thread_id: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Lås en tråd, vilket kan innebära att man inte kan posta nya inlägg.
    Du bestämmer i forum_threads.py att create_post_in_thread slår fel om tråd=locked.
    """
    if "admin" not in (current_user.roles or []):
        raise HTTPException(403, detail="Endast admin kan göra detta.")

    db_conn = await db.get_database()
    if not ObjectId.is_valid(thread_id):
        raise HTTPException(400, "Ogiltigt thread_id-format")

    updated = await db_conn.threads.find_one_and_update(
        {"_id": ObjectId(thread_id)},
        {"$set": {"locked": True}},
        return_document=True
    )
    if not updated:
        raise HTTPException(404, "Tråden hittades inte.")
    return {"message": f"Tråd '{updated['title']}' är nu låst för nya inlägg."}


@router.post("/threads/{thread_id}/unlock")
async def unlock_thread(
    thread_id: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Lås upp en tidigare låst tråd."""
    if "admin" not in (current_user.roles or []):
        raise HTTPException(403, detail="Endast admin kan göra detta.")

    db_conn = await db.get_database()
    if not ObjectId.is_valid(thread_id):
        raise HTTPException(400, "Ogiltigt thread_id-format")

    updated = await db_conn.threads.find_one_and_update(
        {"_id": ObjectId(thread_id)},
        {"$set": {"locked": False}},
        return_document=True
    )
    if not updated:
        raise HTTPException(404, "Tråden hittades inte.")
    return {"message": f"Tråd '{updated['title']}' är upplåst."}

