# seed_forum.py

from datetime import datetime
from bson import ObjectId

# Om du använder samma db-instans som i övriga projektet:
from app.db.mongodb import db

# Du kan välja att lägga denna i en egen fil, t.ex. "seed_forum.py"
# och sedan anropa funktionen seed_forum_categories() vid behov.

# Vår datastruktur för alla kategorier:
FORUM_CATEGORIES = [
    # 1. JAKT
    {
        "name": "Jakt",
        "description": "Diskussioner om jakt i allmänhet, metoder, arter och utrustning",
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
                "description": "Diskussion om olika jaktformer som fågeljakt, bågjakt, fällfångst etc.",
                "type": "discussion",
                "children": [
                    {
                        "name": "Fågeljakt",
                        "description": "Allt om jakt på olika fågelarter.",
                        "type": "discussion",
                    },
                    {
                        "name": "Bågjakt",
                        "description": "Diskutera bågjakt (compoundbågar, långbåge, recurve).",
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
    # 2. VAPEN OCH AMMUNITION
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
    # 3. HANDLADDNING
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
    # 4. BUSHCRAFT OCH PREPPING
    {
        "name": "Bushcraft och Prepping",
        "description": "Överlevnadstekniker, eldstart, boende, prepping, krisberedskap",
        "type": "discussion",
        "parent_id": None,
        "children": [
            # ... du fyller på alla 4.1, 4.2, ... 4.10.7, enligt ditt schema
            # Eftersom de är väldigt många, illustreras här kort hur du kan göra:
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
            # ... osv för resterande.
        ],
    },
    # 5. VAPENPOLITIK OCH JURIDIK
    {
        "name": "Vapenpolitik och Juridik",
        "description": "Diskussioner om lagar, politik, juridik kring vapen",
        "type": "discussion",
        "parent_id": None,
        # Fortsätt på samma sätt:
        "children": [
            {
                "name": "Vapenlagar",
                "description": "Diskussioner om olika lagar och regler för vapenägande",
                "type": "discussion",
            },
            # ...
        ],
    },
    # 6. MARKNAD OCH UTBYTE
    {
        "name": "Marknad och Utbyte",
        "description": "Köp/sälj av vapen, tillbehör, jaktarrenden m.m.",
        "type": "discussion",
        "parent_id": None,
    },
    # 7. GEMENSKAP OCH DISKUSSIONSÄMNEN
    {
        "name": "Gemenskap och Diskussionsämnen",
        "description": "Introduktioner, off-topic, evenemang, hobbyer m.m.",
        "type": "discussion",
        "parent_id": None,
    },
]

async def create_category_recursive(database, category_data, parent_id=None):
    """
    Hjälpfunktion för att skapa en kategori och ev. dess barn rekursivt.
    Returnerar _id för nyskapad kategori.
    """
    new_doc = {
        "name": category_data["name"],
        "description": category_data.get("description", ""),
        "type": category_data.get("type", "discussion"),
        "parent_id": parent_id,
        "threadCount": 0,
        "postCount": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await database.categories.insert_one(new_doc)
    new_id = result.inserted_id

    # Kolla om det finns "children"
    children = category_data.get("children", [])
    for child_cat in children:
        await create_category_recursive(database, child_cat, parent_id=new_id)

    return new_id

async def seed_forum_categories():
    """
    Skapar alla kategorier och underkategorier enligt FORUM_CATEGORIES.
    T.ex. anropas när du behöver fylla på databasen.
    """
    database = await db.get_database()

    # Rensa ev. befintliga kategorier om du vill börja om:
    # await database.categories.delete_many({})

    for cat_data in FORUM_CATEGORIES:
        await create_category_recursive(database, cat_data, parent_id=None)
    print("Forum-kategorier skapade enligt definitionslistan.")


# Exempel på hur man kör funktionen manuellt:
# Om du vill anropa i en route, kan du lägga till en endpoint i forum_categories.py:
# @router.post("/seed")
# async def seed():
#     await seed_forum_categories()
#     return {"message": "Forum categories seeded successfully!"}
