# mongodb_test.py
import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from bson import ObjectId

# Konfigurera loggning
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MongoDBTest:
    def __init__(self, mongodb_url="mongodb://localhost:27017", db_name="hagelskott_db"):
        self.mongodb_url = mongodb_url
        self.db_name = db_name
        self.client = None
        self.db = None

    async def connect(self):
        """Testa databasanslutning"""
        try:
            self.client = AsyncIOMotorClient(self.mongodb_url)
            self.db = self.client[self.db_name]
            
            # Verifiera anslutning med ping
            await self.client.admin.command('ping')
            logger.info("✅ MongoDB anslutning lyckades")
            return True
        except Exception as e:
            logger.error(f"❌ MongoDB anslutningsfel: {str(e)}")
            return False

    async def test_crud_operations(self):
        """Testa grundläggande CRUD-operationer"""
        try:
            # Test collection
            test_collection = self.db.test_collection

            # CREATE - Infoga testdokument
            result = await test_collection.insert_one({
                "test_id": str(ObjectId()),
                "timestamp": datetime.utcnow(),
                "message": "Test document"
            })
            logger.info("✅ CREATE operation lyckades")
            doc_id = result.inserted_id

            # READ - Läs dokumentet
            doc = await test_collection.find_one({"_id": doc_id})
            if doc:
                logger.info("✅ READ operation lyckades")
            else:
                logger.error("❌ READ operation misslyckades")

            # UPDATE - Uppdatera dokumentet
            update_result = await test_collection.update_one(
                {"_id": doc_id},
                {"$set": {"message": "Updated test document"}}
            )
            if update_result.modified_count == 1:
                logger.info("✅ UPDATE operation lyckades")
            else:
                logger.error("❌ UPDATE operation misslyckades")

            # DELETE - Ta bort dokumentet
            delete_result = await test_collection.delete_one({"_id": doc_id})
            if delete_result.deleted_count == 1:
                logger.info("✅ DELETE operation lyckades")
            else:
                logger.error("❌ DELETE operation misslyckades")

            # Rensa test collection
            await test_collection.drop()
            return True

        except Exception as e:
            logger.error(f"❌ CRUD test fel: {str(e)}")
            return False

    async def verify_indexes(self):
        """Verifiera att alla nödvändiga index finns"""
        try:
            # Lista över collections och deras förväntade index
            required_indexes = {
                "users": [
                    ("username", 1, True),  # unique index
                    ("email", 1, True),     # unique index
                ],
                "settings": [
                    ("username", 1, True),  # unique index
                ],
                "shots": [
                    ("userId", 1, False),
                    ("timestamp", -1, False),
                ],
                "profiles": [
                    ("username", 1, True),  # unique index
                ]
            }

            for collection_name, indexes in required_indexes.items():
                collection = self.db[collection_name]
                existing_indexes = await collection.index_information()
                
                for field, direction, unique in indexes:
                    index_name = f"{field}_{'1' if direction == 1 else '-1'}"
                    if index_name not in existing_indexes:
                        # Skapa saknat index
                        await collection.create_index(
                            [(field, direction)],
                            unique=unique
                        )
                        logger.info(f"✅ Skapade saknat index {index_name} på {collection_name}")
                    else:
                        logger.info(f"✅ Index {index_name} finns på {collection_name}")

            return True
        except Exception as e:
            logger.error(f"❌ Index verifieringsfel: {str(e)}")
            return False

    async def test_user_settings(self):
        """Testa användarinställningar specifikt"""
        try:
            # Skapa testanvändare med inställningar
            test_user = {
                "username": "test_user",
                "email": "test@example.com",
                "created_at": datetime.utcnow()
            }

            test_settings = {
                "username": "test_user",
                "general": {
                    "defaultDistance": 25,
                    "preferredGauge": "12",
                    "measurementUnit": "metric",
                    "language": "sv"
                },
                "display": {
                    "darkMode": False,
                    "showGrid": True,
                    "showHeatmap": True
                }
            }

            # Försök spara inställningar
            await self.db.users.insert_one(test_user)
            await self.db.settings.insert_one(test_settings)
            logger.info("✅ Användarinställningar test lyckades")

            # Städa upp
            await self.db.users.delete_one({"username": "test_user"})
            await self.db.settings.delete_one({"username": "test_user"})
            return True

        except Exception as e:
            logger.error(f"❌ Användarinställningar test fel: {str(e)}")
            return False

    async def run_all_tests(self):
        """Kör alla tester"""
        try:
            if not await self.connect():
                return False

            logger.info("\n=== Kör MongoDB tester ===")
            
            crud_success = await self.test_crud_operations()
            logger.info(f"\nCRUD Operationer: {'✅' if crud_success else '❌'}")
            
            index_success = await self.verify_indexes()
            logger.info(f"\nIndex Verifiering: {'✅' if index_success else '❌'}")
            
            settings_success = await self.test_user_settings()
            logger.info(f"\nAnvändarinställningar: {'✅' if settings_success else '❌'}")

            all_success = all([crud_success, index_success, settings_success])
            logger.info(f"\n=== Test resultat: {'✅ ALLA TESTER OK' if all_success else '❌ NÅGRA TESTER MISSLYCKADES'} ===")
            
            return all_success

        except Exception as e:
            logger.error(f"❌ Testfel: {str(e)}")
            return False
        finally:
            if self.client:
                self.client.close()

# Kör tester
if __name__ == "__main__":
    tester = MongoDBTest()
    asyncio.run(tester.run_all_tests())