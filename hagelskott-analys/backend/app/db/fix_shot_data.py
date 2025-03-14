# Fil: fix_shot_data.py
import asyncio
import logging
from app.db.mongodb import db

logger = logging.getLogger(__name__)

# En ordbok över shotSize-ändringar:
# ex. "7 1/2" -> "#7.5", "8 1/2" -> "#8.5"
SHOTSIZE_MAP = {
    "7 1/2": "#7.5",
    "8 1/2": "#8.5",
    "6 1/2": "#6.5",
    # Lägg till fler om du vill
}

# En ordbok över shotType-ändringar:
# ex. "Pure Lead" -> "lead", "Hevi-Shot" -> "hevi"
SHOTTYPE_MAP = {
    "Pure Lead": "lead",
    "Hevi-Shot": "hevi",
    # "Bismuth": "bismuth",  # om du vill
}

async def main():
    # 1) Anslut DB
    await db.connect_db()
    database = await db.get_database()
    shotColl = database["shotgun_data"]

    # 2) Gå igenom SHOTSIZE_MAP
    for oldVal, newVal in SHOTSIZE_MAP.items():
        res = await shotColl.update_many(
            {"shotSize": oldVal},
            {"$set": {"shotSize": newVal}}
        )
        if res.modified_count:
            print(f"[shotSize] '{oldVal}' => '{newVal}' : {res.modified_count} docs uppdaterade.")

    # 3) Gå igenom SHOTTYPE_MAP
    for oldVal, newVal in SHOTTYPE_MAP.items():
        res = await shotColl.update_many(
            {"shotType": oldVal},
            {"$set": {"shotType": newVal}}
        )
        if res.modified_count:
            print(f"[shotType] '{oldVal}' => '{newVal}' : {res.modified_count} docs uppdaterade.")

    # 4) Klar
    print("=== fix_shot_data: Färdig ===")
    await db.close_db()

if __name__ == "__main__":
    # Kör scriptet i en asynkron loop
    asyncio.run(main())
