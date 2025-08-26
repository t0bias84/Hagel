import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from app.db.mongodb import db
from app.api.routes.auth import get_current_active_user, User
from app.core.targets import get_target, get_available_targets
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/notifications")
async def get_notifications(current_user: User = Depends(get_current_active_user)):
    try:
        database = await db.get_database()
        notifications_coll = database["notifications"]
        notifs = await notifications_coll.find({"user_id": current_user.id}).to_list(length=100)
        return notifs
    except Exception as e:
        logger.error(f"Error fetching notifications: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte hämta notiser")

@router.get("/visualize", response_class=HTMLResponse)
async def visualize_shots():
    try:
        with open("templates/visualization.html", "r", encoding="utf-8") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    except Exception as e:
        logger.error(f"Visualization error: {str(e)}")
        raise HTTPException(500, "Could not load visualization")

@router.get("/targets")
async def list_targets():
    try:
        targets = get_available_targets()
        return JSONResponse(
            content=targets,
            headers={"Cache-Control": f"max-age={settings.CACHE_TTL}"}
        )
    except Exception as e:
        logger.error(f"Error fetching targets: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not fetch targets")

@router.get("/targets/{target_id}")
async def get_target_info(target_id: str):
    try:
        tgt = get_target(target_id)
        return JSONResponse(
            content=tgt.dict(),
            headers={"Cache-Control": f"max-age={settings.CACHE_TTL}"}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching target {target_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not fetch target")

@router.get("/")
async def root():
    return {
        "message": "Välkommen till Hagelskott Analys API",
        "version": settings.VERSION,
        "status": "operational"
    }

@router.get("/test")
async def test_endpoint():
    return {"message": "Backend is responding!", "timestamp": datetime.now().isoformat()}

@router.get("/loads/mine/stats")
async def get_my_loads_stats(current_user: User = Depends(get_current_active_user)):
    try:
        database = await db.get_database()
        loads_coll = database["loads"]

        load_count = await loads_coll.count_documents({"user_id": str(current_user.id)})

        pipeline = [
            {"$match": {"user_id": str(current_user.id)}},
            {"$group": {
                "_id": None,
                "totalViews": {"$sum": "$views"}
            }}
        ]
        result = await loads_coll.aggregate(pipeline).to_list(length=1)
        total_views = result[0]["totalViews"] if result else 0

        return {
            "loadCount": load_count,
            "totalViews": total_views
        }
    except Exception as e:
        logger.error(f"Error fetching loads stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Kunde inte hämta laddningsstatistik")

@router.get("/health", tags=["Health"])
async def health_check():
    """
    Enkel hälsokontroll för att verifiera att API:et fungerar
    """
    logger.info("Health check endpoint accessed")
    print("HEALTH CHECK ACCESSED")

    db_ok = False
    try:
        database = await db.get_database()
        await database.command("ping")
        db_ok = True
        logger.info("Database connection verified successfully")
    except Exception as e:
        logger.error(f"Database connection check failed: {e}")

    response = {
        "status": "ok",
        "api_version": settings.VERSION,
        "timestamp": datetime.now().isoformat(),
        "environment": settings.ENVIRONMENT,
        "database_connection": db_ok
    }
    logger.info(f"Health check response: {response}")
    return response

@router.get("/test-cors")
async def test_cors():
    return {"message": "CORS test successful", "timestamp": datetime.now().isoformat()}
