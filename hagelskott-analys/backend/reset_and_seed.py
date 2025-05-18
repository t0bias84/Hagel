import requests
import sys

# Om ingen token anges som kommandoradsargument, använd denna
# Obs: Du behöver vara inloggad som admin för att det ska fungera
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # Bara ett exempel, kommer inte fungera

if len(sys.argv) > 1:
    TOKEN = sys.argv[1]

base_url = "http://localhost:8000/api/forum"
headers = {"Authorization": f"Bearer {TOKEN}"}

def main():
    print("Resetar kategorier...")
    reset_resp = requests.post(
        f"{base_url}/categories/reset",
        headers=headers
    )
    print(f"Reset status: {reset_resp.status_code}")
    try:
        print(reset_resp.json())
    except:
        print(reset_resp.text)
    
    print("\nSeedar nya kategorier...")
    seed_resp = requests.post(
        f"{base_url}/seed",
        headers=headers
    )
    print(f"Seed status: {seed_resp.status_code}")
    try:
        print(seed_resp.json())
    except:
        print(seed_resp.text)
    
if __name__ == "__main__":
    main() 