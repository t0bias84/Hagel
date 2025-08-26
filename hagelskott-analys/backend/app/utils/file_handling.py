import logging
from datetime import datetime, timezone
import aiofiles
from PIL import Image
from fastapi import UploadFile, HTTPException

from app.core.config import settings

logger = logging.getLogger(__name__)

async def save_upload_file(upload_file: UploadFile, category: str) -> str:
    """
    Exempel: spara en fil i "uploads/<category>".
    """
    try:
        subdir = settings.get_upload_subdir(category)
        timestamp_str = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        file_path = subdir / f"{timestamp_str}_{upload_file.filename}"

        if upload_file.content_type.startswith("image/"):
            image = Image.open(upload_file.file)
            image.thumbnail((settings.MAX_IMAGE_DIMENSION, settings.MAX_IMAGE_DIMENSION))
            image.save(file_path, quality=settings.IMAGE_QUALITY, optimize=True)
        else:
            async with aiofiles.open(file_path, "wb") as out_file:
                content = await upload_file.read()
                await out_file.write(content)

        return str(file_path.relative_to(settings.UPLOAD_DIR))

    except Exception as e:
        logger.error(f"File upload error: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not save file")
