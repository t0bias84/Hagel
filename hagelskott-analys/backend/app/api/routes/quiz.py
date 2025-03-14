# app/api/routes/quiz.py

from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.db.mongodb import db

router = APIRouter()

# ==============================
# Pydantic-modeller
# ==============================

class AnswerOption(BaseModel):
    text: str
    isCorrect: bool = False

class QuizQuestionCreate(BaseModel):
    questionText: str
    answers: List[AnswerOption]
    category: str = "misc"
    difficulty: str = "normal"
    prompt: Optional[str] = None
    imageUrl: Optional[str] = None

class QuizQuestionUpdate(BaseModel):
    questionText: Optional[str] = None
    answers: Optional[List[AnswerOption]] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    prompt: Optional[str] = None
    imageUrl: Optional[str] = None

class QuizQuestionRead(BaseModel):
    id: str = Field(..., alias="_id")
    questionText: str
    answers: List[AnswerOption]
    category: str
    difficulty: str
    prompt: Optional[str] = None
    imageUrl: Optional[str] = None
    createdAt: Optional[str] = None

    class Config:
        allow_population_by_field_name = True


# ==============================
# Hjälpfunktioner
# ==============================

def _question_to_read_model(doc: dict) -> QuizQuestionRead:
    return QuizQuestionRead(
        _id=str(doc["_id"]),
        questionText=doc["questionText"],
        answers=doc["answers"],
        category=doc["category"],
        difficulty=doc["difficulty"],
        prompt=doc.get("prompt"),
        imageUrl=doc.get("imageUrl"),
        createdAt=doc.get("createdAt")
    )

async def _get_collection():
    database = await db.get_database()
    return database["quiz_questions"]


# ==============================
# Endpoints
# ==============================

# 1) RANDOM: /quiz/random
@router.get("/quiz/random", response_model=List[QuizQuestionRead])
async def get_random_questions(
    amount: int = Query(5, description="Hur många slumpade frågor du vill ha."),
    category: Optional[str] = None,
    difficulty: Optional[str] = None
):
    """
    Returnerar 'amount' slumpade frågor.
    Man kan filtrera på category och difficulty om man vill.
    Ex: /quiz/random?amount=5&category=jakt&difficulty=normal
    """
    coll = await _get_collection()

    pipeline = []
    match_filter = {}

    if category:
        match_filter["category"] = category
    if difficulty:
        match_filter["difficulty"] = difficulty

    if match_filter:
        pipeline.append({"$match": match_filter})
    pipeline.append({"$sample": {"size": amount}})

    docs = await coll.aggregate(pipeline).to_list(length=amount)
    return [_question_to_read_model(d) for d in docs]


# 2) JÄGAREXAMEN: /quiz/jagarexamen
#    (Filterar på t.ex. category="jakt" eller en särskild "examen"-flagga,
#     beroende på hur du lagt upp det i DB.)
@router.get("/quiz/jagarexamen", response_model=List[QuizQuestionRead])
async def get_jagarexamen_questions(
    amount: int = Query(10, description="Antal frågor för jägarexamen"),
    difficulty: Optional[str] = None
):
    """
    Returnerar slumpade frågor avsedda för jägarexamen.
    Ex: /quiz/jagarexamen?amount=10&difficulty=normal
    Du kan i DB bestämma category="jakt" ELLER en egen exam-flagga.
    Nedan exempel visar category="jakt" + valfritt difficulty
    """
    coll = await _get_collection()

    pipeline = []
    match_filter = {"category": "jakt"}  # Filterar på "jakt" (eller "examen" om du hellre vill)

    if difficulty:
        match_filter["difficulty"] = difficulty

    pipeline.append({"$match": match_filter})
    pipeline.append({"$sample": {"size": amount}})

    docs = await coll.aggregate(pipeline).to_list(length=amount)
    return [_question_to_read_model(d) for d in docs]


# 3) Hämta alla (ADMIN-läge):
@router.get("/quiz", response_model=List[QuizQuestionRead])
async def get_all_quiz_questions(
    skip: int = 0,
    limit: int = 50
):
    """
    ADMIN-läge: Hämta en lista av quizfrågor (paginerad).
    Ex: GET /quiz?skip=0&limit=50
    """
    coll = await _get_collection()
    cursor = coll.find().sort("createdAt", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [_question_to_read_model(d) for d in docs]


# 4) Skapa en ny fråga: POST /quiz
@router.post("/quiz", response_model=QuizQuestionRead)
async def create_quiz_question(new_question: QuizQuestionCreate):
    """
    Skapa en ny quizfråga i databasen.
    ADMIN-läge
    """
    coll = await _get_collection()
    doc = {
        "questionText": new_question.questionText,
        "answers": [ans.dict() for ans in new_question.answers],
        "category": new_question.category,
        "difficulty": new_question.difficulty,
        "prompt": new_question.prompt,
        "imageUrl": new_question.imageUrl,
        "createdAt": datetime.utcnow().isoformat()
    }
    result = await coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _question_to_read_model(doc)


# 5) Hämta en enskild fråga via ID: GET /quiz/item/{question_id}
@router.get("/quiz/item/{question_id}", response_model=QuizQuestionRead)
async def get_quiz_question(question_id: str):
    """
    Hämta en specifik fråga via sitt ObjectId.
    OBS: /quiz/item/ för att undvika krock med /quiz/random
    """
    coll = await _get_collection()
    try:
        _id = ObjectId(question_id)
    except:
        raise HTTPException(status_code=400, detail="Ogiltigt ObjectId-format")

    doc = await coll.find_one({"_id": _id})
    if not doc:
        raise HTTPException(status_code=404, detail="Fråga ej hittad")
    return _question_to_read_model(doc)


# 6) Uppdatera en fråga: PUT /quiz/item/{question_id}
@router.put("/quiz/item/{question_id}", response_model=QuizQuestionRead)
async def update_quiz_question(question_id: str, update_data: QuizQuestionUpdate):
    """
    Uppdatera en existerande quizfråga. ADMIN-läge
    """
    coll = await _get_collection()
    try:
        _id = ObjectId(question_id)
    except:
        raise HTTPException(status_code=400, detail="Ogiltigt ObjectId-format")

    existing = await coll.find_one({"_id": _id})
    if not existing:
        raise HTTPException(status_code=404, detail="Fråga ej hittad")

    update_dict = {}
    if update_data.questionText is not None:
        update_dict["questionText"] = update_data.questionText
    if update_data.answers is not None:
        update_dict["answers"] = [ans.dict() for ans in update_data.answers]
    if update_data.category is not None:
        update_dict["category"] = update_data.category
    if update_data.difficulty is not None:
        update_dict["difficulty"] = update_data.difficulty
    if update_data.prompt is not None:
        update_dict["prompt"] = update_data.prompt
    if update_data.imageUrl is not None:
        update_dict["imageUrl"] = update_data.imageUrl

    if update_dict:
        await coll.update_one({"_id": _id}, {"$set": update_dict})

    updated_doc = await coll.find_one({"_id": _id})
    return _question_to_read_model(updated_doc)


# 7) Ta bort en fråga: DELETE /quiz/item/{question_id}
@router.delete("/quiz/item/{question_id}")
async def delete_quiz_question(question_id: str):
    """
    Radera en quizfråga. ADMIN-läge
    """
    coll = await _get_collection()
    try:
        _id = ObjectId(question_id)
    except:
        raise HTTPException(status_code=400, detail="Ogiltigt ObjectId-format")

    result = await coll.delete_one({"_id": _id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Frågan kunde inte hittas eller var redan raderad.")
    return {"message": f"Fråga {question_id} raderad."}
