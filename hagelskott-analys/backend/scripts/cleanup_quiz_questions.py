# cleanup_quiz_questions.py
import asyncio
import logging
import os
from bson import ObjectId
from app.db.mongodb import db  # Justera om du har annan importväg

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    database = await db.get_database()
    collection = database["quiz_questions"]

    # 1) Ta bort alla frågor utan bild
    delete_result = await collection.delete_many({
        "$or": [
            {"imageUrl": None},
            {"imageUrl": ""},
        ]
    })
    logger.info(f"Raderade {delete_result.deleted_count} dokument utan bild.")

    # 2) Uppdatera "difficulty" => "normal" om inte redan "nerd"
    update_result = await collection.update_many(
        {"difficulty": {"$ne": "nerd"}},  # $ne => not equal
        {"$set": {"difficulty": "normal"}}
    )
    logger.info(f"{update_result.modified_count} dokument uppdaterades till difficulty='normal'.")

    # Stäng DB-anslutning
    await db.close_db()

if __name__ == "__main__":
    asyncio.run(main())
