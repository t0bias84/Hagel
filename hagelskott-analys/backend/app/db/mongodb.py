# Fil: mongodb.py
import logging
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MongoDB:
    """
    Wrapper-klass för asynkron MongoDB-anslutning samt
    enkel åtkomst till en databas-instans.
    """

    def __init__(self):
        self.client: AsyncIOMotorClient | None = None
        self.database = None

    async def connect_db(self) -> None:
        """
        Etablerar anslutning till MongoDB genom upp till 'max_attempts' försök.
        Skapar de index som definierats i denna metod.
        """
        attempt = 0
        max_attempts = 3

        while attempt < max_attempts:
            try:
                logger.info(
                    f"[MongoDB] Attempting to connect to {settings.MONGODB_URL}, "
                    f"database='{settings.MONGODB_DB}' (attempt {attempt+1})."
                )

                self.client = AsyncIOMotorClient(
                    settings.MONGODB_URL,
                    maxPoolSize=settings.DB_POOL_SIZE,
                    maxIdleTimeMS=settings.DB_MAX_IDLE_TIME_MS,
                    serverSelectionTimeoutMS=5000,  # 5 sekunders timeout
                )
                self.database = self.client[settings.MONGODB_DB]

                # ---------------------------------------------------
                # Exempel: Index för "shots"
                # ---------------------------------------------------
                await self.database.shots.create_index([("userId", 1)])
                await self.database.shots.create_index([("timestamp", -1)])
                await self.database.shots.create_index([("metadata.shotgun.gauge", 1)])
                await self.database.shots.create_index([("metadata.distance", 1)])

                # user_settings
                await self.database.user_settings.create_index([("user_id", 1)], unique=True)

                # users
                await self.database.users.create_index("username", unique=True)
                await self.database.users.create_index("email", unique=True)
                await self.database.users.create_index([("last_login", -1)])
                await self.database.users.create_index("role")

                # settings
                await self.database.settings.create_index("username", unique=True)
                await self.database.settings.create_index(
                    [("username", 1), ("equipment.shotguns.manufacturer", 1)]
                )
                await self.database.settings.create_index(
                    [("username", 1), ("equipment.dogs.breed", 1)]
                )

                # profiles
                await self.database.profiles.create_index("username", unique=True)
                await self.database.profiles.create_index([("location", 1)])
                await self.database.profiles.create_index([("preferredDisciplines", 1)])

                # sessions / refresh_tokens (TTL-index)
                await self.database.sessions.create_index(
                    [("created_at", 1)],
                    expireAfterSeconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
                )
                await self.database.refresh_tokens.create_index(
                    [("created_at", 1)],
                    expireAfterSeconds=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
                )

                # uploads
                await self.database.uploads.create_index(
                    [("username", 1), ("category", 1), ("created_at", -1)]
                )

                # Forum-relaterade
                await self.database.categories.create_index([("parent_id", 1)])
                await self.database.categories.create_index([("name", 1)])
                await self.database.categories.create_index([("created_at", -1)])

                await self.database.threads.create_index([("category_id", 1)])
                await self.database.threads.create_index([("author_id", 1)])
                await self.database.threads.create_index([("created_at", -1)])
                # posts
                await self.database.posts.create_index([("thread_id", 1)])
                await self.database.posts.create_index([("author_id", 1)])
                await self.database.posts.create_index([("created_at", -1)])

                # components
                await self.database.components.create_index([("name", 1)])
                await self.database.components.create_index([("category", 1)])
                await self.database.components.create_index([("type", 1)])
                await self.database.components.create_index([("manufacturer", 1)])

                logger.info("MongoDB indexes created successfully.")

                # Verifiera anslutningen med 'ping'
                await self.client.admin.command("ping")
                logger.info(
                    f"Connected to MongoDB: {settings.MONGODB_URL}, "
                    f"using database='{settings.MONGODB_DB}'."
                )

                # Logga kollektions-stats
                await self.log_collection_stats(["shotgun_data", "loads", "users"])

                return

            except Exception as e:
                attempt += 1
                logger.error(f"MongoDB connection attempt {attempt} failed: {e}")
                if attempt >= max_attempts:
                    logger.error("Max connection attempts reached. Could not connect.")
                    raise
                await asyncio.sleep(2)

    async def log_collection_stats(self, collection_names: list[str]) -> None:
        """
        Hjälpmetod som visar hur många dokument
        som finns i givna kollektioner, för debug/loggning.
        """
        if self.database is None:
            return

        for cname in collection_names:
            try:
                count = await self.database[cname].count_documents({})
                logger.info(f"[MongoDB] '{cname}' has {count} documents.")
            except Exception as e:
                logger.warning(f"[MongoDB] Could not count documents in '{cname}': {e}")

    async def close_db(self) -> None:
        """
        Stänger anslutningen till databasen.
        """
        if self.client is not None:
            try:
                self.client.close()
                logger.info("MongoDB connection closed.")
            except Exception as e:
                logger.error(f"Error closing MongoDB connection: {e}")

    async def get_database(self):
        """
        Returnerar databasinstansen.
        Anropar connect_db() om den inte redan finns.
        """
        if self.client is None or self.database is None:
            await self.connect_db()
            if self.database is None:
                raise ConnectionError("Database connection failed.")
        return self.database

    async def verify_connection(self) -> bool:
        """
        Gör en 'ping' för att verifiera att connection är giltig.
        Returnerar True om allt är OK, annars False.
        """
        if self.client is None or self.database is None:
            return False
        try:
            await self.client.admin.command("ping")
            return True
        except Exception:
            return False

    async def ping_db(self) -> bool:
        """
        Alias för verify_connection.
        """
        return await self.verify_connection()

    async def clear_expired_sessions(self) -> None:
        """
        Exempel på hur man kan rensa utgångna sessioner,
        om man inte helt förlitar sig på TTL-index.
        """
        if self.database is None:
            logger.warning("No database reference. Skipping clear_expired_sessions.")
            return
        try:
            await self.database.sessions.delete_many({
                "created_at": {
                    "$lt": {
                        "$subtract": [
                            "$$NOW",
                            settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60 * 1000
                        ]
                    }
                }
            })
            logger.info("Expired sessions cleared.")
        except Exception as e:
            logger.error(f"Error clearing expired sessions: {e}")

    async def unify_shotgun_data(self) -> None:
        """
        Exempel: Uppdaterar fält i 'shotgun_data' för enhetlighet.
        """
        db = await self.get_database()
        shotColl = db["shotgun_data"]

        res1 = await shotColl.update_many(
            {"shotSize": "7 1/2"},
            {"$set": {"shotSize": "#7.5"}}
        )
        logger.info(f"[unify_shotgun_data] updated {res1.modified_count} docs (7 1/2 => #7.5)")

        res2 = await shotColl.update_many(
            {"shotType": "Pure Lead"},
            {"$set": {"shotType": "lead"}}
        )
        logger.info(f"[unify_shotgun_data] updated {res2.modified_count} docs (Pure Lead => lead)")

        logger.info("[unify_shotgun_data] Klart - data är nu mer enhetlig.")

    # -------------------------------------------------------
    # NYTT: Exempel på att spara en kalibrering (pixPerCm).
    # -------------------------------------------------------
    async def store_calibration_data(self, user_id: str, pix_per_cm: float) -> None:
        """
        Lagrar kalibreringsinformation, ex. "pixPerCm", i en collection "calibrations".
        Overwrite: en user har 1 calibration.
        """
        db = await self.get_database()
        calibrations_coll = db["calibrations"]
        try:
            await calibrations_coll.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "pix_per_cm": pix_per_cm,
                        "updated_at": settings.NOW()
                    }
                },
                upsert=True
            )
            logger.info(f"[store_calibration_data] user={user_id}, pix_per_cm={pix_per_cm}")
        except Exception as e:
            logger.error(f"Could not store calibration for user={user_id}: {e}")

_db_instance = MongoDB()
db = _db_instance

__all__ = ["db", "MongoDB"]
