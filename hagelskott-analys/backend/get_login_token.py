import requests
import json

def get_login_token():
    # Backend URL
    base_url = "http://localhost:8000"
    
    # Fördefinierade admin-uppgifter - vanliga testuppgifter
    username = "admin"
    password = "password"
    
    print(f"Använder admin-konto: {username}")
    
    # Skapa login-förfrågan
    login_data = {
        "username": username,
        "password": password
    }
    
    try:
        # Skicka login-förfrågan med rätt headers
        login_response = requests.post(
            f"{base_url}/api/auth/login", 
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if login_response.status_code == 200:
            token_data = login_response.json()
            token = token_data.get("access_token")
            
            # Visa token
            print("\nInloggning lyckades!")
            print(f"\nDin token är: {token}")
            
            # Spara token för att använda i reset_and_seed.py
            with open("admin_token.txt", "w") as f:
                f.write(token)
            print("\nToken har sparats i admin_token.txt och kan användas för reset_and_seed.py")
            
            # Kolla användarinfo
            user_response = requests.get(
                f"{base_url}/api/auth/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if user_response.status_code == 200:
                user_data = user_response.json()
                roles = user_data.get("roles", [])
                print(f"\nDina roller: {', '.join(roles)}")
                
                if "admin" not in roles:
                    print("\nVARNING: Du har inte admin-behörighet, vilket krävs för att reseta och seeda kategorier.")
            
            return token
        else:
            print(f"\nInloggning misslyckades: {login_response.status_code}")
            print(login_response.text)
            return None
            
    except Exception as e:
        print(f"\nFel vid inloggning: {e}")
        return None

if __name__ == "__main__":
    token = get_login_token()
    
    if token:
        print("\nOm du vill reseta och seeda kategorier, kör:")
        print(f"python reset_and_seed.py {token}") 