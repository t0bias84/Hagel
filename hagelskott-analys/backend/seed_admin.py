import asyncio
import bcrypt
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "hagelskott_db"

ADMIN_USERNAME = "admin_user"
ADMIN_PASSWORD = "secret_admin_password"

async def seed_admin():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    users_coll = db["users"]

    # Kolla om admin_user redan finns
    existing = await users_coll.find_one({"username": ADMIN_USERNAME})
    if existing:
        print("admin_user already exists, updating password just in case...")
        hashed_pw = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()
        await users_coll.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "hashed_password": hashed_pw,
                    "roles": ["admin"],
                    "disabled": False
                }
            }
        )
    else:
        hashed_pw = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()
        new_user = {
            "username": ADMIN_USERNAME,
            "email": "admin@example.com",
            "hashed_password": hashed_pw,
            "roles": ["admin"],
            "disabled": False,
            "created_at": datetime.now(timezone.utc),
        }
        await users_coll.insert_one(new_user)
        print("admin_user created")

    client.close()

if __name__ == "__main__":
    asyncio.run(seed_admin())
