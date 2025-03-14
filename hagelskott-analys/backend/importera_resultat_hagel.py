import json
from pymongo import MongoClient

def main():
    with open("shotgun_combos_result.json", "r") as f:
        data = json.load(f)  # data är en lista av dict

    client = MongoClient("mongodb://localhost:27017")
    db = client["test_db"]  # byt till ditt databasnamn
    coll = db["shotgun_data"]
    result = coll.insert_many(data)
    print("Antal insatta dokument:", len(result.inserted_ids))

if __name__ == "__main__":
    main()
