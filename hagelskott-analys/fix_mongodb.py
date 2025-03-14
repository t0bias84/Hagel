import subprocess
import sys
import os
import time
from pathlib import Path

def install_package(package_name: str) -> bool:
    """Installera ett paket med pip"""
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", package_name],
            check=True,
            capture_output=True,
            text=True
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"Fel vid installation av {package_name}: {e.stderr}")
        return False

def fix_dependencies():
    """Fixa alla beroenden"""
    dependencies = {
        "pymongo": "4.5.0",
        "motor": "3.3.1",
        "aiofiles": "23.2.1",
        "typing-extensions": "4.8.0",
        "python-jose[cryptography]": "3.3.0",
        "passlib[bcrypt]": "1.7.4"
    }

    print("Avinstallerar gamla versioner...")
    subprocess.run([sys.executable, "-m", "pip", "uninstall", "-y"] + list(dependencies.keys()))
    
    print("\nInstallerar korrekta versioner...")
    for package, version in dependencies.items():
        print(f"Installerar {package}=={version}")
        if not install_package(f"{package}=={version}"):
            print(f"VARNING: Kunde inte installera {package}")
            continue
        print(f"✓ {package} installerat")

def create_directories():
    """Skapa nödvändiga mappar"""
    directories = [
        "backend/templates",
        "logs",
        "backend/static",
        "backend/uploads"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"✓ Skapade/verifierade mapp: {directory}")

def main():
    print("\n=== Startar reparation av utvecklingsmiljön ===\n")
    
    print("1. Fixar beroenden...")
    fix_dependencies()
    
    print("\n2. Skapar nödvändiga mappar...")
    create_directories()
    
    print("\n3. Väntar på att systemet ska stabiliseras...")
    time.sleep(2)
    
    print("\nKlar! Nu kan du köra development.py")
    
    response = input("\nVill du starta development.py nu? (y/n): ")
    if response.lower() == 'y':
        print("\nStartar development.py...")
        subprocess.run([sys.executable, "development.py"])
    else:
        print("\nOK, du kan starta development.py senare genom att köra: python development.py")

if __name__ == "__main__":
    main()