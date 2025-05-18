import os
import sys
import logging
import uvicorn
from pathlib import Path

# Konfigurera loggning
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("backend_starter")
logger.info("Starting backend server with detailed logging...")

# Säkerställ att .env-filen laddas
if os.path.exists(".env"):
    from dotenv import load_dotenv
    load_dotenv()
    logger.info("Loaded .env file")

# Säkerställ att uploads-katalogen finns
uploads_dir = Path("uploads")
if not uploads_dir.exists():
    uploads_dir.mkdir(parents=True)
    logger.info(f"Created uploads directory: {uploads_dir.absolute()}")

# Skapa nödvändiga undermappar
for subdir in ["profiles", "forum", "analysis", "temp"]:
    subdir_path = uploads_dir / subdir
    if not subdir_path.exists():
        subdir_path.mkdir(parents=True)
        logger.info(f"Created subdir: {subdir_path.absolute()}")

# Skriv lite info om systemet
logger.info(f"Python version: {sys.version}")
logger.info(f"Current directory: {os.getcwd()}")

# Starta servern
if __name__ == "__main__":
    logger.info("Starting uvicorn server...")
    uvicorn.run(
        "main:app",
        host="localhost",  # Använd localhost istället för 0.0.0.0 för att bara tillåta lokala anslutningar
        port=8000,
        reload=True,
        log_level="debug"
    ) 