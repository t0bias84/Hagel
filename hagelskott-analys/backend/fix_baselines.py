# fix_baselines.py
import asyncio
import motor.motor_asyncio
from bson import ObjectId

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "hagelskott_db"

SHOTTYPE_MAP = {
    "Pure Lead": "lead",
    "Steel": "steel",
    "Heavi-Shot": "hevi",
    "Tung-Iron": "tungsten",
    # ...
}

async def main():
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    baselines_coll = db["shotgun_baselines"]

    cursor = baselines_coll.find({})
    async for doc in cursor:
        _id = doc["_id"]
        original_type = doc.get("shotType", "")
        new_type = SHOTTYPE_MAP.get(original_type, original_type)

        # Debug info
        print(f"ID={_id}, shotType före={original_type}")

        if new_type != original_type:
            print(f" -> Byter till: {new_type}")
            result = await baselines_coll.update_one(
                {"_id": ObjectId(_id)},
                {"$set": {"shotType": new_type}}
            )
            if result.modified_count > 0:
                print(f"   [OK] Uppdaterat shotType för {_id}")
        else:
            print(" -> Ingen ändring")

    print("Klar med uppdateringar.")

if __name__ == "__main__":
    asyncio.run(main())
