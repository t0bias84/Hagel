#!/usr/bin/env python3
"""
import_official_loads.py

Ett script som läser in officiella hagelladdningar från en JSON-fil,
och POSTar dem till /api/loads/shotshell med "isOfficial": true m.m.

Exekveringsexempel:
   python import_official_loads.py official_loads.json <BASE_URL> <TOKEN>

Där:
  - official_loads.json => Fil med officiella laddningar i JSON-format
  - BASE_URL => t.ex. http://localhost:8000
  - TOKEN => JWT-token (Bearer), ex. eyJhbGciOiJIUz...
"""
import sys
import json
import requests

def main():
    if len(sys.argv) < 4:
        print("Användning: python import_official_loads.py <JSON_FILE> <BASE_URL> <TOKEN>")
        sys.exit(1)

    json_file = sys.argv[1]
    base_url = sys.argv[2].rstrip("/")
    token = sys.argv[3]

    # Endpoint för att skapa hagelladdning
    create_url = f"{base_url}/api/loads/shotshell"

    # 1) Läs in JSON-data
    try:
        with open(json_file, "r", encoding="utf-8") as f:
            official_loads = json.load(f)
    except Exception as e:
        print(f"Fel vid inläsning av {json_file}: {e}")
        sys.exit(1)

    # 2) Förbered HTTP-header
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 3) Gå igenom varje "officiell laddning" och POST:a till servern
    num_success = 0
    num_fail = 0

    if not isinstance(official_loads, list):
        print("JSON-filen förväntas vara en lista (array) av laddningar. Avbryter.")
        sys.exit(1)

    for idx, load_item in enumerate(official_loads, start=1):
        # Se till att fältet "isOfficial" är true
        # samt sätt ev. "approvedBy" eller "officialSource" om ni vill.
        load_item["isPublic"] = True
        load_item["isOfficial"] = True
        load_item["approvedBy"] = load_item.get("approvedBy", "UnnamedVendor")

        # Bygg JSON
        try:
            # Skicka laddningen till servern
            resp = requests.post(create_url, headers=headers, json=load_item)
            if resp.status_code == 200 or resp.status_code == 201:
                print(f"[{idx}] OK: {load_item.get('name','(ingen namn)')}")
                num_success += 1
            else:
                print(f"[{idx}] Misslyckades (HTTP {resp.status_code}): {resp.text}")
                num_fail += 1
        except Exception as e:
            print(f"[{idx}] Fel vid POST: {e}")
            num_fail += 1

    print(f"\nImport klar. Lyckade: {num_success}, Misslyckade: {num_fail}")

if __name__ == "__main__":
    main()
