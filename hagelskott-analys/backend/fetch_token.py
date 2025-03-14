# Fil: fetch_token.py

import getpass

def main():
    # Be användaren mata in sitt token i terminalen (det syns inte när man skriver, för lite extra sekretess).
    token_input = getpass.getpass("Skriv in ditt token (det visas ej medan du skriver): ")

    # Om du vill se det i klartext i outputen:
    print(f"Du skrev in token: {token_input}")

    # Här kan du sedan använda token_input till att göra fetch-anrop, etc.
    # Exempel:
    #   import requests
    #   url = "http://127.0.0.1:8000/api/loads/penetration-flex-params"
    #   resp = requests.get(url, headers={"Authorization": f"Bearer {token_input}"})
    #   print(resp.status_code, resp.json())

if __name__ == "__main__":
    main()
