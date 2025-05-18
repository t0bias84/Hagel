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

# 1) HELA KATEGORISTRUKTUR (INGEN FÖRKORTNING):
FORUM_CATEGORIES = [
    {
        "name": "Jakt",
        "description": "Diskussioner om jakt, metoder, arter och utrustning",
        "type": "discussion",
        "parent_id": None,
        "children": [
            {
                "name": "Allmän Jakt",
                "description": "Jaktberättelser och upplevelser",
                "type": "discussion",
                "children": [
                    {
                        "name": "Jaktberättelser och Upplevelser",
                        "description": "Dela dina senaste jaktäventyr och erfarenheter.",
                        "type": "discussion",
                    },
                    {
                        "name": "Nyheter och Uppdateringar",
                        "description": "Diskutera aktuella händelser och förändringar inom jaktvärlden.",
                        "type": "discussion",
                    },
                    {
                        "name": "Jaktetik och Säkerhet",
                        "description": "Debattera etiska frågor och säkerhetsaspekter inom jakten.",
                        "type": "discussion",
                    },
                ],
            },
            {
                "name": "Jaktmetoder",
                "description": "Strategier och tekniker för olika jaktformer",
                "type": "discussion",
                "children": [
                    {
                        "name": "Smygjakt",
                        "description": "Strategier och tips för effektiv smygjakt.",
                        "type": "discussion",
                    },
                    {
                        "name": "Vakjakt",
                        "description": "Diskussioner om utrustning och tekniker för vakjakt.",
                        "type": "discussion",
                    },
                    {
                        "name": "Drivjakt",
                        "description": "Erfarenheter och råd kring drivjakt.",
                        "type": "discussion",
                    },
                    {
                        "name": "Jakt med Hund",
                        "description": "Diskussioner om olika typer av jakthundar",
                        "type": "discussion",
                        "children": [
                            {
                                "name": "Ställande Hundar",
                                "description": "Användning och träning av ställande hundar i jakt.",
                                "type": "discussion",
                            },
                            {
                                "name": "Drivande Hundar",
                                "description": "Diskutera raser och tekniker för drivande hundar.",
                                "type": "discussion",
                            },
                            {
                                "name": "Apportörer",
                                "description": "Tips för träning och användning av apportörer.",
                                "type": "discussion",
                            },
                            {
                                "name": "Grythundar",
                                "description": "Erfarenheter av jakt med grythundar.",
                                "type": "discussion",
                            },
                        ],
                    },
                ],
            },
            {
                "name": "Jaktformer",
                "description": "Diskussion om olika jaktformer (fågeljakt, bågjakt, fällfångst etc.)",
                "type": "discussion",
                "children": [
                    {
                        "name": "Fågeljakt",
                        "description": "Allt om jakt på olika fågelarter.",
                        "type": "discussion",
                    },
                    {
                        "name": "Bågjakt",
                        "description": "Diskutera bågjakt (compound, långbåge, recurve).",
                        "type": "discussion",
                        "children": [
                            {
                                "name": "Compoundbågar",
                                "description": "Diskutera jakt med compoundbågar.",
                                "type": "discussion",
                            },
                            {
                                "name": "Traditionella Bågar",
                                "description": "Erfarenheter av jakt med långbåge och recurve.",
                                "type": "discussion",
                            },
                            {
                                "name": "Jakt med Pilbåge",
                                "description": "Allmän diskussion om bågjakt och dess utmaningar.",
                                "type": "discussion",
                            },
                        ],
                    },
                    {
                        "name": "Jakt med Fällor",
                        "description": "Metoder och lagar kring användning av fällor i jakt.",
                        "type": "discussion",
                    },
                ],
            },
            {
                "name": "Viltarter",
                "description": "Diskussioner om högvilt, småvilt, älg, hjort, vildsvin, räv, hare m.m.",
                "type": "discussion",
                "children": [
                    {
                        "name": "Högvilt",
                        "description": "Diskussioner om älg, hjort och vildsvin",
                        "type": "discussion",
                        "children": [
                            {
                                "name": "Älgjakt",
                                "description": "Strategier och erfarenheter från älgjakt.",
                                "type": "discussion",
                            },
                            {
                                "name": "Hjortjakt",
                                "description": "Diskutera jakt på olika hjortarter.",
                                "type": "discussion",
                            },
                            {
                                "name": "Vildsvinsjakt",
                                "description": "Tips och råd för effektiv vildsvinsjakt.",
                                "type": "discussion",
                            },
                        ],
                    },
                    {
                        "name": "Småvilt",
                        "description": "Diskussioner om rådjur, hare och räv",
                        "type": "discussion",
                        "children": [
                            {
                                "name": "Rådjursjakt",
                                "description": "Erfarenheter och metoder för rådjursjakt.",
                                "type": "discussion",
                            },
                            {
                                "name": "Harjakt",
                                "description": "Diskussioner om jakt på hare.",
                                "type": "discussion",
                            },
                            {
                                "name": "Rävjakt",
                                "description": "Strategier och utrustning för rävjakt.",
                                "type": "discussion",
                            },
                        ],
                    },
                ],
            },
            {
                "name": "Jakt i Olika Miljöer",
                "description": "Diskussioner om skogsjakt, fjälljakt, våtmarksjakt m.m.",
                "type": "discussion",
                "children": [
                    {
                        "name": "Skogsjakt",
                        "description": "Utmaningar och tips för jakt i skogsmiljöer.",
                        "type": "discussion",
                    },
                    {
                        "name": "Fjälljakt",
                        "description": "Erfarenheter och utrustning för jakt i fjällen.",
                        "type": "discussion",
                    },
                    {
                        "name": "Våtmarksjakt",
                        "description": "Diskutera jakt i våtmarker och vid vatten.",
                        "type": "discussion",
                    },
                ],
            },
            {
                "name": "Jaktresor och Internationell Jakt",
                "description": "Erfarenheter och tips för jaktresor i Sverige och utomlands.",
                "type": "discussion",
                "children": [
                    {
                        "name": "Jakt i Sverige",
                        "description": "Dela erfarenheter från olika regioner i Sverige.",
                        "type": "discussion",
                    },
                    {
                        "name": "Jakt i Norden",
                        "description": "Diskussioner om jakt i våra grannländer.",
                        "type": "discussion",
                    },
                    {
                        "name": "Jakt i Europa",
                        "description": "Erfarenheter och tips för jakt på kontinenten.",
                        "type": "discussion",
                    },
                    {
                        "name": "Jakt i Övriga Världen",
                        "description": "Berättelser och råd för jakt på andra kontinenter.",
                        "type": "discussion",
                    },
                ],
            },
            {
                "name": "Utrustning för Jakt",
                "description": "Diskussioner om vapen, optik, kläder och fordon för jakt.",
                "type": "discussion",
                "children": [
                    {
                        "name": "Vapen och Optik",
                        "description": "Diskutera val av vapen och kikarsikten för olika jaktformer.",
                        "type": "discussion",
                    },
                    {
                        "name": "Kläder och Utrustning",
                        "description": "Tips om lämplig klädsel och utrustning för olika jaktsituationer.",
                        "type": "discussion",
                    },
                    {
                        "name": "Jaktfordon",
                        "description": "Erfarenheter av fordon anpassade för jakt.",
                        "type": "discussion",
                    },
                ],
            },
            {
                "name": "Viltvård och Ekologi",
                "description": "Diskussioner om hållbar viltförvaltning och ekologi.",
                "type": "discussion",
                "children": [
                    {
                        "name": "Viltförvaltning",
                        "description": "Metoder för att upprätthålla hållbara viltstammar.",
                        "type": "discussion",
                    },
                    {
                        "name": "Biotopvård",
                        "description": "Tips för att förbättra livsmiljöer för vilt.",
                        "type": "discussion",
                    },
                    {
                        "name": "Rovdjursförvaltning",
                        "description": "Debatter och strategier kring hantering av rovdjur.",
                        "type": "discussion",
                    },
                ],
            },
            {
                "name": "Jakt och Mat",
                "description": "Diskussioner om styckning, slakt, viltkött och matlagning.",
                "type": "discussion",
                "children": [
                    {
                        "name": "Styckning och Slakt",
                        "description": "Tekniker för korrekt styckning, utrustning för slakt",
                        "type": "discussion",
                    },
                    {
                        "name": "Viltkött och Matlagning",
                        "description": "Recept och tillagning av viltkött, marinader och kryddning",
                        "type": "discussion",
                    },
                    {
                        "name": "Förvaring och Konservering",
                        "description": "Torkning, rökning, saltning, frysning, vakuumförpackning",
                        "type": "discussion",
                    },
                ],
            },
            {
                "name": "Tradition och Kultur inom Jakt",
                "description": "Historiska perspektiv, traditioner, litteratur och konst kring jakt",
                "type": "discussion",
                "children": [
                    {
                        "name": "Jakttraditioner i Sverige",
                        "description": "Kultur och seder kring jakt i olika regioner",
                        "type": "discussion",
                    },
                    {
                        "name": "Jaktens Historia",
                        "description": "Historiska perspektiv på jakt genom tiderna",
                        "type": "discussion",
                    },
                    {
                        "name": "Jaktberättelser och Litteratur",
                        "description": "Tips på jaktböcker, filmer och delning av jakthistorier",
                        "type": "discussion",
                    },
                    {
                        "name": "Jakt och Konst",
                        "description": "Tavlor, foton och skulpturer med jaktmotiv",
                        "type": "discussion",
                    },
                ],
            },
            {
                "name": "Etik och Filosofi kring Jakt",
                "description": "Diskussioner om moral, ekosystem och rovdjursfrågor",
                "type": "discussion",
                "children": [
                    {
                        "name": "Etisk Jakt",
                        "description": "Diskussioner om moral och etik i jakt",
                        "type": "discussion",
                    },
                    {
                        "name": "Jakt som Livsstil",
                        "description": "Hur jakt påverkar jägarnas liv, balans natur/fritid",
                        "type": "discussion",
                    },
                    {
                        "name": "Rovdjur och Människor",
                        "description": "Etiska frågor kring jakt på rovdjur",
                        "type": "discussion",
                    },
                ],
            },
            {
                "name": "Jakthundar och Träning",
                "description": "Val av jakthund, träning, hälsa och avel",
                "type": "discussion",
                "children": [
                    {
                        "name": "Val av Jakthund",
                        "description": "Vilka raser passar för olika jaktformer?",
                        "type": "discussion",
                    },
                    {
                        "name": "Hundträning",
                        "description": "Träningsmetoder för olika typer av jakthundar",
                        "type": "discussion",
                    },
                    {
                        "name": "Jakthundars Hälsa",
                        "description": "Tips för att hålla hunden frisk och i god form",
                        "type": "discussion",
                    },
                    {
                        "name": "Uppfödning och Avel av Jakthundar",
                        "description": "Avelsmetoder och val av rätt linjer",
                        "type": "discussion",
                    },
                ],
            },
        ],
    },
    {
        "name": "Vapen och Ammunition",
        "description": "Diskussioner om vapen, ammunition och allt runtomkring",
        "type": "technical",
        "parent_id": None,
        "children": [
            {
                "name": "Allmän Vapendiskussion",
                "description": "Nyheter, lagar och säkerhet kring vapen",
                "type": "technical",
                "children": [
                    {
                        "name": "Nyheter inom Vapenteknologi",
                        "description": "Diskutera nya vapen och innovationer i branschen",
                        "type": "technical",
                    },
                    {
                        "name": "Vapenlagar och Regler",
                        "description": "Diskussioner kring nationella/internationella lagar",
                        "type": "technical",
                    },
                    {
                        "name": "Vapensäkerhet",
                        "description": "Grundläggande säkerhetsrutiner vid vapenhantering",
                        "type": "technical",
                    },
                ],
            },
            {
                "name": "Vapenrecensioner",
                "description": "Recensioner av hagelgevär, kulgevär och handeldvapen",
                "type": "technical",
                "children": [
                    {
                        "name": "Hagelgevär",
                        "description": "Recensioner av olika hagelgevärsmodeller",
                        "type": "technical",
                    },
                    {
                        "name": "Kulgevär",
                        "description": "Erfarenheter och åsikter om kulgevär",
                        "type": "technical",
                    },
                    {
                        "name": "Handeldvapen",
                        "description": "Recensioner av pistoler och revolvrar",
                        "type": "technical",
                    },
                    {
                        "name": "Historiska Vapen",
                        "description": "Diskussioner och recensioner av historiska samlarvapen",
                        "type": "technical",
                    },
                ],
            },
            {
                "name": "Vapentyper",
                "description": "Diskussioner om hagelgevär, kulgevär, handeldvapen, luftvapen m.m.",
                "type": "technical",
                "children": [
                    {
                        "name": "Hagelgevär",
                        "description": "Dubbellopp, halvautomatiska, pumphagelgevär, choker/pipor",
                        "type": "technical",
                    },
                    {
                        "name": "Kulgevär",
                        "description": "Bultbössor, halvautomater, kaliberval för olika jaktformer",
                        "type": "technical",
                    },
                    {
                        "name": "Handeldvapen",
                        "description": "Pistoler, revolvrar, självförsvar och tävlingsskytte",
                        "type": "technical",
                    },
                    {
                        "name": "Luftgevär och Luftvapen",
                        "description": "Val av luftvapen för målskytte eller småviltsjakt",
                        "type": "technical",
                    },
                ],
            },
            {
                "name": "Vapenvård och Underhåll",
                "description": "Rengöring, förvaring och reparation av vapen",
                "type": "technical",
                "children": [
                    {
                        "name": "Rengöringstekniker",
                        "description": "Tips på effektiva metoder för att hålla vapen i toppskick",
                        "type": "technical",
                    },
                    {
                        "name": "Tillbehör för Vapenvård",
                        "description": "Rekommendationer för rengöringskit, oljor och verktyg",
                        "type": "technical",
                    },
                    {
                        "name": "Förvaring av Vapen",
                        "description": "Diskussioner om vapenskåp och säkerhetslösningar",
                        "type": "technical",
                    },
                    {
                        "name": "Reparation och Uppgradering",
                        "description": "Hur man åtgärdar problem och uppgraderar sitt vapen",
                        "type": "technical",
                    },
                ],
            },
            {
                "name": "Ammunition",
                "description": "Diskussioner om kommersiell ammo, hagelammunition, kulammunition",
                "type": "technical",
                "children": [
                    {
                        "name": "Test och Recensioner av Kommersiell Ammunition",
                        "description": "Användarrecensioner av kommersiell ammo",
                        "type": "technical",
                    },
                    {
                        "name": "Användningsområden för Olika Kalibrar",
                        "description": "Vilka kalibrar för vilka ändamål?",
                        "type": "technical",
                    },
                    {
                        "name": "Hagelammunition",
                        "description": "Val av hagelstorlek och laddning för fågel/småvilt",
                        "type": "technical",
                    },
                    {
                        "name": "Kulammunition",
                        "description": "Tester av olika kultyper och ballistik",
                        "type": "technical",
                    },
                ],
            },
            {
                "name": "Långhållsskytte",
                "description": "Diskussioner om precisionsteknik, ballistik och träning",
                "type": "technical",
                "children": [
                    {
                        "name": "Teknik och Utrustning",
                        "description": "Diskussioner om precisionstekniker och bästa utrustningen",
                        "type": "technical",
                    },
                    {
                        "name": "Ballistik och Vindavdrift",
                        "description": "Hur man hanterar ballistiska utmaningar och vind",
                        "type": "technical",
                    },
                    {
                        "name": "Skjutbanor och Träning",
                        "description": "Rekommendationer för långhållsskjutbanor och träning",
                        "type": "technical",
                    },
                ],
            },
            {
                "name": "Tävlingsskytte",
                "description": "Diskussioner om precisionstävlingar, IPSC, sportskytte m.m.",
                "type": "technical",
                "children": [
                    {
                        "name": "Precisionstävlingar",
                        "description": "Benchrest, F-Class och liknande tävlingar",
                        "type": "technical",
                    },
                    {
                        "name": "IPSC och Dynamiskt Skytte",
                        "description": "Tävlingsformat och strategier",
                        "type": "technical",
                    },
                    {
                        "name": "Sportskytte",
                        "description": "Erfarenheter från tävlingar inom luftvapen, pistol, gevär",
                        "type": "technical",
                    },
                ],
            },
            {
                "name": "Tillbehör och Utrustning",
                "description": "Optik, kikarsikten, ljuddämpare, bipods, stockar m.m.",
                "type": "technical",
            },
            {
                "name": "Historia och Kultur",
                "description": "Vapnens historia, vapenkultur och samlarvapen",
                "type": "technical",
            },
        ],
    },
    {
        "name": "Handladdning",
        "description": "Allt om handladdning av kula och hagel",
        "type": "technical",
        "parent_id": None,
        "children": [
            {
                "name": "Handladdning - kula",
                "description": "Introduktion, regler, fördelar/nackdelar med handladdning",
                "type": "technical",
                "children": [
                    {
                        "name": "Introduktion till Handladdning av kula",
                        "description": "Vad är handladdning och varför gör man det?",
                        "type": "technical",
                    },
                    {
                        "name": "Lagkrav och Regler för Handladdning",
                        "description": "Lagar och regler i Sverige och andra länder.",
                        "type": "technical",
                    },
                    {
                        "name": "Fördelar och Nackdelar med Handladdning",
                        "description": "Jämförelse med kommersiell ammunition.",
                        "type": "technical",
                    },
                ],
            },
            {
                "name": "Utrustning och Verktyg",
                "description": "Startpaket, avancerad utrustning och underhåll",
                "type": "technical",
            },
            {
                "name": "Säkerhet vid Handladdning",
                "description": "Säker hantering av krut, brand/explosionssäkerhet m.m.",
                "type": "technical",
            },
            {
                "name": "Recept och Tester",
                "description": "Populära laddningsrecept, tester, anpassning för olika ändamål",
                "type": "technical",
            },
            {
                "name": "Kulor och Krut",
                "description": "Val av kulor, kruttyper, ballistiska beräkningar",
                "type": "technical",
            },
            {
                "name": "Precision och Optimering",
                "description": "Finslipning av laddningar, samverkan kulor/krut/tändhatt",
                "type": "technical",
            },
            {
                "name": "Handladdning - hagel",
                "description": "Introduktion, hagelkomponenter, slug/buckshot",
                "type": "technical",
            },
        ],
    },
    {
        "name": "Bushcraft och Prepping",
        "description": "Överlevnadstekniker, eldstart, boende, prepping, krisberedskap",
        "type": "discussion",
        "parent_id": None,
        "children": [
            {
                "name": "Överlevnadstekniker",
                "description": "Grunder i överlevnad, navigering och olika klimat",
                "type": "discussion",
            },
            {
                "name": "Eldstart och Matlagning",
                "description": "Metoder för eldstart, matlagningstekniker i naturen",
                "type": "discussion",
            },
            {
                "name": "Skydd och Boende i Naturen",
                "description": "Bygga skydd, täcken, sovsäckar, snögrottor m.m.",
                "type": "discussion",
            },
            {
                "name": "Ryggsäckar och Utrustning för Vandring",
                "description": "Packningstips, tester av ryggsäckar, kläder och tillbehör",
                "type": "discussion",
            },
            {
                "name": "Prepping och Krisberedskap",
                "description": "Hur man börjar med prepping och hanterar kriser",
                "type": "discussion",
            },
            {
                "name": "Matlagring och Vattenförvaring",
                "description": "Konservering av mat, vattenrening, förrådshantering",
                "type": "discussion",
            },
            {
                "name": "Krisplaner och Kommunikation",
                "description": "Familjeplaner, kommunikation under kris, bug out bags",
                "type": "discussion",
            },
            {
                "name": "Första Hjälpen och Medicinsk Utrustning",
                "description": "Skador, sjukdomar, herbal medicin i överlevnadssituationer",
                "type": "discussion",
            },
            {
                "name": "Fördjupningar och Specialämnen",
                "description": "Jordkällare, erbjudanden/resurser, odling, energilösningar m.m.",
                "type": "discussion",
            },
        ],
    },
    {
        "name": "Vapenpolitik och Juridik",
        "description": "Diskussioner om lagar, politik, juridik kring vapen",
        "type": "discussion",
        "parent_id": None,
        "children": [
            {
                "name": "Vapenlagar",
                "description": "Diskussioner om olika lagar/regler för vapenägande",
                "type": "discussion",
            },
            {
                "name": "Sverige och Internationella Jämförelser",
                "description": "Hur Sveriges lagar skiljer sig från andra länder",
                "type": "discussion",
            },
            {
                "name": "Diskutera Nya Förslag",
                "description": "Aktuella förslag och hur de påverkar vapenägare",
                "type": "discussion",
            },
            {
                "name": "Aktivism och Föreningar",
                "description": "Engagera sig i föreningar, lobbyism, påverkansarbete",
                "type": "discussion",
            },
            {
                "name": "Bevara Vapenägande",
                "description": "Argument för privat ägande, tradition, ansvar och utbildning",
                "type": "discussion",
            },
            {
                "name": "Amerikansk Vapenpolitik",
                "description": "Diskussion om USAs vapenlagar, NRA, 2nd Amendment m.m.",
                "type": "discussion",
            },
        ],
    },
    {
        "name": "Marknad och Utbyte",
        "description": "Köp/sälj av vapen, tillbehör, jaktarrenden m.m.",
        "type": "discussion",
        "parent_id": None,
        "children": [
            {
                "name": "Köp och Sälj",
                "description": "Vapen (licensierade transaktioner), tillbehör, ammo, m.m.",
                "type": "discussion",
            },
            {
                "name": "Jaktutbyte och Arrangemang",
                "description": "Erbjud jakttillfällen, arrenden, guider, gruppjakt",
                "type": "discussion",
            },
            {
                "name": "Specialerbjudanden och Tips",
                "description": "Kampanjer, rabatter, marknadsbevakning",
                "type": "discussion",
            },
            {
                "name": "Byteshandel och Donationer",
                "description": "Byt vapen/utrustning, donera överskott, hantverksbyte",
                "type": "discussion",
            },
            {
                "name": "Internationellt Utbyte",
                "description": "Jaktturer utanför Sverige, import/export, licenser",
                "type": "discussion",
            },
        ],
    },
    {
        "name": "Gemenskap och Diskussionsämnen",
        "description": "Introduktioner, off-topic, evenemang, hobbyer m.m.",
        "type": "discussion",
        "parent_id": None,
        "children": [
            {
                "name": "Introduktioner",
                "description": "Presentera dig, din jaktbakgrund, utrustning",
                "type": "discussion",
            },
            {
                "name": "Off-Topic",
                "description": "Allmän diskussion, humor, teknik, mat & dryck",
                "type": "discussion",
            },
            {
                "name": "Händelser och Mässor",
                "description": "Lokala/internationella event, mässor, meetups",
                "type": "discussion",
            },
            {
                "name": "Hobbyer och Sidoprojekt",
                "description": "Knivtillverkning, naturfoto, böcker & filmer, m.m.",
                "type": "discussion",
            },
            {
                "name": "Lokala Grupper och Gemenskaper",
                "description": "Region-specifika diskussioner, språkgrupper, ungdomsgrupper",
                "type": "discussion",
            },
            {
                "name": "Livsstil och Filosofi",
                "description": "Hur jakt/skytte påverkar vardagen, hållbarhet, familjeliv",
                "type": "discussion",
            },
            {
                "name": "Välgörenhet och Samhällsprojekt",
                "description": "Stöd för jaktrelaterade organisationer, utbildning, miljöprojekt",
                "type": "discussion",
            },
        ],
    },
]

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
