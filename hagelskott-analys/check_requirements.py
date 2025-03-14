import subprocess
import sys
import pkg_resources
from typing import List, Tuple

REQUIRED_PACKAGES = [
    "motor==3.3.2",
    "pymongo==4.6.1",
    "aiofiles==23.2.1",
    "fastapi==0.109.0",
    "uvicorn==0.27.0",
    "python-multipart==0.0.6",
    "python-dotenv==1.0.0",
    "opencv-python-headless==4.8.1.78",
    "numpy==1.26.3",
    "pillow==10.2.0",
    "pydantic==2.5.3",
    "pydantic-settings==2.1.0",
    "python-jose[cryptography]==3.3.0",
    "passlib[bcrypt]==1.7.4",
    "typing-extensions>=4.11,<5"
]

def check_and_install_requirements() -> bool:
    print("Kontrollerar Python-beroenden...")
    missing_packages = []
    wrong_version_packages = []

    for requirement in REQUIRED_PACKAGES:
        package_name = requirement.split('==')[0].split('>=')[0].split('[')[0]
        try:
            pkg_resources.require(requirement)
        except pkg_resources.VersionConflict:
            wrong_version_packages.append(requirement)
        except pkg_resources.DistributionNotFound:
            missing_packages.append(requirement)

    if missing_packages or wrong_version_packages:
        print("\nSaknade eller felaktiga paketversioner hittades.")
        
        if missing_packages:
            print("\nSaknade paket:")
            for pkg in missing_packages:
                print(f"  - {pkg}")
                
        if wrong_version_packages:
            print("\nFelaktiga versioner:")
            for pkg in wrong_version_packages:
                print(f"  - {pkg}")

        response = input("\nVill du installera/uppdatera dessa paket? (y/n): ")
        if response.lower() == 'y':
            all_packages = missing_packages + wrong_version_packages
            for package in all_packages:
                print(f"\nInstallerar {package}...")
                try:
                    subprocess.run([sys.executable, "-m", "pip", "install", package], check=True)
                    print(f"Lyckades installera {package}")
                except subprocess.CalledProcessError as e:
                    print(f"Kunde inte installera {package}: {str(e)}")
                    return False
            return True
        return False
    
    print("Alla beroenden är korrekt installerade!")
    return True

if __name__ == "__main__":
    if check_and_install_requirements():
        print("\nKlar att köra development.py")
        # Starta development.py här om alla beroenden är ok
        subprocess.run([sys.executable, "development.py"])
    else:
        print("\nKunde inte starta på grund av saknade beroenden.")
        sys.exit(1)