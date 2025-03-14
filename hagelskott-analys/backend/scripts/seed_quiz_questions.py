import asyncio
import argparse
import json
import os
import logging
import time
from typing import Optional
from datetime import datetime, timezone
import requests
import openai

from app.db.mongodb import db
from app.core.config import settings

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

############################################
# OPENAI
############################################
openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
if not openai_api_key:
    logger.warning("Ingen OPENAI_API_KEY är satt. Bildgenerering kan misslyckas.")
else:
    openai.api_key = openai_api_key

############################################
# Funktion: Generera bild via DALL-E
############################################
async def generate_image(prompt: str, size: str = "512x512") -> Optional[str]:
    """
    Anropar OpenAI DALL-E (synkront, men vi wrappar i asyncio.to_thread)
    och returnerar en URL till bilden eller None vid fel.
    """
    if not prompt or not openai.api_key:
        return None

    try:
        # Överför anropet till en thread (openai.Image.create är inte async)
        response = await asyncio.to_thread(
            openai.Image.create,
            prompt=prompt,
            n=1,
            size=size
        )
        # Returnera första bildens URL
        return response["data"][0]["url"]

    except Exception as e:
        logger.error(f"OpenAI Image generation failed for prompt '{prompt}': {e}")
        return None

############################################
# Ladda ner bilden lokalt
############################################
def download_image_locally(image_url: str, save_path: str) -> bool:
    """
    Laddar ner bilden från image_url och sparar den på save_path.
    Returnerar True om lyckat, annars False.
    """
    try:
        resp = requests.get(image_url, timeout=30)
        if resp.status_code == 200:
            with open(save_path, "wb") as f:
                f.write(resp.content)
            return True
        else:
            logger.error(f"Misslyckades ladda ner bild (status={resp.status_code}): {image_url}")
            return False
    except Exception as e:
        logger.error(f"Fel vid nerladdning av bild: {e}")
        return False

############################################
# Seed quiz-frågor
############################################
async def seed_quiz_data(file_path: str, limit: int = 0):
    """
    1) Läser JSON med quizfrågor.
    2) Kollar om redan finns en fråga med samma questionText (dubletter).
    3) Sätter difficulty till 'nerd' eller 'normal' (default).
    4) Genererar ev. bild med DALL-E, laddar ner lokalt.
    5) Sover 12 sek efter varje bild (tier 1-limit).
    6) Sparar i quiz_questions.
    """
    database = await db.get_database()
    collection = database["quiz_questions"]

    if not os.path.exists(file_path):
        logger.error(f"Filen '{file_path}' finns inte.")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        try:
            questions = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Kunde inte parsa JSON: {e}")
            return

    if not isinstance(questions, list):
        logger.error("JSON-filen måste innehålla en lista ([]) med quizfrågor.")
        return

    total_count = len(questions)
    logger.info(f"Laddade {total_count} frågor från '{file_path}'.")

    if limit > 0 and limit < total_count:
        questions = questions[:limit]
        logger.info(f"Begränsar seed till {limit} frågor.")

    # Se till att 'uploads/quiz_images' finns
    image_dir = os.path.join("uploads", "quiz_images")
    os.makedirs(image_dir, exist_ok=True)

    inserted_count = 0
    duplicate_count = 0

    for idx, q in enumerate(questions):
        question_text = q.get("questionText", "").strip()
        if not question_text:
            logger.warning(f"Fråga #{idx+1} saknar 'questionText'; skippar.")
            continue

        # Kolla dubletter i DB via questionText
        exists = await collection.find_one({"questionText": question_text})
        if exists:
            logger.info(f"({idx+1}/{total_count}) Dublett hittad: '{question_text[:50]}...' => skippar.")
            duplicate_count += 1
            continue

        # difficulty = "nerd" eller "normal" (default normal)
        difficulty = q.get("difficulty", "normal")
        if difficulty not in ("normal", "nerd"):
            difficulty = "normal"

        # Ex. category
        category = q.get("category", "misc")

        # Sätt prompt
        prompt = q.get("prompt", "").strip()

        created_at = datetime.now(timezone.utc).isoformat()

        # Generera bild
        local_image_path = None
        if prompt and openai.api_key:
            image_url = await generate_image(prompt)
            if image_url:
                # Sov 12 sek pga 5 bilder/min (Tier 1-limit)
                time.sleep(12)
                # Ladda ner bilden
                ts_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
                filename = f"quiz_{idx+1}_{ts_str}.png"
                save_path = os.path.join(image_dir, filename)

                success = download_image_locally(image_url, save_path)
                if success:
                    local_image_path = f"/uploads/quiz_images/{filename}"
                    logger.info(f"Bild nedladdad som {filename}")
                else:
                    logger.error("Kunde inte ladda ner bilden - skippar imageUrl.")
            else:
                logger.error("Kunde ej generera DALL-E-bild - skippar imageUrl.")

        # Bygg doc
        doc = {
            "questionText": question_text,
            "answers": q.get("answers", []),  # ex. [{text, isCorrect}, ...]
            "category": category,
            "difficulty": difficulty,
            "prompt": prompt,
            "imageUrl": local_image_path,  # Pekar på fil i /uploads/quiz_images
            "createdAt": created_at,
        }

        # Insert
        res = await collection.insert_one(doc)
        inserted_count += 1
        logger.info(f"({idx+1}/{total_count}) Inserted _id={res.inserted_id}")

    logger.info(f"Seed klart! Nya frågor: {inserted_count}, dubbletter: {duplicate_count}")
    await db.close_db()

############################################
# CLI
############################################
def parse_args():
    parser = argparse.ArgumentParser(description="Seed quiz questions into MongoDB.")
    parser.add_argument("--file", type=str, default="quiz_data.json",
                        help="Sökvägen till JSON-filen med quizfrågor")
    parser.add_argument("--limit", type=int, default=0,
                        help="Max antal frågor (0 = ingen gräns)")
    return parser.parse_args()

############################################
# MAIN
############################################
if __name__ == "__main__":
    args = parse_args()
    asyncio.run(seed_quiz_data(args.file, args.limit))
