import os
import sys
import uvicorn
import logging
import traceback

# Konfigurera logging till både konsol och fil
log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, "backend_debug.log")

# Skapa en filhanterare och formattera den
file_handler = logging.FileHandler(log_file)
file_handler.setLevel(logging.DEBUG)
file_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(file_formatter)

# Skapa en konsollhanterare
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_formatter = logging.Formatter('%(levelname)s: %(message)s')
console_handler.setFormatter(console_formatter)

# Konfigurera root-loggern
root_logger = logging.getLogger()
root_logger.setLevel(logging.DEBUG)
root_logger.addHandler(file_handler)
root_logger.addHandler(console_handler)

# Skapa en logger för denna modul
logger = logging.getLogger("backend_starter")

try:
    # Se till att vi är i rätt mapp
    current_dir = os.path.dirname(os.path.abspath(__file__))
    logger.info(f"Current directory: {current_dir}")
    
    # Sätt arbetsmappen för att säkerställa korrekt import
    os.chdir(current_dir)
    
    # Lägg till nuvarande katalog i Python-sökvägen
    if current_dir not in sys.path:
        sys.path.insert(0, current_dir)
        logger.info(f"Added {current_dir} to Python path")
    
    # Kontrollera om main.py-filen finns
    main_file = os.path.join(current_dir, "main.py")
    if os.path.exists(main_file):
        logger.info(f"main.py found at {main_file}")
    else:
        logger.error(f"main.py not found at {main_file}")
        sys.exit(1)
    
    if __name__ == "__main__":
        try:
            logger.info("Starting backend server...")
            # Starta uvicorn direkt här
            uvicorn.run("main:app", host="127.0.0.1", port=8000, log_level="debug")
        except Exception as e:
            logger.error(f"Error starting server: {str(e)}")
            # Visa fullständigt felmeddelande för debugging
            logger.error(traceback.format_exc())
except Exception as e:
    # Fånga alla oförutsedda fel
    print(f"Critical error: {str(e)}")
    traceback.print_exc()
    if 'logger' in locals():
        logger.critical(f"Critical startup error: {str(e)}")
        logger.critical(traceback.format_exc()) 