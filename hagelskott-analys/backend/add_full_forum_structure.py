import asyncio
from datetime import datetime
from typing import Dict, List, Optional
from app.db.mongodb import db

# Complete forum structure definition
forum_structure = [
    {
        "name": "Jakt",
        "description": "Diskussioner om jakt och jaktmetoder",
        "type": "discussion",
        "subcategories": [
            {
                "name": "Allmän Jakt",
                "description": "Jaktberättelser och upplevelser",
                "type": "discussion",
                "subcategories": [
                    {
                        "name": "Jaktberättelser och Upplevelser",
                        "description": "Dela dina senaste jaktäventyr och erfarenheter",
                        "type": "discussion"
                    },
                    {
                        "name": "Nyheter och Uppdateringar",
                        "description": "Diskutera aktuella händelser och förändringar inom jaktvärlden",
                        "type": "discussion"
                    },
                    {
                        "name": "Jaktetik och Säkerhet",
                        "description": "Debattera etiska frågor och säkerhetsaspekter inom jakten",
                        "type": "discussion"
                    }
                ]
            },
            {
                "name": "Jaktmetoder",
                "description": "Strategier och tekniker för olika jaktformer",
                "type": "discussion",
                "subcategories": [
                    {
                        "name": "Smygjakt",
                        "description": "Strategier och tips för effektiv smygjakt",
                        "type": "discussion"
                    },
                    {
                        "name": "Vakjakt",
                        "description": "Diskussioner om utrustning och tekniker för vakjakt",
                        "type": "discussion"
                    },
                    {
                        "name": "Drivjakt",
                        "description": "Erfarenheter och råd kring drivjakt",
                        "type": "discussion"
                    },
                    {
                        "name": "Jakt med Hund",
                        "description": "Diskussioner om olika typer av jakthundar",
                        "type": "discussion",
                        "subcategories": [
                            {
                                "name": "Ställande Hundar",
                                "description": "Användning och träning av ställande hundar i jakt",
                                "type": "discussion"
                            },
                            {
                                "name": "Drivande Hundar",
                                "description": "Diskutera raser och tekniker för drivande hundar",
                                "type": "discussion"
                            },
                            {
                                "name": "Apportörer",
                                "description": "Tips för träning och användning av apportörer",
                                "type": "discussion"
                            },
                            {
                                "name": "Grythundar",
                                "description": "Erfarenheter av jakt med grythundar",
                                "type": "discussion"
                            }
                        ]
                    }
                ]
            },
            {
                "name": "Viltarter",
                "description": "Diskussioner om olika viltarter",
                "type": "discussion",
                "subcategories": [
                    {
                        "name": "Högvilt",
                        "description": "Diskussioner om älg, hjort och vildsvin",
                        "type": "discussion",
                        "subcategories": [
                            {
                                "name": "Älgjakt",
                                "description": "Strategier och erfarenheter från älgjakt",
                                "type": "discussion"
                            },
                            {
                                "name": "Hjortjakt",
                                "description": "Diskutera jakt på olika hjortarter",
                                "type": "discussion"
                            },
                            {
                                "name": "Vildsvinsjakt",
                                "description": "Tips och råd för effektiv vildsvinsjakt",
                                "type": "discussion"
                            }
                        ]
                    },
                    {
                        "name": "Småvilt",
                        "description": "Diskussioner om rådjur, hare och räv",
                        "type": "discussion",
                        "subcategories": [
                            {
                                "name": "Rådjursjakt",
                                "description": "Erfarenheter och metoder för rådjursjakt",
                                "type": "discussion"
                            },
                            {
                                "name": "Harjakt",
                                "description": "Diskussioner om jakt på hare",
                                "type": "discussion"
                            },
                            {
                                "name": "Rävjakt",
                                "description": "Strategier och utrustning för rävjakt",
                                "type": "discussion"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "name": "Vapen och Ammunition",
        "description": "Diskussioner om vapen, ammunition och laddning",
        "type": "technical",
        "subcategories": [
            {
                "name": "Vapentyper",
                "description": "Diskussioner om olika vapentyper och deras användning",
                "type": "technical",
                "subcategories": [
                    {
                        "name": "Hagelgevär",
                        "description": "Diskussioner om dubbellopp, halvautomatiska och pumphagelgevär",
                        "type": "technical"
                    },
                    {
                        "name": "Kulgevär",
                        "description": "Diskussioner om olika typer av kulgevär",
                        "type": "technical"
                    }
                ]
            },
            {
                "name": "Ammunition",
                "description": "Diskussioner om olika typer av ammunition",
                "type": "technical"
            }
        ]
    },
    {
        "name": "Handladdning",
        "description": "Diskussioner om handladdning av ammunition",
        "type": "technical",
        "subcategories": [
            {
                "name": "Handladdning - kula",
                "description": "Introduktion och diskussion om handladdning av kula",
                "type": "technical",
                "subcategories": [
                    {
                        "name": "Introduktion till Handladdning",
                        "description": "Vad är handladdning och varför gör man det?",
                        "type": "technical"
                    },
                    {
                        "name": "Lagkrav och Regler för Handladdning",
                        "description": "Lagar och regler i Sverige och andra länder",
                        "type": "technical"
                    },
                    {
                        "name": "Fördelar och Nackdelar med Handladdning",
                        "description": "Jämförelse med kommersiell ammunition",
                        "type": "technical"
                    }
                ]
            },
            {
                "name": "Utrustning och Verktyg",
                "description": "Diskussioner om utrustning och verktyg för handladdning",
                "type": "technical",
                "subcategories": [
                    {
                        "name": "Startpaket för Nybörjare",
                        "description": "Rekommendationer för utrustning till nybörjare",
                        "type": "technical"
                    },
                    {
                        "name": "Avancerad Utrustning för Erfaren Handladdare",
                        "description": "Automatiserade pressar och specialverktyg",
                        "type": "technical"
                    }
                ]
            }
        ]
    },
    {
        "name": "Bushcraft och Prepping",
        "description": "Diskussioner om överlevnad, bushcraft och prepping",
        "type": "discussion",
        "subcategories": [
            {
                "name": "Överlevnadstekniker",
                "description": "Grunder och avancerade tekniker för överlevnad",
                "type": "discussion",
                "subcategories": [
                    {
                        "name": "Grunder i Överlevnad",
                        "description": "De mest grundläggande teknikerna för att överleva i naturen",
                        "type": "discussion"
                    },
                    {
                        "name": "Navigering utan Teknologi",
                        "description": "Hur man använder karta, kompass och naturtecken för att navigera",
                        "type": "discussion"
                    }
                ]
            },
            {
                "name": "Matlagring och Vattenförvaring",
                "description": "Diskussioner om lagring av mat och vatten",
                "type": "discussion",
                "subcategories": [
                    {
                        "name": "Konservering av Mat",
                        "description": "Tekniker för att bevara mat under långa perioder",
                        "type": "discussion"
                    },
                    {
                        "name": "Vattenrening",
                        "description": "Hur man renar och förvarar vatten säkert",
                        "type": "discussion"
                    }
                ]
            }
        ]
    },
    {
        "name": "Vapenpolitik och Juridik",
        "description": "Diskussioner om vapenlagar, politik och juridiska frågor",
        "type": "discussion",
        "subcategories": [
            {
                "name": "Vapenlagar",
                "description": "Diskussioner om lagar och regler för vapenägande",
                "type": "discussion",
                "subcategories": [
                    {
                        "name": "Svenska Vapenlagar",
                        "description": "Diskussioner om Sveriges nuvarande lagstiftning",
                        "type": "discussion"
                    },
                    {
                        "name": "Licenshantering",
                        "description": "Tips och erfarenheter om licensansökningar",
                        "type": "discussion"
                    }
                ]
            },
            {
                "name": "Aktivism och Föreningar",
                "description": "Engagemang i föreningar och påverkansarbete",
                "type": "discussion",
                "subcategories": [
                    {
                        "name": "Föreningsengagemang",
                        "description": "Diskussioner om vapenföreningar",
                        "type": "discussion"
                    }
                ]
            }
        ]
    },
    {
        "name": "Gemenskap",
        "description": "Forum för socialt utbyte och diskussion",
        "type": "discussion",
        "subcategories": [
            {
                "name": "Introduktioner",
                "description": "En plats för nya medlemmar att presentera sig",
                "type": "discussion"
            },
            {
                "name": "Evenemang",
                "description": "Information om jakt- och skytteevenemang",
                "type": "discussion"
            }
        ]
    }
]

async def delete_all_categories() -> None:
    """Delete all existing categories from the database"""
    try:
        database = await db.get_database()
        result = await database.categories.delete_many({})
        print(f"Deleted {result.deleted_count} categories")
    except Exception as e:
        print(f"Error deleting categories: {e}")
        raise

async def add_category(category: Dict, parent_id: Optional[str] = None) -> str:
    """
    Add a category and return its ID
    
    Args:
        category: Category data
        parent_id: Parent category ID if exists
        
    Returns:
        str: The new category ID
    """
    try:
        database = await db.get_database()
        
        category_data = {
            "name": category["name"],
            "description": category["description"],
            "type": category["type"],
            "parent_id": parent_id,
            "threadCount": 0,
            "postCount": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await database.categories.insert_one(category_data)
        category_id = str(result.inserted_id)
        print(f"Added category: {category['name']}")
        
        if "subcategories" in category:
            for subcategory in category["subcategories"]:
                await add_category(subcategory, category_id)
                
        return category_id
        
    except Exception as e:
        print(f"Error adding category {category['name']}: {e}")
        raise

async def create_forum_structure() -> None:
    """Create the complete forum structure"""
    try:
        print("Deleting existing categories...")
        await delete_all_categories()
        
        print("Creating new forum structure...")
        for category in forum_structure:
            await add_category(category)
            
        print("Forum structure created successfully!")
        
    except Exception as e:
        print(f"Error creating forum structure: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(create_forum_structure())