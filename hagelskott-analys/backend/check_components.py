import json
from pymongo import MongoClient

def main():
    # 1) Anslut till databasen
    client = MongoClient("mongodb://localhost:27017")
    db = client["hagelskott_db"]  # Se till att detta matchar din .env-inställning
    collection = db["components"]

    # 2) Hämta alla dokument, sorterade på `name` (1 = stigande)
    cursor = collection.find().sort("name", 1)

    # 3) Skriver ut varje dokument i JSON-format
    print("=== Alla komponenter (sorterade på name) ===")
    for doc in cursor:
        # För att kunna skriva ut objektet som JSON, måste vi konvertera ObjectId till str
        doc["_id"] = str(doc["_id"])
        # Skriv ut i "pretty" JSON med 2 indrag
        print(json.dumps(doc, indent=2, ensure_ascii=False))

    # 4) Visa lite statistik (antal dokument, hur många per typ, etc.)
    total_count = collection.count_documents({})
    print(f"\nTotalt antal komponenter: {total_count}")

    # Räkna hur många av varje `type`
    pipeline = [
        {"$group": {"_id": "$type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}  # störst först
    ]
    type_counts = list(collection.aggregate(pipeline))

    print("\n=== Fördelning per 'type' ===")
    for item in type_counts:
        _type = item["_id"]
        count = item["count"]
        print(f"  {_type}: {count}")

    # 5) (Valfritt) Hämta och visa alla `primer` för att se om de verkligen finns
    primer_cursor = collection.find({"type": "primer"}).sort("name", 1)
    primer_list = list(primer_cursor)
    print(f"\nAntal dokument med type='primer': {len(primer_list)}")
    if primer_list:
        print("Exempel på primer-dokument:")
        for pdoc in primer_list[:3]:  # visa max 3 st
            pdoc["_id"] = str(pdoc["_id"])
            print(json.dumps(pdoc, indent=2, ensure_ascii=False))

    # Avsluta
    client.close()

if __name__ == "__main__":
    main()
