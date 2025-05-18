import requests
import time
import sys

def test_connection(url, max_attempts=5, delay=2):
    """
    Försöker ansluta till den angivna URL:en upprepade gånger.
    """
    print(f"Trying to connect to {url}...")
    
    for attempt in range(max_attempts):
        try:
            print(f"Attempt {attempt + 1}/{max_attempts}...")
            response = requests.get(url)
            print(f"Status code: {response.status_code}")
            print(f"Response: {response.text[:100]}...")  # Visa bara de första 100 tecknen
            return True
        except requests.exceptions.ConnectionError:
            print(f"Connection refused (attempt {attempt + 1}/{max_attempts})")
            if attempt < max_attempts - 1:
                print(f"Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                print("Max attempts reached. Server not responding.")
                return False
        except Exception as e:
            print(f"Error: {e}")
            return False

if __name__ == "__main__":
    # Testa både docs och huvudsidan
    test_connection("http://localhost:8000/docs")
    print("\n" + "-"*50 + "\n")
    test_connection("http://localhost:8000/")
    
    input("\nPress Enter to exit...") 