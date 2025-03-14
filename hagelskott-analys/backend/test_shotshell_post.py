#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
test_expanded_shotshell.py
==========================
Ett utförligt test-/felsökningsscript som:

1) Loggar in (eller använder befintlig token) – om din API kräver inlogg.
2) Skapar en shotshell-laddning via POST /api/loads/shotshell
3) Använder ex. 'hullId', 'primerId' etc. med (fejkade) ObjectId i "components"-kollektionen
4) Hämtar /api/loads (GET) och skriver ut JSON (kollar expansion)
5) Hämtar enskild laddning (GET /api/loads/{id})
6) Uppdaterar laddningen (PUT) -> ex. byter hullId
7) Hämtar igen (GET) -> inspekterar expansionsfälten

Kör:
   python test_expanded_shotshell.py [BASE_URL] [TOKEN]

Ex:
   python test_expanded_shotshell.py http://localhost:8000 'eyJhbGciOiJIUz...'
"""

import sys
import requests
import json

def main():
    if len(sys.argv) < 3:
        print("Användning: python test_expanded_shotshell.py <BASE_URL> <TOKEN>")
        print("Exempel: python test_expanded_shotshell.py http://localhost:8000 eyJhbG...")
        sys.exit(1)

    base_url = sys.argv[1].rstrip("/")
    token = sys.argv[2]

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    # 1) Hitta valfria component-id:n (om du vill testa expansion)
    #    Du får anpassa dem till existerande data i din 'components'-kollektion.
    #    Dessa ID måste givetvis finnas i DB. Ex. "64faa242c14ee4a0f6006e91".
    hull_id = "64faa242c14ee4a0f6006e91"
    primer_id = "64faa242c14ee4a0f6006e92"
    powder_id = "64faa242c14ee4a0f6006e93"
    wad_id = "64faa242c14ee4a0f6006e94"
    shot_model_id = "64faa242c14ee4a0f6006e95"  # Om du har "modelId" i shotLoads

    # 2) Skapa en test-laddning (Shotshell) med expansionsfält
    new_shotshell = {
        "name": "DebugShotshell #1",
        "description": "Testar expansions-fält av hull & primer.",
        "isPublic": True,
        "gauge": "12",
        "shellLength": 70.0,
        "hullId": hull_id,
        "primerId": primer_id,
        "powderId": powder_id,
        "powderCharge": 1.3,
        "wadId": wad_id,
        "shotLoads": [
            {
                "material": "steel",
                "weight_g": 28.0,
                "shotSize": "#4",
                "modelId": shot_model_id
            }
        ],
        "filler_g": 0,
        "crimp": {
            "type": "star"
        },
        "source": "debug, test, expansions"
    }

    print("=== STEG A: POST /api/loads/shotshell ===")
    create_url = f"{base_url}/api/loads/shotshell"
    resp = requests.post(create_url, headers=headers, data=json.dumps(new_shotshell))

    print("Status code:", resp.status_code)
    try:
        created_data = resp.json()
    except:
        created_data = {}
    print("Response JSON:", json.dumps(created_data, indent=2))

    if resp.status_code != 200 and resp.status_code != 201:
        print("Kunde inte skapa shotshell-laddning. Avbryter.")
        return

    new_id = created_data.get("id")
    if not new_id:
        print("Shotshell-laddning saknar 'id' i svaret! Avbryter.")
        return

    print(f"Skapade laddning med id = {new_id}")

    # Kolla om expansionsfälten redan nu
    print("\nKollar om expansionsfälten finns:")
    for field in ["hullObject", "primerObject", "powderObject", "wadObject"]:
        if field in created_data:
            print(f" - {field} finns ✅")
        else:
            print(f" - {field} saknas ❌ (kanske fanns inte ID i DB)")

    # 3) Hämta alla laddningar => /api/loads
    print("\n=== STEG B: GET /api/loads ===")
    list_url = f"{base_url}/api/loads"
    resp2 = requests.get(list_url, headers=headers)
    print("Status code:", resp2.status_code)
    try:
        loads_list = resp2.json()
    except:
        loads_list = []
    print("Response LENGTH:", len(loads_list))
    # Skriv ut lite av varje
    for i, ld in enumerate(loads_list[:3]):  # Bara visa de 3 första
        print(f"Load #{i+1} => {json.dumps(ld, indent=2)}")

    # 4) Hämta en enskild (GET /api/loads/{new_id})
    print(f"\n=== STEG C: GET /api/loads/{new_id} ===")
    single_url = f"{base_url}/api/loads/{new_id}"
    resp3 = requests.get(single_url, headers=headers)
    print("Status code:", resp3.status_code)
    single_data = {}
    try:
        single_data = resp3.json()
    except:
        pass
    print("Response JSON:", json.dumps(single_data, indent=2))

    # 5) Uppdatera laddningen (ex. byter hullId)
    print("\n=== STEG D: PUT /api/loads/{new_id} (uppdaterar hullId) ===")
    update_url = f"{base_url}/api/loads/{new_id}"
    updates = {
        "name": "DebugShotshell #1 - updated",
        "hullId": "64faa242c14ee4a0f6006eee"  # nån annan fejk
    }
    resp4 = requests.put(update_url, headers=headers, data=json.dumps(updates))
    print("Status code:", resp4.status_code)
    updated_response = {}
    try:
        updated_response = resp4.json()
    except:
        pass
    print("Response JSON:", json.dumps(updated_response, indent=2))

    # 6) Hämta igen, kolla expansions
    print(f"\n=== STEG E: GET /api/loads/{new_id} igen ===")
    resp5 = requests.get(single_url, headers=headers)
    final_data = {}
    try:
        final_data = resp5.json()
    except:
        pass
    print("Status code:", resp5.status_code)
    print("Response JSON:", json.dumps(final_data, indent=2))

    print("\n=== Kollar expansionsfälten efter PUT ===")
    for field in ["hullObject", "primerObject", "powderObject", "wadObject"]:
        if field in final_data:
            print(f" - {field} finns ✅")
        else:
            print(f" - {field} saknas ❌")

    print("\n=== KLART ===")
    print("Om expansions saknas: kontrollera att hullId mm. finns i `components`-kollektionen,")
    print("och att expand_components_in_loads() verkligen matchar vald ID med component._id.\n")


if __name__ == "__main__":
    main()
