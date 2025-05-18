import os
import sys
import uvicorn

# Kör servern direkt med uvicorn istället för att importera main.py
if __name__ == "__main__":
    print("Starting backend server with uvicorn...")
    # Ställ in app-modulvägen till main:app
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 