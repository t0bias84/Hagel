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

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId
from typing import Optional, List
from pydantic import BaseModel, Field

# === Om du behöver roll-check ===
#    (Byt importväg om du ligger annorlunda i din struktur)
from app.api.routes.auth import get_current_active_user, UserInDB

from app.db.mongodb import db

router = APIRouter(prefix="/api/forum", tags=["Forum"])

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
    new_doc = {
        "name": cat_data["name"],
        "description": cat_data.get("description", ""),
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

# 4) seed_forum_categories – lägger in alla kategorier
@router.post("/seed")
async def seed_forum_categories(
    current_user: UserInDB = Depends(get_current_active_user)
):
    # Admin-check
    if "admin" not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Endast admin får seeda kategorier.")

    database = await db.get_database()
    for cat_data in FORUM_CATEGORIES:
        await create_category_recursive(database, cat_data)
    return {"message": "Forum categories seeded with large structure."}

# 5) get_all_categories – platt list av alla
@router.get("/categories", response_model=List[CategoryResponse])
async def get_all_categories():
    database = await db.get_database()
    cursor = database.categories.find()
    cats = await cursor.to_list(None)
    # Konvertera ObjectId -> str
    results = []
    for c in cats:
        c["_id"] = str(c["_id"])
        if c.get("parent_id"):
            c["parent_id"] = str(c["parent_id"])
        results.append(c)
    return results

# 6) get_single_category – enskild kategori
@router.get("/categories/{category_id}", response_model=CategoryResponse)
async def get_single_category(category_id: str):
    if not ObjectId.is_valid(category_id):
        raise HTTPException(status_code=400, detail="Ogiltigt kategori-ID-format")
    database = await db.get_database()
    cat_doc = await database.categories.find_one({"_id": ObjectId(category_id)})
    if not cat_doc:
        raise HTTPException(status_code=404, detail="Kategorin hittades inte")
    cat_doc["_id"] = str(cat_doc["_id"])
    if cat_doc.get("parent_id"):
        cat_doc["parent_id"] = str(cat_doc["parent_id"])
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
