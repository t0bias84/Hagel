import os
import sys
import traceback
from pymongo import MongoClient

print("Checking MongoDB connection...")
try:
    client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=2000)
    server_info = client.server_info()
    print(f"MongoDB connection successful! Server info: {server_info['version']}")
    
    # Lista databaser
    print("\nAvailable databases:")
    for db in client.list_databases():
        print(f" - {db['name']} ({db['sizeOnDisk']} bytes)")
    
    # Kontrollera om hagelskott_db finns och vilka collections den har
    if "hagelskott_db" in client.list_database_names():
        print("\nCollections in hagelskott_db:")
        db = client["hagelskott_db"]
        for collection in db.list_collections():
            print(f" - {collection['name']}")
        
        # Kontrollera om users collection finns
        if "users" in db.list_collection_names():
            print("\nNumber of documents in users collection:", db.users.count_documents({}))
    
except Exception as mongo_err:
    print(f"MongoDB connection failed: {str(mongo_err)}")
    print("Make sure MongoDB is installed and running on port 27017")
    traceback.print_exc()

print("\nPress Enter to exit...")
input() 