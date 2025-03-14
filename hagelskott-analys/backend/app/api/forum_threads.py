from datetime import datetime
from typing import List, Optional
from bson import ObjectId

from fastapi import (
    APIRouter,
    HTTPException,
    status,
    Form,
    File,
    UploadFile,
    Depends
)
from pydantic import BaseModel

from app.db.mongodb import db  # Din DB-instans

router = APIRouter()

# ======================= Pydantic-modeller =======================

class ThreadCreateModel(BaseModel):
    """Används bara om du vill POST:a ren JSON för att skapa tråd."""
    title: str
    content: str
    author_id: str

class ThreadUpdateModel(BaseModel):
    """För PUT/patch-uppdateringar av tråd."""
    title: Optional[str] = None
    content: Optional[str] = None

class ThreadResponse(BaseModel):
    """Returneras när man hämtar eller listar trådar."""
    id: str
    title: str
    content: str
    author_id: str
    category_id: str
    created_at: datetime
    updated_at: datetime
    views: int

class PostCreateModel(BaseModel):
    """Används för att skapa inlägg via JSON body."""
    content: str
    author_id: str

class PostUpdateModel(BaseModel):
    """För PUT/patch av befintligt inlägg."""
    content: Optional[str] = None

class PostResponse(BaseModel):
    """Returneras när man hämtar/listar inlägg."""
    id: str
    content: str
    author_id: str
    thread_id: str
    created_at: datetime
    updated_at: datetime
    # Om du vill returnera reaktioner i svaret:
    # reactions: Optional[List[dict]] = None

# En liten modell för reaktion
class ReactionModel(BaseModel):
    """Används för att skicka in reaktioner (emoji eller text)."""
    user_id: str
    reaction: str  # t.ex. "👍", "bajs", "wtf", "❤️" osv.


# ================== TRÅDAR (THREADS) ==================

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
    thread_data = {
        "title": title.strip(),
        "content": content.strip(),
        "author_id": author_id.strip(),
        "category_id": category_id.strip(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "views": 0,
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
        created_at=thread_data["created_at"],
        updated_at=thread_data["updated_at"],
        views=thread_data["views"]
    )


@router.get("/categories/{category_id}/threads", response_model=List[ThreadResponse])
async def list_threads_in_category(category_id: str):
    """
    Lista trådar i en kategori.
    GET /api/forum/categories/{category_id}/threads
    """
    db_conn = await db.get_database()

    if not ObjectId.is_valid(category_id):
        raise HTTPException(status_code=400, detail="Ogiltigt category_id-format")
    # (ev. kolla om category finns, men valfritt)

    cursor = db_conn.threads.find({"category_id": category_id})
    docs = await cursor.to_list(None)

    results = []
    for t in docs:
        results.append(ThreadResponse(
            id=str(t["_id"]),
            title=t["title"],
            content=t["content"],
            author_id=t["author_id"],
            category_id=t["category_id"],
            created_at=t["created_at"],
            updated_at=t["updated_at"],
            views=t.get("views", 0)
        ))
    return results


@router.get("/threads/{thread_id}", response_model=ThreadResponse)
async def get_thread(thread_id: str):
    """
    Hämta en enskild tråd (utan inlägg).
    Inkrementerar "views" med 1 innan return.
    """
    if not ObjectId.is_valid(thread_id):
        raise HTTPException(status_code=400, detail="Ogiltigt tråd-ID-format.")

    db_conn = await db.get_database()
    # Öka views
    doc = await db_conn.threads.find_one_and_update(
        {"_id": ObjectId(thread_id)},
        {"$inc": {"views": 1}},
        return_document=True
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Tråden hittades inte")

    return ThreadResponse(
        id=str(doc["_id"]),
        title=doc["title"],
        content=doc["content"],
        author_id=doc["author_id"],
        category_id=doc["category_id"],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        views=doc.get("views", 0)
    )


@router.put("/threads/{thread_id}", response_model=ThreadResponse)
async def update_thread(thread_id: str, updates: ThreadUpdateModel):
    """
    Uppdatera en befintlig tråd (title/content).
    Body (JSON) ex: { "title": "...", "content": "..." }
    """
    if not ObjectId.is_valid(thread_id):
        raise HTTPException(status_code=400, detail="Ogiltigt tråd-ID-format.")

    db_conn = await db.get_database()

    to_set = {}
    if updates.title is not None:
        new_title = updates.title.strip()
        if not new_title:
            raise HTTPException(400, "Titel får ej vara tom.")
        to_set["title"] = new_title

    if updates.content is not None:
        new_content = updates.content.strip()
        if not new_content:
            raise HTTPException(400, "Content får ej vara tom.")
        to_set["content"] = new_content

    if not to_set:
        raise HTTPException(400, "Inga fält att uppdatera.")

    to_set["updated_at"] = datetime.utcnow()

    updated_doc = await db_conn.threads.find_one_and_update(
        {"_id": ObjectId(thread_id)},
        {"$set": to_set},
        return_document=True
    )
    if not updated_doc:
        raise HTTPException(404, "Tråden hittades inte.")

    return ThreadResponse(
        id=str(updated_doc["_id"]),
        title=updated_doc["title"],
        content=updated_doc["content"],
        author_id=updated_doc["author_id"],
        category_id=updated_doc["category_id"],
        created_at=updated_doc["created_at"],
        updated_at=updated_doc["updated_at"],
        views=updated_doc.get("views", 0)
    )


@router.delete("/threads/{thread_id}")
async def delete_thread(thread_id: str):
    """
    Radera en tråd + alla inlägg i den.
    """
    if not ObjectId.is_valid(thread_id):
        raise HTTPException(status_code=400, detail="Ogiltigt tråd-ID-format.")

    db_conn = await db.get_database()
    # Radera inlägg i tråden
    await db_conn.posts.delete_many({"thread_id": thread_id})

    res = await db_conn.threads.delete_one({"_id": ObjectId(thread_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tråden hittades inte.")
    return {"message": "Tråd raderad."}

# ================== INLÄGG (POSTS) ==================

@router.post("/threads/{thread_id}/posts", response_model=PostResponse)
async def create_post_in_thread(thread_id: str, post: PostCreateModel):
    """
    Skapa nytt inlägg i en tråd.
    Body (JSON): { "content": "...", "author_id": "..." }
    """
    if not ObjectId.is_valid(thread_id):
        raise HTTPException(400, "Ogiltigt tråd-ID-format.")
    if not post.content.strip():
        raise HTTPException(400, "Innehåll får ej vara tomt.")
    if not post.author_id.strip():
        raise HTTPException(400, "author_id får ej vara tomt.")

    db_conn = await db.get_database()

    # Kolla att tråden finns
    thread_doc = await db_conn.threads.find_one({"_id": ObjectId(thread_id)})
    if not thread_doc:
        raise HTTPException(404, "Tråden finns inte.")

    post_data = {
        "content": post.content.strip(),
        "author_id": post.author_id.strip(),
        "thread_id": thread_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        # Ex: array med reaktioner
        "reactions": []  # ex. [ { "user_id": "...", "reaction": "👍" }, ... ]
    }

    inserted = await db_conn.posts.insert_one(post_data)
    if not inserted.acknowledged:
        raise HTTPException(500, "Kunde inte skapa inlägg.")

    post_data["id"] = str(inserted.inserted_id)
    return PostResponse(
        id=post_data["id"],
        content=post_data["content"],
        author_id=post_data["author_id"],
        thread_id=post_data["thread_id"],
        created_at=post_data["created_at"],
        updated_at=post_data["updated_at"],
    )


@router.get("/threads/{thread_id}/posts", response_model=List[PostResponse])
async def list_posts_in_thread(thread_id: str):
    """
    Hämta alla inlägg i en tråd. Returnerar list[PostResponse].
    """
    if not ObjectId.is_valid(thread_id):
        raise HTTPException(400, "Ogiltigt tråd-ID-format.")

    db_conn = await db.get_database()
    cursor = db_conn.posts.find({"thread_id": thread_id}).sort("created_at", 1)
    docs = await cursor.to_list(None)

    results = []
    for p in docs:
        results.append(PostResponse(
            id=str(p["_id"]),
            content=p["content"],
            author_id=p["author_id"],
            thread_id=p["thread_id"],
            created_at=p["created_at"],
            updated_at=p["updated_at"],
        ))
    return results


@router.put("/threads/{thread_id}/posts/{post_id}", response_model=PostResponse)
async def update_post_in_thread(thread_id: str, post_id: str, updates: PostUpdateModel):
    """
    Uppdatera (PUT) ett befintligt inlägg.
    Body (JSON): { "content": "..." }
    """
    if not (ObjectId.is_valid(thread_id) and ObjectId.is_valid(post_id)):
        raise HTTPException(400, "Ogiltigt ID-format.")
    if updates.content is not None and not updates.content.strip():
        raise HTTPException(400, "Inläggets text får ej vara tom.")

    db_conn = await db.get_database()

    to_set = {}
    if updates.content is not None:
        to_set["content"] = updates.content.strip()
    if not to_set:
        raise HTTPException(400, "Inga fält att uppdatera.")

    to_set["updated_at"] = datetime.utcnow()

    updated_doc = await db_conn.posts.find_one_and_update(
        {"_id": ObjectId(post_id), "thread_id": thread_id},
        {"$set": to_set},
        return_document=True
    )
    if not updated_doc:
        raise HTTPException(404, "Inlägget hittades inte.")

    return PostResponse(
        id=str(updated_doc["_id"]),
        content=updated_doc["content"],
        author_id=updated_doc["author_id"],
        thread_id=updated_doc["thread_id"],
        created_at=updated_doc["created_at"],
        updated_at=updated_doc["updated_at"],
    )


@router.delete("/threads/{thread_id}/posts/{post_id}")
async def delete_post_in_thread(thread_id: str, post_id: str):
    """
    Radera ett inlägg i en tråd.
    """
    if not (ObjectId.is_valid(thread_id) and ObjectId.is_valid(post_id)):
        raise HTTPException(400, "Ogiltigt ID-format.")

    db_conn = await db.get_database()
    del_res = await db_conn.posts.delete_one({
        "_id": ObjectId(post_id),
        "thread_id": thread_id
    })
    if del_res.deleted_count == 0:
        raise HTTPException(404, "Inlägget hittades inte.")
    return {"message": "Inlägg raderat."}


# ================== REAKTIONER (REACTIONS) ==================

@router.post("/threads/{thread_id}/posts/{post_id}/react")
async def react_to_post(thread_id: str, post_id: str, reaction: ReactionModel):
    """
    POST /api/forum/threads/{thread_id}/posts/{post_id}/react

    Lägger till en reaktion (ex. "👍", "wtf") i postens `reactions`-array.
    Spara gärna tid & user_id i arrayen.
    """
    if not (ObjectId.is_valid(thread_id) and ObjectId.is_valid(post_id)):
        raise HTTPException(400, "Ogiltigt ID-format.")

    db_conn = await db.get_database()

    post_doc = await db_conn.posts.find_one({"_id": ObjectId(post_id), "thread_id": thread_id})
    if not post_doc:
        raise HTTPException(404, "Inlägget hittades inte.")

    # Bygg reaktions-objekt
    new_reaction = {
        "user_id": reaction.user_id,
        "reaction": reaction.reaction,
        "created_at": datetime.utcnow()
    }

    # Lägg in i arrayen
    updated = await db_conn.posts.find_one_and_update(
        {"_id": ObjectId(post_id), "thread_id": thread_id},
        {"$push": {"reactions": new_reaction}},
        return_document=True
    )
    if not updated:
        raise HTTPException(404, "Posten hittades ej vid uppdatering.")

    return {
        "message": "Reaktion sparad.",
        "post_id": str(updated["_id"]),
        "new_reactions_count": len(updated.get("reactions", []))
    }


# ================== CATEGORIES + COUNT ==================

@router.get("/categories-with-counts")
async def list_categories_with_counts():
    """
    Returnerar alla kategorier med threadCount, postCount.
    """
    db_conn = await db.get_database()
    cats_coll = db_conn.categories
    threads_coll = db_conn.threads
    posts_coll = db_conn.posts

    cats = await cats_coll.find({}).to_list(None)
    results = []

    for cat in cats:
        cat_id_str = str(cat["_id"])

        # Räkna trådar i denna kategori
        t_count = await threads_coll.count_documents({"category_id": cat_id_str})

        # Räkna inlägg
        post_count = 0
        t_cursor = threads_coll.find({"category_id": cat_id_str}, {"_id": 1})
        thread_ids = await t_cursor.to_list(None)
        for thr in thread_ids:
            thr_id_str = str(thr["_id"])
            n_posts = await posts_coll.count_documents({"thread_id": thr_id_str})
            post_count += n_posts

        # Konvertera
        cat["_id"] = cat_id_str
        if cat.get("parent_id"):
            cat["parent_id"] = str(cat["parent_id"])

        cat["threadCount"] = t_count
        cat["postCount"] = post_count
        results.append(cat)

    return results


# ================== NYA RUTTER: "HETA" OCH "KONTROVERSIELLA" ==================

@router.get("/hot", response_model=List[ThreadResponse])
async def get_hot_threads(limit: int = 10):
    """
    Returnera de mest 'heta' trådarna, sorterade på 'views' (fallande).
    Ex: GET /api/forum/hot?limit=10
    """
    db_conn = await db.get_database()
    cursor = db_conn.threads.find().sort("views", -1).limit(limit)
    docs = await cursor.to_list(None)

    results = []
    for doc in docs:
        results.append(ThreadResponse(
            id=str(doc["_id"]),
            title=doc["title"],
            content=doc["content"],
            author_id=doc["author_id"],
            category_id=doc["category_id"],
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
            views=doc.get("views", 0)
        ))
    return results


@router.get("/controversial", response_model=List[ThreadResponse])
async def get_controversial_threads(limit: int = 10):
    """
    Returnera 'mest kontroversiella' trådar,
    ex. baserat på (dislikes + 1) / (likes + 1) * views.
    Om du inte har 'likes'/'dislikes' i DB, anpassa formeln.
    """
    db_conn = await db.get_database()

    pipeline = [
        {
            "$addFields": {
                "controversyScore": {
                    "$cond": [
                        {"$gt": ["$likes", None]}, 
                        {
                            "$multiply": [
                                {"$divide": [
                                    {"$add": ["$dislikes", 1]},
                                    {"$add": ["$likes", 1]}
                                ]},
                                "$views"
                            ]
                        },
                        0
                    ]
                }
            }
        },
        {"$sort": {"controversyScore": -1}},
        {"$limit": limit}
    ]

    docs = await db_conn.threads.aggregate(pipeline).to_list(None)

    results = []
    for doc in docs:
        results.append(ThreadResponse(
            id=str(doc["_id"]),
            title=doc["title"],
            content=doc["content"],
            author_id=doc["author_id"],
            category_id=doc["category_id"],
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
            views=doc.get("views", 0)
        ))
    return results
