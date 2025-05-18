import os
import sys
import traceback
import logging

# Konfigurera loggning
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("backend_debug")
logger.info("Starting backend server with debug logging...")

try:
    logger.info("Checking if MongoDB is installed and running...")
    try:
        from pymongo import MongoClient
        client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=2000)
        client.server_info()  # Will raise an exception if cannot connect
        logger.info("MongoDB connection successful!")
    except Exception as mongo_err:
        logger.error(f"MongoDB connection failed: {str(mongo_err)}")
        logger.info("Make sure MongoDB is installed and running on port 27017")
    
    logger.info("Importing main module...")
    import main
    logger.info("Backend started successfully!")
except Exception as e:
    logger.error("\n\nERROR DETECTED:")
    logger.error(f"Error type: {type(e).__name__}")
    logger.error(f"Error message: {str(e)}")
    logger.error("\nTraceback:")
    traceback.print_exc()
    logger.error("\nPath information:")
    logger.error(f"Python path: {sys.path}")
    
    input("\nPress Enter to exit...") 