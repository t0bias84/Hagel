#!/usr/bin/env python3
# test_loads_expansion.py
"""
Ett diagnostik-script för att felsöka varför expansions-data inte dyker upp.
1) Hämtar alla laddningar (GET /api/loads).
2) Hämtar alla komponenter (GET /api/components).
3) Jämför de ID:n som laddningarna har (hullId, primerId, etc.) med komponentlistan.
4) Rapporterar mismatchar (ID som saknas i components).
5) Skriver ut om expansionsfälten (xxxObject) redan är närvarande i laddningen.
"""
import sys
import requests

def main():
    if len(sys.argv) < 3:
        print("Användning: python test_loads_expansion.py <BASE_URL> <TOKEN>")
        print("Exempel: python test_loads_expansion.py http://localhost:8000 eyJh...")
        sys.exit(1)

    base_url = sys.argv[1].rstrip("/")
    token = sys.argv[2]

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    print("=== STEG A: Hämta alla laddningar (GET /api/loads) ===")
    loads_url = f"{base_url}/api/loads"
    resp_loads = requests.get(loads_url, headers=headers)
    if resp_loads.status_code != 200:
        print(f"Fel! GET /api/loads => HTTP {resp_loads.status_code}")
        print("Response:", resp_loads.text)
        sys.exit(1)

    loads = resp_loads.json()
    print(f"Antal laddningar: {len(loads)}")
    if len(loads) == 0:
        print("Inga laddningar att testa. Avbryter.")
        sys.exit(0)

    #  Skriv ut ID:na + expansionsfälten
    for i, ld in enumerate(loads, start=1):
        print(f"\n[{i}] Laddning: {ld.get('name')}  (id={ld.get('id', ld.get('_id'))})")
        print(f"  hullId={ld.get('hullId')}, primerId={ld.get('primerId')}, powderId={ld.get('powderId')}, wadId={ld.get('wadId')}")

        # shotLoads
        shotLoads = ld.get("shotLoads", [])
        if shotLoads:
            for j, sh in enumerate(shotLoads, start=1):
                modelId = sh.get("modelId")
                print(f"  shotLoads[{j}].modelId={modelId}")
        else:
            print(f"  shotLoads=[]")

        # expansionsobjekt
        hullObject = ld.get("hullObject")
        primerObject = ld.get("primerObject")
        powderObject = ld.get("powderObject")
        wadObject = ld.get("wadObject")

        # Debug: visar om expansionsfälten redan är ifyllda
        if hullObject:
            print(f"    hullObject: {hullObject.get('name')} (id={hullObject.get('_id')})")
        if primerObject:
            print(f"    primerObject: {primerObject.get('name')} (id={primerObject.get('_id')})")
        if powderObject:
            print(f"    powderObject: {powderObject.get('name')} (id={powderObject.get('_id')})")
        if wadObject:
            print(f"    wadObject: {wadObject.get('name')} (id={wadObject.get('_id')})")

        # shotLoads => componentObject
        for j, sh in enumerate(shotLoads, start=1):
            co = sh.get("componentObject")
            if co:
                print(f"    shotLoads[{j}].componentObject: {co.get('name')} (id={co.get('_id')})")

    print("\n=== STEG B: Hämta alla komponenter (GET /api/components) ===")
    comps_url = f"{base_url}/api/components"
    resp_comps = requests.get(comps_url, headers=headers)
    if resp_comps.status_code != 200:
        print(f"Fel! GET /api/components => HTTP {resp_comps.status_code}")
        print("Response:", resp_comps.text)
        sys.exit(1)

    comps = resp_comps.json()
    print(f"Antal komponenter: {len(comps)}")
    comp_map = {}
    for c in comps:
        cid = c.get("id", c.get("_id"))
        comp_map[cid] = c
    # lista några
    for i, c in enumerate(comps[:10], start=1):
        print(f"  [{i}] {c.get('name')}  (id={c.get('id', c.get('_id'))}), type={c.get('type')}")

    #  Skapa en set() av alla known ids
    known_comp_ids = set(comp_map.keys())

    print("\n=== STEG C: Jämför laddningarnas ID:n med existerande komponenter ===")
    missing_ids = set()
    for ld in loads:
        for field in ["hullId", "primerId", "powderId", "wadId"]:
            val = ld.get(field)
            if val and val not in known_comp_ids and not val.startswith("inHull:"):
                missing_ids.add(val)

        # shotLoads
        shotLoads = ld.get("shotLoads", [])
        for sh in shotLoads:
            mid = sh.get("modelId")
            if mid and mid not in known_comp_ids:
                missing_ids.add(mid)

    if missing_ids:
        print("Dessa ID saknas i /api/components men nämns i laddningarna:")
        for mid in missing_ids:
            print(f"  - {mid}")
        print("Detta kan förklara varför expansions-fält inte fylls i!")
    else:
        print("Alla hullId/primerId/powderId/wadId/shotLoads[*].modelId matchade existerande komponenter.")

    print("\n=== KLART ===")
    print("Om expansionsfälten (ex. hullObject) är tomma i laddningarna, kan det bero på att ID saknats i /api/components.")
    print("Se även debug-output ovan för att se om expansionsfälten redan var ifyllda eller ej.")


if __name__ == "__main__":
    main()
