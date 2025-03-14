#!/usr/bin/env python3
# test_loads_expansion_debug.py
"""
Ett ännu mer detaljerat diagnostik-script för att felsöka expansions-problemen.

Vad gör skriptet?
1) Försöker hämta alla laddningar: GET /api/loads
   - Skriver ut eventuella 307 (redirect) eller 401.
   - Skriver ut hela JSON-svaret (eller text) om ej 200 OK.
   - Om 200, listor laddningarna med expansionsattribut.

2) Hämtar alla komponenter: GET /api/components
   - Samma överblick men ännu mer debug

3) Jämför ID i laddningarna (hullId, primerId, etc.) med existerande components
   och rapporterar saknade ID, expansions-keys, etc.
"""

import sys
import requests
from urllib.parse import urljoin

def debug_print_response(resp):
    """Hjälpfunktion för att skriva ut extra debug-info kring en requests.Response."""
    print(f"  URL: {resp.url}")
    print(f"  Status code: {resp.status_code}")
    if resp.history:
        print("  Redirect history:")
        for (i, r) in enumerate(resp.history, start=1):
            print(f"    {i}) {r.status_code} -> {r.url}")

    # Visa upp till 1000 tecken av body för debug
    body_preview = resp.text[:1000]
    print(f"  Body (preview): {body_preview}")
    if len(resp.text) > 1000:
        print("  ... (trunkerar pga. längd) ...")

def main():
    if len(sys.argv) < 3:
        print("Användning: python test_loads_expansion_debug.py <BASE_URL> <TOKEN>")
        print("Exempel: python test_loads_expansion_debug.py http://localhost:8000 eyJhbG...")
        sys.exit(1)

    base_url = sys.argv[1].rstrip("/")
    token = sys.argv[2]

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # ---------------------------------------------------------------------
    # STEP A: HÄMTA LADDNINGAR
    # ---------------------------------------------------------------------
    loads_url = urljoin(base_url + "/", "api/loads")
    # Om du vill testa om du EJ vill följa redirect => 
    # requests.get(..., headers=..., allow_redirects=False)
    print(f"=== STEG A: GET {loads_url} ===")
    resp_loads = requests.get(loads_url, headers=headers, allow_redirects=True)
    if resp_loads.status_code != 200:
        print(f"Fel! GET /api/loads => HTTP {resp_loads.status_code}")
        debug_print_response(resp_loads)
        sys.exit(1)

    # Skriv ut debug:
    if not resp_loads.headers.get("Content-Type", "").startswith("application/json"):
        print("Varning: Svar är inte JSON. Kanske en felsida? Nedan är body:")
        debug_print_response(resp_loads)
        sys.exit(1)

    loads = resp_loads.json()
    print(f"Antal laddningar: {len(loads)}")

    if len(loads) == 0:
        print("Inga laddningar att testa. Avbryter.")
        sys.exit(0)

    # Förbättrad utskrift:
    for i, ld in enumerate(loads, start=1):
        load_id = ld.get("id") or ld.get("_id")
        print(f"\n[{i}] Laddning: {ld.get('name')}  (id={load_id})")

        # Skriv ut ALLA nycklar:
        print("  Dokument (nyckel -> värde):")
        for k, v in ld.items():
            print(f"    {k} = {repr(v)}")

        print("  Expansionsstatus:")
        # Kolla ID-fält
        hID = ld.get("hullId")
        pID = ld.get("primerId")
        pwID = ld.get("powderId")
        wID = ld.get("wadId")
        shotLoads = ld.get("shotLoads", [])

        # expansions-objekt
        hullObj = ld.get("hullObject")
        primerObj = ld.get("primerObject")
        powderObj = ld.get("powderObject")
        wadObj = ld.get("wadObject")

        print(f"    hullId={hID},   hullObject finns? {'ja' if hullObj else 'nej'}")
        print(f"    primerId={pID}, primerObject finns? {'ja' if primerObj else 'nej'}")
        print(f"    powderId={pwID}, powderObject finns? {'ja' if powderObj else 'nej'}")
        print(f"    wadId={wID},     wadObject finns? {'ja' if wadObj else 'nej'}")

        if shotLoads:
            for j, sh in enumerate(shotLoads, start=1):
                mid = sh.get("modelId")
                co = sh.get("componentObject")
                print(f"    shotLoads[{j}]: modelId={mid}, componentObject? {'ja' if co else 'nej'}")
        else:
            print("    shotLoads=[]")

    # ---------------------------------------------------------------------
    # STEP B: HÄMTA KOMPONENTER
    # ---------------------------------------------------------------------
    comps_url = urljoin(base_url + "/", "api/components")
    print(f"\n=== STEG B: GET {comps_url} ===")
    resp_comps = requests.get(comps_url, headers=headers, allow_redirects=True)
    if resp_comps.status_code != 200:
        print(f"Fel! GET /api/components => HTTP {resp_comps.status_code}")
        debug_print_response(resp_comps)
        sys.exit(1)

    if not resp_comps.headers.get("Content-Type", "").startswith("application/json"):
        print("Varning: /api/components svarar inte JSON. Här är debug:")
        debug_print_response(resp_comps)
        sys.exit(1)

    comps = resp_comps.json()
    print(f"Antal komponenter: {len(comps)}")

    comp_map = {}
    for c in comps:
        cid = c.get("id") or c.get("_id")
        comp_map[cid] = c

    known_ids = set(comp_map.keys())

    # Skriv ut några exempel
    for i, c in enumerate(comps[:5], start=1):
        print(f"  Exempel-{i}: {c.get('name')} (id={c.get('id') or c.get('_id')}), type={c.get('type')}")

    # ---------------------------------------------------------------------
    # STEP C: Jämför ID i laddningarna
    # ---------------------------------------------------------------------
    print("\n=== STEG C: Analysera om hullId/primerId etc. matchar known component IDs ===")
    missing_ids = set()

    def check_id_possible(val):
        """Kollar om val är sträng av 24 hex - i så fall expansionsbart."""
        if isinstance(val, str) and len(val) == 24:
            # EJ validering av om alla tecken är 0-9a-f men det räcker långt
            return True
        return False

    for ld in loads:
        for field in ["hullId", "primerId", "powderId", "wadId"]:
            val = ld.get(field)
            if val and check_id_possible(val) and val not in known_ids:
                missing_ids.add(val)

        # shotLoads
        for sh in ld.get("shotLoads", []):
            mid = sh.get("modelId")
            if mid and check_id_possible(mid) and mid not in known_ids:
                missing_ids.add(mid)

    if missing_ids:
        print("Dessa 24-teckens ID saknas i /api/components men nämns i laddningarna:")
        for x in missing_ids:
            print(f"  - {x}")
        print("Därför blir expansionsfälten tomma.")
    else:
        print("Ingen mismatch: alla ID i laddningarna som ser ut som ObjectId hittas bland components.")

    print("\n=== KLART ===")
    print("Om expansionsfälten fortfarande är tomma, kolla att du verkligen lagrat _id med 24 hex.")
    print("Kolla även ev. 'inHull:'-prefix eller None, vilket expansionskoden ignorerar.")


if __name__ == "__main__":
    main()
