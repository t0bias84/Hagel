# Fil: debug_penetration.py

import requests

def main():
    # 1) Bas-URL för din backend (justera om din server kör på annan port)
    API_BASE = "http://127.0.0.1:8000"
    endpoint = "/api/loads/penetration-flex-params"

    # 2) JWT-token du angav
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MzYxNTQyODEsInN1YiI6ImFkbWluX3VzZXIiLCJpYXQiOjE3MzYxNTI0ODEsInR5cGUiOiJhY2Nlc3MifQ.X1UAvf4CmZJZHqkoNGVbKYGWfSZumKNlhGTpQYdV8tY"

    # 3) Några testfall där shotSize är "7" i stället för "#7"
    test_cases = [
        {"muzzle": "1000", "shotSize": "7", "shotType": "lead"},
        {"muzzle": "1100", "shotSize": "7", "shotType": "lead"},
        {"muzzle": "1150", "shotSize": "7", "shotType": "lead"},
        {"muzzle": "1200", "shotSize": "7", "shotType": "lead"},
        {"muzzle": "1300", "shotSize": "7", "shotType": "lead"},
    ]

    print(f"== Testar param-baserad endpoint: {API_BASE}{endpoint} ==\n")

    for idx, tc in enumerate(test_cases, start=1):
        params = {
            "muzzle": tc["muzzle"],
            "shotSize": tc["shotSize"],
            "shotType": tc["shotType"]
        }

        print(f"--- Test #{idx} ---")
        print(f"   => muzzle={tc['muzzle']}, shotSize={tc['shotSize']}, shotType={tc['shotType']}")

        url = f"{API_BASE}{endpoint}"
        try:
            resp = requests.get(url, params=params, headers={
                "Authorization": f"Bearer {token}"
            })
            print(f"   Status: {resp.status_code}")

            if resp.ok:
                data = resp.json()
                data_points = data.get("dataPoints", [])
                baseline_used = data.get("baselineUsed", None)
                print(f"   OK! length(dataPoints)={len(data_points)}, baselineUsed={baseline_used}")
            else:
                print("   Fel:", resp.text)

        except Exception as e:
            print("   EXCEPTION:", e)

        print()

    print("Klar med tester.")


if __name__ == "__main__":
    main()
