import os
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import UploadFile
from app.core.config import settings

def generate_english_name(text: str) -> str:
    """
    Genererar ett URL-vänligt namn från texten genom att:
    1. Konvertera till gemener
    2. Ersätta mellanslag med bindestreck
    3. Ta bort icke-alfanumeriska tecken
    4. Ta bort svenska tecken (å, ä, ö)
    """
    # Konvertera till gemener
    text = text.lower()
    
    # Ersätt mellanslag med bindestreck
    text = text.replace(" ", "-")
    
    # Ersätt svenska tecken
    text = text.replace("å", "a").replace("ä", "a").replace("ö", "o")
    
    # Ta bort alla icke-alfanumeriska tecken förutom bindestreck
    text = re.sub(r'[^a-z0-9-]', '', text)
    
    # Ta bort multipla bindestreck
    text = re.sub(r'-+', '-', text)
    
    # Ta bort inledande eller avslutande bindestreck
    text = text.strip('-')
    
    return text

async def upload_file(file: UploadFile, category: str) -> Optional[str]:
    """
    Laddar upp en fil till servern.
    Returnerar den relativa sökvägen till filen om uppladdningen lyckades, annars None.
    """
    if not file or not file.filename:
        return None
    
    # Skapa mappen om den inte finns
    upload_dir = settings.UPLOAD_DIR / category
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generera ett unikt filnamn
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = upload_dir / filename
    
    # Spara filen
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # Returnera den relativa sökvägen
        return f"{category}/{filename}"
    except Exception as e:
        print(f"Error uploading file: {str(e)}")
        return None 