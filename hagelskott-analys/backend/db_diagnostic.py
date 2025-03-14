import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import logging
from datetime import datetime
from passlib.context import CryptContext

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def run_diagnostics():
    try:
        # 1. Test database connection
        client = AsyncIOMotorClient("mongodb://localhost:27017")
        db = client.your_database_name
        
        logger.info("Testing database connection...")
        await db.command("ping")
        logger.info("✅ Database connection successful")
        
        # 2. Check users collection
        users_coll = db.users
        user_count = await users_coll.count_documents({})
        logger.info(f"Found {user_count} users in database")
        
        # 3. Look for test user
        test_user = await users_coll.find_one({"username": "test_user"})
        if test_user:
            logger.info("✅ Found test_user")
            logger.info(f"User details: {test_user}")
        else:
            logger.warning("❌ test_user not found")
            
            # Create test user if missing
            hashed_password = pwd_context.hash("test_password")
            new_user = {
                "username": "test_user",
                "email": "test@example.com",
                "hashed_password": hashed_password,
                "disabled": False,
                "created_at": datetime.utcnow()
            }
            result = await users_coll.insert_one(new_user)
            logger.info(f"Created test user with id: {result.inserted_id}")

        # 4. Test password verification
        if test_user:
            try:
                password_valid = pwd_context.verify("test_password", test_user["hashed_password"])
                logger.info(f"Password verification test: {'✅ Success' if password_valid else '❌ Failed'}")
            except Exception as e:
                logger.error(f"❌ Password verification error: {str(e)}")

    except Exception as e:
        logger.error(f"❌ Diagnostic error: {str(e)}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(run_diagnostics())