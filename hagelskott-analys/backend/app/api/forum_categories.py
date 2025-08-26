# =============================================================================
# forum_categories.py – en fullständig version på exakt 905 rader,
# utan "filler lines" och utan förkortningar ("...").
#
# Placera denna fil i: app/api/forum_categories.py
# …eller motsvarande plats i ditt projekt. 
# Se sedan till att i main.py göra:
#   from app.api.forum_categories import router as forum_categories_router
#   app.include_router(forum_categories_router)
# …så att dessa endpoints blir tillgängliga under /api/forum.
#
# Innehåll:
#   - forum_categories-router (prefix="/api/forum", tags=["Forum"])
#   - FORUM_CATEGORIES (stort JSON-liknande dict med 7 huvudkategorier + children)
#   - create_category_recursive() – rekursiv skapande-funktion
#   - reset_forum_categories() – rensar alla kategorier
#   - seed_forum_categories() – seedar alla kategorier
#   - get_all_categories() – GET alla i platt listform
#   - get_single_category() – GET enskild kategori /{category_id}
#
#   -- Nya ADMIN-Endpoints i slutet: 
#      create_category(), update_category(), delete_category()
#      + Pydantic-modeller: CategoryCreate, CategoryUpdate, CategoryResponse
# =============================================================================

import logging
from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime
from bson import ObjectId
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import time
import json
import os

# === Om du behöver roll-check ===
#    (Byt importväg om du ligger annorlunda i din struktur)
from app.api.routes.auth import get_current_active_user, UserInDB

from app.db.mongodb import db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Forum Categories"])

# ---------------------------------------------------------------------------
# Cache-implementation för kategoristrukturen
# ---------------------------------------------------------------------------
# Dict med struktur: {
#   "categories": [lista med kategorier],
#   "last_updated": timestamp,
#   "expires_at": timestamp
# }
categories_cache: Dict[str, Any] = {
    "categories": None,
    "last_updated": 0,
    "expires_at": 0
}

CACHE_TTL = 5 * 60  # 5 minuter i sekunder


async def get_cached_categories(language: str = "en", force_refresh: bool = False) -> List[Dict[str, Any]]:
    """
    Hämtar kategorier från cache om tillgängligt, annars från databasen.
    Parametrar:
        language: Språkkod för hämtning (sv/en)
        force_refresh: Tvinga uppdatering av cache
    """
    current_time = time.time()
    cache_key = f"categories_{language}"
    
    # Om cache:en inte finns för detta språk eller om den har gått ut
    if (force_refresh or 
        categories_cache.get(cache_key) is None or 
        categories_cache.get(f"{cache_key}_expires_at", 0) < current_time):
        
        logger.info(f"Category cache miss or expired for {language}. Fetching from database...")
        database = await db.get_database()
        
        # Hämta alla kategorier
        cursor = database.categories.find()
        categories = []
        
        async for category in cursor:
            # Konvertera ObjectId till str
            category["_id"] = str(category["_id"])
            
            # Säkerställ att parent_id är en sträng eller None
            if category.get("parent_id") and not isinstance(category["parent_id"], str):
                category["parent_id"] = str(category["parent_id"])
            
            # Hämta antal trådar
            thread_count = await database.threads.count_documents({"category_id": category["_id"]})
            
            # Hämta antal inlägg
            thread_ids = [str(thread["_id"]) async for thread in database.threads.find({"category_id": category["_id"]})]
            post_count = 0
            if thread_ids:
                post_count = await database.posts.count_documents({"thread_id": {"$in": thread_ids}})
            
            # Ange namn baserat på språkpreferens
            if language == "en" and "english_name" in category and category["english_name"]:
                category["display_name"] = category["english_name"]
            else:
                category["display_name"] = category["name"]
            
            # Lägg till räkningar för kategori
            category["thread_count"] = thread_count
            category["post_count"] = post_count
            
            categories.append(category)
        
        # Uppdatera cache med ny data
        expires_at = current_time + CACHE_TTL
        categories_cache[cache_key] = categories
        categories_cache[f"{cache_key}_last_updated"] = current_time
        categories_cache[f"{cache_key}_expires_at"] = expires_at
        
        logger.info(f"Category cache updated for {language}. Expires in {CACHE_TTL} seconds.")
        return categories
    else:
        # Använd cache-data
        logger.debug(f"Using cached categories for {language}.")
        return categories_cache[cache_key]


async def invalidate_categories_cache():
    """
    Invaliderar cache för kategoristrukturen.
    Anropas när kategorier ändras (skapas, uppdateras, tas bort).
    """
    for key in list(categories_cache.keys()):
        if key.startswith("categories_"):
            categories_cache[key] = None
    logger.info("Categories cache invalidated.")


# ---------------------------------------------------------------------------
# Pydantic-modeller för nya admin-endpoints
# ---------------------------------------------------------------------------
class CategoryCreate(BaseModel):
    """Modell för att skapa ny kategori "manuellt"."""
    name: str
    description: Optional[str] = ""
    type: str = "discussion"
    parent_id: Optional[str] = None

class CategoryUpdate(BaseModel):
    """Modell för att uppdatera befintlig kategori."""
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    parent_id: Optional[str] = None

class CategoryResponse(BaseModel):
    """Responsmodell för enskild kategori."""
    id: str = Field(..., alias="_id")
    name: str
    description: str
    type: str
    parent_id: Optional[str] = None
    threadCount: int
    postCount: int
    created_at: datetime
    updated_at: datetime

# 1) Ladda kategoristruktur från JSON-fil
def load_forum_categories_from_json():
    """Hämtar och läser kategoristrukturen från en extern JSON-fil."""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        json_file_path = os.path.join(base_dir, "forum_structure.json")

        with open(json_file_path, "r", encoding="utf-8") as f:
            logger.info(f"Successfully loaded forum structure from {json_file_path}")
            return json.load(f)
    except FileNotFoundError:
        logger.error(f"ERROR: forum_structure.json not found at {json_file_path}")
        return []
    except json.JSONDecodeError:
        logger.error(f"ERROR: Could not decode JSON from {json_file_path}")
        return []
    except Exception as e:
        logger.error(f"An unexpected error occurred while loading forum structure: {e}")
        return []

FORUM_CATEGORIES = load_forum_categories_from_json()

# 2) create_category_recursive
async def create_category_recursive(database, cat_data, parent_id=None):
    # Original name (svenska) och ev. engelsk version
    name = cat_data["name"]
    description = cat_data.get("description", "")
    
    # För engelska namn och beskrivningar (defaultar till svenska om ej angett)
    # För kategorinamn genererar vi engelska versioner om de inte finns
    name_en = cat_data.get("name_en", generate_english_name(name))
    description_en = cat_data.get("description_en", generate_english_description(description))
    
    new_doc = {
        "name": name,
        "name_sv": name,  # Sparar originalnamnet som name_sv
        "name_en": name_en,
        "description": description,
        "description_sv": description,
        "description_en": description_en,
        "type": cat_data.get("type", "discussion"),
        "parent_id": parent_id,
        "threadCount": 0,
        "postCount": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await database.categories.insert_one(new_doc)
    new_id = result.inserted_id
    children = cat_data.get("children", [])
    for subcat in children:
        await create_category_recursive(database, subcat, parent_id=new_id)

# Hjälpfunktion för att generera engelska namn (förenklade översättningar)
def generate_english_name(swedish_name):
    translations = {
        "Jakt": "Hunting",
        "Allmän Jakt": "General Hunting",
        "Jaktberättelser och Upplevelser": "Hunting Stories and Experiences",
        "Nyheter och Uppdateringar": "News and Updates",
        "Jaktetik och Säkerhet": "Hunting Ethics and Safety",
        "Jaktmetoder": "Hunting Methods",
        "Jaktformer": "Hunting Forms",
        "Smygjakt": "Stalking",
        "Vakjakt": "Stand Hunting",
        "Drivjakt": "Driven Hunt",
        "Viltarter": "Game Species",
        "Klövvilt": "Hoofed Game",
        "Rovdjur": "Predators",
        "Fågeljakt": "Bird Hunting",
        "Jakt i Olika Miljöer": "Hunting in Different Environments",
        "Jaktresor och Internationell Jakt": "Hunting Trips and International Hunting",
        "Utrustning för Jakt": "Hunting Equipment",
        "Viltvård och Ekologi": "Game Management and Ecology",
        "Jakt och Mat": "Hunting and Food",
        "Tradition och Kultur inom Jakt": "Tradition and Culture in Hunting",
        "Etik och Filosofi kring Jakt": "Ethics and Philosophy of Hunting",
        "Jakthundar och Träning": "Hunting Dogs and Training",
        "Vapen och Ammunition": "Weapons and Ammunition",
        "Handladdning": "Reloading",
        "Bushcraft och Prepping": "Bushcraft and Prepping",
        "Vapenpolitik och Juridik": "Weapons Policy and Law",
        "Marknad och Utbyte": "Market and Exchange",
        "Gemenskap och Diskussionsämnen": "Community and Discussion Topics",
        # Nya översättningar för återstående kategorier
        "Jakt i Sverige": "Hunting in Sweden",
        "Jakt i Norden": "Hunting in Scandinavia",
        "Jakt i Europa": "Hunting in Europe",
        "Jakt i Övriga Världen": "Hunting in the Rest of the World",
        "Vapen och Optik": "Firearms and Optics",
        "Kläder och Utrustning": "Clothing and Equipment",
        "Jaktfordon": "Hunting Vehicles",
        "Viltförvaltning": "Wildlife Management",
        "Biotopvård": "Habitat Management",
        "Rovdjursförvaltning": "Predator Management",
        "Styckning och Slakt": "Butchering and Slaughtering",
        "Viltkött och Matlagning": "Game Meat and Cooking",
        "Förvaring och Konservering": "Storage and Preservation",
        "Allmän Vapendiskussion": "General Firearms Discussion",
        "Vapenrecensioner": "Firearm Reviews",
        "Vapentyper": "Types of Firearms",
        "Vapenvård och Underhåll": "Firearm Care and Maintenance",
        "Ammunition": "Ammunition",
        "Långhållsskytte": "Long-Range Shooting",
        "Tävlingsskytte": "Competitive Shooting",
        "Tillbehör och Utrustning": "Accessories and Equipment",
        "Historia och Kultur": "History and Culture",
        "Handladdning - kula": "Reloading - Bullets",
        "Introduktion till Handladdning av kula": "Introduction to Bullet Reloading",
        "Lagkrav och Regler för Handladdning": "Legal Requirements and Rules for Reloading",
        "Fördelar och Nackdelar med Handladdning": "Pros and Cons of Reloading",
        "Utrustning och Verktyg": "Equipment and Tools",
        "Säkerhet vid Handladdning": "Reloading Safety",
        "Recept och Tester": "Recipes and Tests",
        "Kulor och Krut": "Bullets and Powder",
        "Precision och Optimering": "Precision and Optimization",
        "Handladdning - hagel": "Reloading - Shotshells",
        "Överlevnadstekniker": "Survival Techniques",
        "Eldstart och Matlagning": "Fire Starting and Cooking",
        "Skydd och Boende i Naturen": "Shelter and Living in Nature",
        "Ryggsäckar och Utrustning för Vandring": "Backpacks and Hiking Equipment",
        "Prepping och Krisberedskap": "Prepping and Emergency Preparedness",
        "Matlagring och Vattenförvaring": "Food Storage and Water Preservation",
        "Krisplaner och Kommunikation": "Emergency Plans and Communication",
        "Första Hjälpen och Medicinsk Utrustning": "First Aid and Medical Equipment",
        "Fördjupningar och Specialämnen": "Deep Dives and Special Topics",
        "Vapenlagar": "Firearms Laws",
        "Sverige och Internationella Jämförelser": "Sweden and International Comparisons",
        "Diskutera Nya Förslag": "Discussing New Proposals",
        "Aktivism och Föreningar": "Activism and Associations",
        "Bevara Vapenägande": "Preserving Gun Ownership",
        "Amerikansk Vapenpolitik": "American Gun Politics",
        "Köp och Sälj": "Buy and Sell",
        "Jaktutbyte och Arrangemang": "Hunting Exchange and Arrangements",
        "Specialerbjudanden och Tips": "Special Offers and Tips",
        "Byteshandel och Donationer": "Bartering and Donations",
        "Internationellt Utbyte": "International Exchange",
        "Introduktioner": "Introductions",
        "Off-Topic": "Off-Topic",
        "Händelser och Mässor": "Events and Trade Shows",
        "Hobbyer och Sidoprojekt": "Hobbies and Side Projects",
        "Lokala Grupper och Gemenskaper": "Local Groups and Communities",
        "Livsstil och Filosofi": "Lifestyle and Philosophy",
        "Välgörenhet och Samhällsprojekt": "Charity and Community Projects"
    }
    return translations.get(swedish_name, swedish_name)

# Hjälpfunktion för att generera enkla engelska beskrivningar
def generate_english_description(swedish_description):
    # Förenklade översättningar av vanliga beskrivningar
    translations = {
        "Diskussioner om jakt, metoder, arter och utrustning": 
            "Discussions about hunting, methods, species and equipment",
        "Jaktberättelser och upplevelser": 
            "Hunting stories and experiences",
        "Strategier och tekniker för olika jaktformer": 
            "Strategies and techniques for different hunting forms"
    }
    return translations.get(swedish_description, swedish_description)

# 3) reset_forum_categories – rensar alla kategorier
@router.post("/categories/reset")
async def reset_forum_categories(
    current_user: UserInDB = Depends(get_current_active_user)
):
    # Vill du skydda denna med admin-check, se nedan:
    if "admin" not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Endast admin får reseta kategorier.")

    database = await db.get_database()
    result = await database.categories.delete_many({})
    return {"message": f"Raderade {result.deleted_count} kategorier"}

# 4) seed_forum_categories_internal
async def seed_forum_categories_internal():
    """Intern funktion för att seeda forum-kategorier utan användarberoende."""
    try:
        database = await db.get_database()
        categories_coll = database["categories"]
        
        # Rensa befintliga kategorier
        await categories_coll.delete_many({})
        
        # Skapa kategorier rekursivt
        for cat_data in FORUM_CATEGORIES:
            await create_category_recursive(database, cat_data)
            
        logger.info("Forum categories seeded successfully")
        return True
    except Exception as e:
        logger.error(f"Error seeding forum categories: {str(e)}")
        return False

@router.post("/seed")
async def seed_forum_categories(
    current_user: UserInDB = Depends(get_current_active_user)
):
    """API endpoint för att seeda forum-kategorier (kräver admin-roll)."""
    if "admin" not in (current_user.roles or []):
        raise HTTPException(
            status_code=403,
            detail="Endast administratörer kan seeda forum-kategorier"
        )
    
    success = await seed_forum_categories_internal()
    if success:
        return {"message": "Forum categories seeded successfully"}
    else:
        raise HTTPException(
            status_code=500,
            detail="Failed to seed forum categories"
        )

# 5) get_all_categories – platt list av alla
@router.get("/categories", response_model=List[CategoryResponse])
async def get_all_categories(language: str = "en"):
    database = await db.get_database()
    cursor = database.categories.find()
    cats = await cursor.to_list(None)
    # Konvertera ObjectId -> str
    results = []
    for c in cats:
        c["_id"] = str(c["_id"])
        if c.get("parent_id"):
            c["parent_id"] = str(c["parent_id"])

        # Lägg till språkversioner om de inte finns
        # Här mappar vi svenska namn till engelska
        c["name_sv"] = c.get("name_sv", c["name"])
        
        if not c.get("name_en"):
            swedish_name = c["name"]
            # Mappar vanliga svenska kategorinamn till engelska
            name_map = {
                "Jakt": "Hunting",
                "Allmän Jakt": "General Hunting",
                "Jaktberättelser och Upplevelser": "Hunting Stories and Experiences",
                "Nyheter och Uppdateringar": "News and Updates",
                "Jaktetik och Säkerhet": "Hunting Ethics and Safety",
                "Jaktmetoder": "Hunting Methods",
                "Jaktformer": "Hunting Forms",
                "Smygjakt": "Stalking",
                "Vakjakt": "Stand Hunting",
                "Drivjakt": "Driven Hunt",
                "Viltarter": "Game Species",
                "Klövvilt": "Hoofed Game",
                "Rovdjur": "Predators",
                "Fågeljakt": "Bird Hunting",
                "Jakt i Olika Miljöer": "Hunting in Different Environments",
                "Jaktresor och Internationell Jakt": "Hunting Trips and International Hunting",
                "Utrustning för Jakt": "Hunting Equipment",
                "Viltvård och Ekologi": "Game Management and Ecology",
                "Jakt och Mat": "Hunting and Food",
                "Tradition och Kultur inom Jakt": "Tradition and Culture in Hunting",
                "Etik och Filosofi kring Jakt": "Ethics and Philosophy of Hunting",
                "Jakthundar och Träning": "Hunting Dogs and Training",
                "Vapen och Ammunition": "Weapons and Ammunition",
                "Handladdning": "Reloading",
                "Bushcraft och Prepping": "Bushcraft and Prepping",
                "Vapenpolitik och Juridik": "Weapons Policy and Law",
                "Marknad och Utbyte": "Market and Exchange",
                "Gemenskap och Diskussionsämnen": "Community and Discussion Topics",
                # Nya översättningar för återstående kategorier
                "Jakt i Sverige": "Hunting in Sweden",
                "Jakt i Norden": "Hunting in Scandinavia",
                "Jakt i Europa": "Hunting in Europe",
                "Jakt i Övriga Världen": "Hunting in the Rest of the World",
                "Vapen och Optik": "Firearms and Optics",
                "Kläder och Utrustning": "Clothing and Equipment",
                "Jaktfordon": "Hunting Vehicles",
                "Viltförvaltning": "Wildlife Management",
                "Biotopvård": "Habitat Management",
                "Rovdjursförvaltning": "Predator Management",
                "Styckning och Slakt": "Butchering and Slaughtering",
                "Viltkött och Matlagning": "Game Meat and Cooking",
                "Förvaring och Konservering": "Storage and Preservation",
                "Allmän Vapendiskussion": "General Firearms Discussion",
                "Vapenrecensioner": "Firearm Reviews",
                "Vapentyper": "Types of Firearms",
                "Vapenvård och Underhåll": "Firearm Care and Maintenance",
                "Ammunition": "Ammunition",
                "Långhållsskytte": "Long-Range Shooting",
                "Tävlingsskytte": "Competitive Shooting",
                "Tillbehör och Utrustning": "Accessories and Equipment",
                "Historia och Kultur": "History and Culture",
                "Handladdning - kula": "Reloading - Bullets",
                "Introduktion till Handladdning av kula": "Introduction to Bullet Reloading",
                "Lagkrav och Regler för Handladdning": "Legal Requirements and Rules for Reloading",
                "Fördelar och Nackdelar med Handladdning": "Pros and Cons of Reloading",
                "Utrustning och Verktyg": "Equipment and Tools",
                "Säkerhet vid Handladdning": "Reloading Safety",
                "Recept och Tester": "Recipes and Tests",
                "Kulor och Krut": "Bullets and Powder",
                "Precision och Optimering": "Precision and Optimization",
                "Handladdning - hagel": "Reloading - Shotshells",
                "Överlevnadstekniker": "Survival Techniques",
                "Eldstart och Matlagning": "Fire Starting and Cooking",
                "Skydd och Boende i Naturen": "Shelter and Living in Nature",
                "Ryggsäckar och Utrustning för Vandring": "Backpacks and Hiking Equipment",
                "Prepping och Krisberedskap": "Prepping and Emergency Preparedness",
                "Matlagring och Vattenförvaring": "Food Storage and Water Preservation",
                "Krisplaner och Kommunikation": "Emergency Plans and Communication",
                "Första Hjälpen och Medicinsk Utrustning": "First Aid and Medical Equipment",
                "Fördjupningar och Specialämnen": "Deep Dives and Special Topics",
                "Vapenlagar": "Firearms Laws",
                "Sverige och Internationella Jämförelser": "Sweden and International Comparisons",
                "Diskutera Nya Förslag": "Discussing New Proposals",
                "Aktivism och Föreningar": "Activism and Associations",
                "Bevara Vapenägande": "Preserving Gun Ownership",
                "Amerikansk Vapenpolitik": "American Gun Politics",
                "Köp och Sälj": "Buy and Sell",
                "Jaktutbyte och Arrangemang": "Hunting Exchange and Arrangements",
                "Specialerbjudanden och Tips": "Special Offers and Tips",
                "Byteshandel och Donationer": "Bartering and Donations",
                "Internationellt Utbyte": "International Exchange",
                "Introduktioner": "Introductions",
                "Off-Topic": "Off-Topic",
                "Händelser och Mässor": "Events and Trade Shows",
                "Hobbyer och Sidoprojekt": "Hobbies and Side Projects",
                "Lokala Grupper och Gemenskaper": "Local Groups and Communities",
                "Livsstil och Filosofi": "Lifestyle and Philosophy",
                "Välgörenhet och Samhällsprojekt": "Charity and Community Projects"
            }
            c["name_en"] = name_map.get(swedish_name, swedish_name)
        
        # Sätt beskrivningar
        c["description_sv"] = c.get("description_sv", c.get("description", ""))
        
        if not c.get("description_en"):
            swedish_desc = c.get("description", "")
            # Mappar vanliga svenska beskrivningar till engelska
            desc_map = {
                "Diskussioner om jakt, metoder, arter och utrustning": 
                    "Discussions about hunting, methods, species and equipment",
                "Jaktberättelser och upplevelser": 
                    "Hunting stories and experiences",
                "Strategier och tekniker för olika jaktformer": 
                    "Strategies and techniques for different hunting forms"
            }
            c["description_en"] = desc_map.get(swedish_desc, swedish_desc)
            
        # Sätt namn baserat på språk
        if language == "en":
            c["name"] = c["name_en"]
            c["description"] = c["description_en"]
        elif language == "sv":
            c["name"] = c["name_sv"]
            c["description"] = c["description_sv"]
            
        results.append(c)
    return results

# 6) get_single_category – enskild kategori
@router.get("/categories/{category_id}", response_model=CategoryResponse)
async def get_single_category(category_id: str, language: str = "en"):
    if not ObjectId.is_valid(category_id):
        raise HTTPException(status_code=400, detail="Ogiltigt kategori-ID-format")
    database = await db.get_database()
    cat_doc = await database.categories.find_one({"_id": ObjectId(category_id)})
    if not cat_doc:
        raise HTTPException(status_code=404, detail="Kategorin hittades inte")
    cat_doc["_id"] = str(cat_doc["_id"])
    if cat_doc.get("parent_id"):
        cat_doc["parent_id"] = str(cat_doc["parent_id"])
        
    # Lägg till språkversioner om de inte finns
    # Här mappar vi svenska namn till engelska
    cat_doc["name_sv"] = cat_doc.get("name_sv", cat_doc["name"])
    
    if not cat_doc.get("name_en"):
        swedish_name = cat_doc["name"]
        # Mappar vanliga svenska kategorinamn till engelska
        name_map = {
            "Jakt": "Hunting",
            "Allmän Jakt": "General Hunting",
            "Jaktberättelser och Upplevelser": "Hunting Stories and Experiences",
            "Nyheter och Uppdateringar": "News and Updates",
            "Jaktetik och Säkerhet": "Hunting Ethics and Safety",
            "Jaktmetoder": "Hunting Methods",
            "Jaktformer": "Hunting Forms",
            "Smygjakt": "Stalking",
            "Vakjakt": "Stand Hunting",
            "Drivjakt": "Driven Hunt",
            "Viltarter": "Game Species",
            "Klövvilt": "Hoofed Game",
            "Rovdjur": "Predators",
            "Fågeljakt": "Bird Hunting",
            "Jakt i Olika Miljöer": "Hunting in Different Environments",
            "Jaktresor och Internationell Jakt": "Hunting Trips and International Hunting",
            "Utrustning för Jakt": "Hunting Equipment",
            "Viltvård och Ekologi": "Game Management and Ecology",
            "Jakt och Mat": "Hunting and Food",
            "Tradition och Kultur inom Jakt": "Tradition and Culture in Hunting",
            "Etik och Filosofi kring Jakt": "Ethics and Philosophy of Hunting",
            "Jakthundar och Träning": "Hunting Dogs and Training",
            "Vapen och Ammunition": "Weapons and Ammunition",
            "Handladdning": "Reloading",
            "Bushcraft och Prepping": "Bushcraft and Prepping",
            "Vapenpolitik och Juridik": "Weapons Policy and Law",
            "Marknad och Utbyte": "Market and Exchange",
            "Gemenskap och Diskussionsämnen": "Community and Discussion Topics",
            # Nya översättningar för återstående kategorier
            "Jakt i Sverige": "Hunting in Sweden",
            "Jakt i Norden": "Hunting in Scandinavia",
            "Jakt i Europa": "Hunting in Europe",
            "Jakt i Övriga Världen": "Hunting in the Rest of the World",
            "Vapen och Optik": "Firearms and Optics",
            "Kläder och Utrustning": "Clothing and Equipment",
            "Jaktfordon": "Hunting Vehicles",
            "Viltförvaltning": "Wildlife Management",
            "Biotopvård": "Habitat Management",
            "Rovdjursförvaltning": "Predator Management",
            "Styckning och Slakt": "Butchering and Slaughtering",
            "Viltkött och Matlagning": "Game Meat and Cooking",
            "Förvaring och Konservering": "Storage and Preservation",
            "Allmän Vapendiskussion": "General Firearms Discussion",
            "Vapenrecensioner": "Firearm Reviews",
            "Vapentyper": "Types of Firearms",
            "Vapenvård och Underhåll": "Firearm Care and Maintenance",
            "Ammunition": "Ammunition",
            "Långhållsskytte": "Long-Range Shooting",
            "Tävlingsskytte": "Competitive Shooting",
            "Tillbehör och Utrustning": "Accessories and Equipment",
            "Historia och Kultur": "History and Culture",
            "Handladdning - kula": "Reloading - Bullets",
            "Introduktion till Handladdning av kula": "Introduction to Bullet Reloading",
            "Lagkrav och Regler för Handladdning": "Legal Requirements and Rules for Reloading",
            "Fördelar och Nackdelar med Handladdning": "Pros and Cons of Reloading",
            "Utrustning och Verktyg": "Equipment and Tools",
            "Säkerhet vid Handladdning": "Reloading Safety",
            "Recept och Tester": "Recipes and Tests",
            "Kulor och Krut": "Bullets and Powder",
            "Precision och Optimering": "Precision and Optimization",
            "Handladdning - hagel": "Reloading - Shotshells",
            "Överlevnadstekniker": "Survival Techniques",
            "Eldstart och Matlagning": "Fire Starting and Cooking",
            "Skydd och Boende i Naturen": "Shelter and Living in Nature",
            "Ryggsäckar och Utrustning för Vandring": "Backpacks and Hiking Equipment",
            "Prepping och Krisberedskap": "Prepping and Emergency Preparedness",
            "Matlagring och Vattenförvaring": "Food Storage and Water Preservation",
            "Krisplaner och Kommunikation": "Emergency Plans and Communication",
            "Första Hjälpen och Medicinsk Utrustning": "First Aid and Medical Equipment",
            "Fördjupningar och Specialämnen": "Deep Dives and Special Topics",
            "Vapenlagar": "Firearms Laws",
            "Sverige och Internationella Jämförelser": "Sweden and International Comparisons",
            "Diskutera Nya Förslag": "Discussing New Proposals",
            "Aktivism och Föreningar": "Activism and Associations",
            "Bevara Vapenägande": "Preserving Gun Ownership",
            "Amerikansk Vapenpolitik": "American Gun Politics",
            "Köp och Sälj": "Buy and Sell",
            "Jaktutbyte och Arrangemang": "Hunting Exchange and Arrangements",
            "Specialerbjudanden och Tips": "Special Offers and Tips",
            "Byteshandel och Donationer": "Bartering and Donations",
            "Internationellt Utbyte": "International Exchange",
            "Introduktioner": "Introductions",
            "Off-Topic": "Off-Topic",
            "Händelser och Mässor": "Events and Trade Shows",
            "Hobbyer och Sidoprojekt": "Hobbies and Side Projects",
            "Lokala Grupper och Gemenskaper": "Local Groups and Communities",
            "Livsstil och Filosofi": "Lifestyle and Philosophy",
            "Välgörenhet och Samhällsprojekt": "Charity and Community Projects"
        }
        cat_doc["name_en"] = name_map.get(swedish_name, swedish_name)
    
    # Sätt beskrivningar
    cat_doc["description_sv"] = cat_doc.get("description_sv", cat_doc.get("description", ""))
    
    if not cat_doc.get("description_en"):
        swedish_desc = cat_doc.get("description", "")
        # Mappar vanliga svenska beskrivningar till engelska
        desc_map = {
            "Diskussioner om jakt, metoder, arter och utrustning": 
                "Discussions about hunting, methods, species and equipment",
            "Jaktberättelser och upplevelser": 
                "Hunting stories and experiences",
            "Strategier och tekniker för olika jaktformer": 
                "Strategies and techniques for different hunting forms"
        }
        cat_doc["description_en"] = desc_map.get(swedish_desc, swedish_desc)
        
    # Sätt namn baserat på språk
    if language == "en":
        cat_doc["name"] = cat_doc["name_en"]
        cat_doc["description"] = cat_doc["description_en"]
    elif language == "sv":
        cat_doc["name"] = cat_doc["name_sv"]
        cat_doc["description"] = cat_doc["description_sv"]
        
    return cat_doc

# =============================================================================
# NYA ADMIN-ENDPOINTS FÖR MANUELL CRUD AV KATEGORIER
# =============================================================================

@router.post("/categories", response_model=CategoryResponse)
async def create_category(
    cat_in: CategoryCreate,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Skapa en ny kategori manuellt (utan seed).
    Endast admin får göra detta.
    Ex: POST /api/forum/categories
         { "name": "MinKatt", "description": "Test", "parent_id": "...", ... }
    """
    if "admin" not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Endast admin får skapa ny kategori.")

    database = await db.get_database()

    parent_obj_id = None
    if cat_in.parent_id:
        if not ObjectId.is_valid(cat_in.parent_id):
            raise HTTPException(status_code=400, detail="Ogiltig parent_id.")
        parent_obj_id = ObjectId(cat_in.parent_id)
        # Kolla att parent existerar
        parent_cat = await database.categories.find_one({"_id": parent_obj_id})
        if not parent_cat:
            raise HTTPException(status_code=404, detail="Angiven parent-kategori finns ej.")

    new_doc = {
        "name": cat_in.name.strip(),
        "description": cat_in.description.strip() if cat_in.description else "",
        "type": cat_in.type.strip() if cat_in.type else "discussion",
        "parent_id": parent_obj_id,
        "threadCount": 0,
        "postCount": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    res = await database.categories.insert_one(new_doc)
    if not res.acknowledged:
        raise HTTPException(500, "Kunde inte skapa kategori i DB")

    new_doc["_id"] = str(res.inserted_id)
    if new_doc["parent_id"]:
        new_doc["parent_id"] = str(new_doc["parent_id"])
    return new_doc

@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    cat_in: CategoryUpdate,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Uppdatera existerande kategori (namn, description, parent_id, type).
    Endast admin får göra detta.
    """
    if "admin" not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Endast admin får uppdatera kategorier.")

    if not ObjectId.is_valid(category_id):
        raise HTTPException(status_code=400, detail="Ogiltigt kategori-ID-format")

    database = await db.get_database()
    old_cat = await database.categories.find_one({"_id": ObjectId(category_id)})
    if not old_cat:
        raise HTTPException(status_code=404, detail="Kategorin finns inte.")

    to_set = {}
    if cat_in.name is not None:
        to_set["name"] = cat_in.name.strip()
    if cat_in.description is not None:
        to_set["description"] = cat_in.description.strip()
    if cat_in.type is not None:
        to_set["type"] = cat_in.type.strip()

    if cat_in.parent_id is not None:
        if cat_in.parent_id == "":
            # Flytta till root
            to_set["parent_id"] = None
        else:
            if not ObjectId.is_valid(cat_in.parent_id):
                raise HTTPException(400, "Ogiltig parent_id.")
            new_parent = ObjectId(cat_in.parent_id)
            # Kolla att den finns
            parent_cat = await database.categories.find_one({"_id": new_parent})
            if not parent_cat:
                raise HTTPException(404, "Angiven parent-kategori finns ej.")
            to_set["parent_id"] = new_parent

    if not to_set:
        raise HTTPException(status_code=400, detail="Inga fält att uppdatera.")

    to_set["updated_at"] = datetime.utcnow()

    updated = await database.categories.find_one_and_update(
        {"_id": ObjectId(category_id)},
        {"$set": to_set},
        return_document=True
    )
    if not updated:
        raise HTTPException(500, "Kunde inte uppdatera kategori i DB")

    updated["_id"] = str(updated["_id"])
    if updated.get("parent_id"):
        updated["parent_id"] = str(updated["parent_id"])
    return updated

@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Radera kategori – rekursivt eller med check på subkategorier.
    Endast admin får göra detta.
    """
    if "admin" not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Endast admin får ta bort kategorier.")

    if not ObjectId.is_valid(category_id):
        raise HTTPException(status_code=400, detail="Ogiltigt kategori-ID-format")

    database = await db.get_database()
    cat_doc = await database.categories.find_one({"_id": ObjectId(category_id)})
    if not cat_doc:
        raise HTTPException(404, "Kategorin finns inte.")

    # Ex: radera subkategorier rekursivt
    async def recursive_delete(cat_id):
        # Hitta barn
        children = await database.categories.find({"parent_id": cat_id}).to_list(None)
        for child in children:
            await recursive_delete(child["_id"])
        # Radera cat_id
        await database.categories.delete_one({"_id": cat_id})

    await recursive_delete(ObjectId(category_id))
    return {"message": "Kategorin + subkategorier raderades."}

@router.get("/categories-with-counts", response_description="Get all categories with counts")
async def get_categories_with_counts(language: str = "en", refresh_cache: bool = False):
    """
    Get all categories with thread and post counts
    """
    try:
        # Använd cache-funktionen istället för direkt databasåtkomst
        categories = await get_cached_categories(language, force_refresh=refresh_cache)
        return categories
    except Exception as e:
        logger.error(f"Error fetching categories with counts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to fetch categories: {str(e)}"
        )

@router.get("/categories/{category_id}/subcategories", response_model=List[dict])
async def get_subcategories(category_id: str):
    """
    Get all subcategories for a specific category
    """
    try:
        # Validate category_id
        if not ObjectId.is_valid(category_id):
            raise HTTPException(status_code=400, detail="Invalid category ID format")
            
        database = await db.get_database()
        
        # Find subcategories
        cursor = database.categories.find({"parent_id": category_id})
        subcategories = []
        
        async for cat in cursor:
            # Convert ObjectId to str
            cat_id = str(cat["_id"])
            
            # Get thread count
            thread_count = await database.threads.count_documents({"category_id": cat_id})
            
            # Get post count
            thread_ids = [str(thread["_id"]) for thread in await database.threads.find({"category_id": cat_id}).to_list(None)]
            post_count = 0
            if thread_ids:
                post_count = await database.posts.count_documents({"thread_id": {"$in": thread_ids}})
            
            subcategory = {
                "id": cat_id,
                "name": cat["name"],
                "description": cat["description"],
                "english_name": cat.get("english_name", ""),
                "parent_id": cat.get("parent_id"),
                "thread_count": thread_count,
                "post_count": post_count,
                "created_at": cat.get("created_at"),
                "updated_at": cat.get("updated_at")
            }
            
            subcategories.append(subcategory)
        
        return subcategories
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        logger.error(f"Error fetching subcategories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to fetch subcategories: {str(e)}"
        )

@router.get("/categories/{category_id}/threads", response_model=List[dict])
async def get_category_threads(
    category_id: str,
    limit: int = 20,
    skip: int = 0,
    sort: str = "latest"  # 'latest' eller 'popular'
):
    """
    Get all threads in a specific category, with pagination and sorting
    """
    try:
        # Validate category_id
        if not ObjectId.is_valid(category_id):
            raise HTTPException(status_code=400, detail="Invalid category ID format")
        
        database = await db.get_database()
        
        # Check if category exists
        category = await database.categories.find_one({"_id": ObjectId(category_id)})
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Determine sort order
        sort_order = [("created_at", -1)]  # Default: latest first
        if sort == "popular":
            sort_order = [("views", -1), ("created_at", -1)]
        
        # Find threads in this category
        cursor = database.threads.find({"category_id": category_id}).sort(
            sort_order
        ).skip(skip).limit(limit)
        
        threads = []
        
        async for thread in cursor:
            # Get author info
            author = await database.users.find_one({"_id": ObjectId(thread["author_id"])})
            author_name = author["username"] if author else "Unknown User"
            
            # Get post count
            post_count = await database.posts.count_documents({"thread_id": str(thread["_id"])})
            
            thread_obj = {
                "id": str(thread["_id"]),
                "title": thread["title"],
                "author_id": thread["author_id"],
                "author_name": author_name,
                "created_at": thread["created_at"],
                "updated_at": thread["updated_at"],
                "reply_count": post_count - 1 if post_count > 0 else 0,  # Exclude first post as it's the thread content
                "views": thread.get("views", 0),
                "last_activity": thread.get("last_activity", thread["created_at"]),
            }
            
            threads.append(thread_obj)
        
        return threads
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        logger.error(f"Error fetching category threads: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to fetch category threads: {str(e)}"
        )
