# Fil: create_shotgun_baselines.py

import pymongo
from collections import defaultdict

def main():
    # 1) Anslut till din MongoDB – uppdatera vid behov
    client = pymongo.MongoClient("mongodb://localhost:27017/")
    db = client["hagelskott_db"]      # <-- justera om du har ett annat DB-namn

    # Den kollektion där du redan har ~34.7k dokument
    shotgun_data_coll = db["shotgun_data"]

    # Den nya kollektion vi vill skapa (du kan döpa den som du vill)
    shotgun_baselines_coll = db["shotgun_baselines"]

    # Om du vill börja om från tom kollektion varje gång (valfritt)
    # shotgun_baselines_coll.drop()

    # 2) Hämta alla dokument från shotgun_data
    all_docs = list(shotgun_data_coll.find({}))
    print(f"Hittade {len(all_docs)} dokument i 'shotgun_data'.")

    # 3) Gruppera dokumenten i en dict, baserat på en eller flera nycklar.
    #    - Minimalt brukar man behöva åtminstone (muzzle, shotSize, shotType).
    #    - Du kan även ta med alt, temp, cw om du vill skilja dem åt.
    #    - Exempel: group_key = (doc["muzzle"], doc["shotSize"], doc["shotType"], doc["alt"], doc["temp"], doc["cw"])
    #    - Om du vill *ignorera* alt/temp/cw i baslinjen, plocka inte in dem i nyckeln.

    groups = defaultdict(list)
    for doc in all_docs:
        muzzle_val = doc.get("muzzle", 1200)          # numeriskt, t.ex. 1100
        shot_size  = doc.get("shotSize", "").strip()  # ex. "6"
        shot_type  = doc.get("shotType", "").strip()  # ex. "Steel"

        # Gör en tuple som "grupperings-nyckel"
        # Tar här med enbart (muzzle, shotSize, shotType)
        group_key = (muzzle_val, shot_size, shot_type)

        groups[group_key].append(doc)

    # 4) För varje grupp, bygg ett "baseline-dokument" som innehåller en array "dataPoints"
    for (muzzle_val, shot_size, shot_type), doc_list in groups.items():
        # Sortera doc_list efter Yards så vi får stigande avstånd
        # Dina Yards är troligen sträng, så konvertera:
        doc_list.sort(key=lambda d: float(d.get("Yards", 0)))

        data_points = []
        for d in doc_list:
            try:
                dist_y  = float(d.get("Yards", 0))
                vel_fps = float(d.get("Vel", 0))
                en_ftlb = float(d.get("Energy", 0))
            except (TypeError, ValueError):
                # Skippa dokument om konvertering inte funkar
                continue

            data_points.append({
                "distance_yd": dist_y,
                "velocity_fps": vel_fps,
                "energy_ftlbs": en_ftlb
                # Valfritt: om du vill spara "Drop", "Drift", "TOF_sec" etc., släng in dem här
            })

        if not data_points:
            continue  # hoppa över om tom

        # Bygg nya baseline-dokumentet
        baseline_doc = {
            "shotType": shot_type,       # t.ex. "Steel"
            "shotSize": shot_size,       # t.ex. "6"
            "muzzleVelocity": muzzle_val, # t.ex. 1100
            "dataPoints": data_points    # array av {distance_yd, velocity_fps, energy_ftlbs}
        }

        # 5) Spara i "shotgun_baselines"
        shotgun_baselines_coll.insert_one(baseline_doc)

    print("Färdigt! Nu finns 'shotgun_baselines' med kurvor.")
    client.close()

if __name__ == "__main__":
    main()
