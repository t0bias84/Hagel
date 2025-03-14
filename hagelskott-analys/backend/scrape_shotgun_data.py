#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import time
import json
import sys

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
from selenium.common.exceptions import NoSuchElementException

def debug_print(*args):
    """ En enkel debug-funktion för utskrifter. """
    print("[DEBUG]", *args)

def parse_table_data(text):
    """
    Parsar texten från <div id="data_out"> rad för rad.
    Returnerar en lista av dictar, en per rad i ballistik-tabellen.
    Ex:
      [
        {"Yards": "0", "Vel": "1350", "Energy": "3.6", "Drop": "0.0", "Drift": "0.0", "TOF_sec": "0.000"},
        ...
      ]
    """
    rows = []
    lines = text.strip().splitlines()
    if not lines:
        debug_print("Ingen text i parse_table_data()")
        return rows

    header_line = lines[0]
    debug_print("Header line:", repr(header_line))
    data_lines = lines[1:]  # resten av raderna antas vara data

    for line in data_lines:
        line = line.strip()
        if not line:
            continue
        # Ex. "0   1350 3.6 0.0 0.0 0.000"
        parts = line.split()
        if len(parts) < 6:
            debug_print("För få kolumner i rad:", parts)
            continue

        rowdict = {}
        rowdict["Yards"]   = parts[0]
        rowdict["Vel"]     = parts[1]
        rowdict["Energy"]  = parts[2]
        rowdict["Drop"]    = parts[3]
        rowdict["Drift"]   = parts[4]
        rowdict["TOF_sec"] = parts[5]
        rows.append(rowdict)

    return rows

def main():
    print("[DEBUG] Startar ChromeDriver (Selenium) ...")
    driver = webdriver.Chrome()
    driver.implicitly_wait(3)  # sekunder

    # Öppna sidan
    url = "https://www.ctmuzzleloaders.com/ctml_experiments/shot-ballistics/shotgunning.html"
    debug_print("Öppnar URL:", url)
    driver.get(url)

    # 1) Lista på hagelstorlekar, enligt dropdownen (OBS exakt stavning).
    all_shot_sizes = [
        "11","10","9 1/2","9","8 1/2","8","7 1/2","7","6","5","4",
        "3","2","1","BB","#4 Buck","#3 Buck","#1 Buck","#0 Buck","#00 Buck"
    ]

    # 2) Lista på shot types, enligt dropdown (OBS "Heavi-Shot" stavas exakt så).
    all_shot_types = [
        "Steel",
        "Bismuth",
        "Tung-Iron",
        "Tung_Matx",
        "Chilled",
        "Pure Lead",
        "Heavi-Shot"
    ]

    # 3) Hastigheter (fps)
    all_muzzle_vels = [1000, 1100, 1200, 1300, 1400, 1500]

    # 4) Temperaturer
    all_temps = ["70", "10"]

    # 5) Altitude (här enbart 'Sea Lvl' som exempel) + crosswind 0
    alt_val = "Sea Lvl"
    cw_val = "0"

    # Bygg upp alla kombinationer:
    combos_to_test = []
    for muzzle in all_muzzle_vels:
        for shot_size in all_shot_sizes:
            for shot_type in all_shot_types:
                for temp in all_temps:
                    combo = {
                        "muzzle": muzzle,
                        "shotSize": shot_size,
                        "shotType": shot_type,
                        "alt": alt_val,
                        "temp": temp,
                        "cw": cw_val
                    }
                    combos_to_test.append(combo)

    debug_print(f"Totalt {len(combos_to_test)} kombinationer att testa.")

    all_data = []

    for combo in combos_to_test:
        debug_print(
            f"Testar: muzzle={combo['muzzle']}, "
            f"shotSize={combo['shotSize']}, "
            f"shotType={combo['shotType']}, "
            f"alt={combo['alt']}, "
            f"temp={combo['temp']}, "
            f"cw={combo['cw']}"
        )
        try:
            # 1) Muzzle velocity
            muzzleVel_input = driver.find_element(By.ID, "muzzle_vel_id")
            muzzleVel_input.clear()
            muzzleVel_input.send_keys(str(combo["muzzle"]))

            # 2) Shot size
            sel_shotSize = Select(driver.find_element(By.ID, "shot_size_id"))
            sel_shotSize.select_by_visible_text(combo["shotSize"])

            # 3) Shot type
            sel_shotType = Select(driver.find_element(By.ID, "shot_type_id"))
            sel_shotType.select_by_visible_text(combo["shotType"])

            # 4) Altitude (dropdown)
            sel_alt = Select(driver.find_element(By.ID, "altitude_list_id"))
            sel_alt.select_by_visible_text(combo["alt"])

            # 5) Temperature (input)
            temp_input = driver.find_element(By.ID, "temperature_id")
            temp_input.clear()
            temp_input.send_keys(str(combo["temp"]))

            # 6) Crosswind
            cw_input = driver.find_element(By.ID, "crosswind_id")
            cw_input.clear()
            cw_input.send_keys(str(combo["cw"]))

            # 7) Klicka “Pull”
            pull_button = driver.find_element(By.ID, "fire_button")
            pull_button.click()

            # 8) Vänta lite
            time.sleep(1.5)

            # 9) Hämta text från #data_out
            data_div = driver.find_element(By.ID, "data_out")
            raw_text = data_div.text.strip()
            if raw_text:
                rows = parse_table_data(raw_text)
                for r in rows:
                    # Lägg på meta-info
                    r["muzzle"]   = combo["muzzle"]
                    r["shotSize"] = combo["shotSize"]
                    r["shotType"] = combo["shotType"]
                    r["alt"]      = combo["alt"]
                    r["temp"]     = combo["temp"]
                    r["cw"]       = combo["cw"]
                all_data.extend(rows)
            else:
                debug_print("Ingen text i #data_out.")

        except NoSuchElementException as e:
            print(f"[WARN] Fel vid combos: {combo}: {e}")
            # Om du vill fortsätta trots fel, fortsätt; annars break
            continue
        except Exception as e:
            print(f"[WARN] Annat fel vid combos: {combo}: {e}")
            continue

    # Stäng webbläsaren
    driver.quit()

    debug_print(f"Totalt {len(all_data)} rader insamlade.")
    if not all_data:
        debug_print("Ingen data hittad.")
        return

    # Spara resultatet som JSON
    out_file = "shotgun_combos_result.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(all_data, f, indent=2)

    print(f"[INFO] Sparade data i {out_file}")

if __name__ == "__main__":
    main()
