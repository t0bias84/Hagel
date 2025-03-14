import requests
import json

# Sätt din backend-URL här:
API_URL = "http://localhost:8000/api/components/batch"

# Om du har en JWT-token (för auth), skriv in den här:
TOKEN = ""  # t.ex. "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."

# Namn på JSON-filen med ditt data:
JSON_FILENAME = "alliant_shotshell_powders.json"

def main():
    # 1) Läs in JSON-filen
    with open(JSON_FILENAME, "r", encoding="utf-8") as f:
        json_data = json.load(f)
    
    # 2) Förbered headers (t.ex. authorization om du har en token)
    headers = {
        "Content-Type": "application/json"
    }
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"

    # 3) Gör POST-anropet
    response = requests.post(API_URL, headers=headers, json=json_data)

    # 4) Skriv ut resultat
    print("Status code:", response.status_code)
    try:
        print("Response JSON:", response.json())
    except:
        print("Response text:", response.text)

if __name__ == "__main__":
    main()
