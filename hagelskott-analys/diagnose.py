import subprocess
import sys
import os
import json
import socket
from pathlib import Path

def check_python_version(required_version="3.12"):
    """Kontrollera om rätt Python-version används."""
    current_version = sys.version.split()[0]
    if current_version.startswith(required_version):
        print(f"Python-version: OK ({current_version})")
        return True
    else:
        print(f"Python-version FEL! ({current_version} istället för {required_version})")
        return False

def check_installed_packages(requirements_file="backend/requirements.txt"):
    """Kontrollera om alla paket i requirements.txt är installerade."""
    missing_packages = []
    try:
        with open(requirements_file, 'r') as f:
            requirements = f.readlines()

        result = subprocess.run(
            [sys.executable, '-m', 'pip', 'list', '--format=json'],
            capture_output=True,
            text=True
        )
        installed_packages = {pkg['name'].lower(): pkg['version'] for pkg in json.loads(result.stdout)}

        for req in requirements:
            req = req.strip()
            if req and not req.startswith("#"):
                package_name = req.split('[')[0].split('==')[0]
                if package_name.lower() not in installed_packages:
                    missing_packages.append(req)
                else:
                    print(f"Paket OK: {package_name} ({installed_packages[package_name.lower()]})")

    except Exception as e:
        print(f"Fel vid kontroll av paket: {str(e)}")

    if missing_packages:
        print("\nSaknade paket:")
        for pkg in missing_packages:
            print(f"- {pkg}")
    else:
        print("\nAlla paket är installerade.")
    return missing_packages

def check_pythonpath():
    """Kontrollera om PYTHONPATH är korrekt inställd."""
    pythonpath = os.environ.get("PYTHONPATH")
    if pythonpath:
        print(f"PYTHONPATH: OK ({pythonpath})")
        return True
    else:
        print("PYTHONPATH FEL! Variabeln är inte satt.")
        return False

def check_port_availability(port):
    """Kontrollera om en port är ledig."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        result = sock.connect_ex(("localhost", port))
        if result == 0:
            print(f"Port {port} FEL! Den är upptagen.")
            return False
        else:
            print(f"Port {port}: OK (ledig)")
            return True

def generate_report():
    """Generera en rapport baserat på kontrollerna."""
    report = {
        "python_version": check_python_version(),
        "installed_packages": not bool(check_installed_packages()),
        "pythonpath": check_pythonpath(),
        "backend_port": check_port_availability(8000),
        "frontend_port": check_port_availability(5173),
    }
    report_path = Path("environment_report.json")
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=4)
    print(f"\nRapport genererad: {report_path.resolve()}")
    return report_path

if __name__ == "__main__":
    print("Startar diagnostik...")
    generate_report()
