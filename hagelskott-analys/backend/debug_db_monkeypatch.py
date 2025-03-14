"""
debug_db_monkeypatch.py

Kör detta script för att patcha Motor AsyncIOMotorDatabase
så att alla bool-tester loggas med stacktrace. 

Användning:
  python debug_db_monkeypatch.py

Efter patchen kan du göra ex:
  from main import app
  # starta server eller anropa koden som orsakar felet 
  # (vilket triggar "bool-test" på Motor-database-objektet).
"""

import sys
import traceback

try:
    import motor.motor_asyncio
except ImportError:
    print("Motor-biblioteket saknas? Avbryter.")
    sys.exit(1)

# Spara ev. original-__bool__ om den finns (brukar inte göra det, men för säkerhets skull)
_original_bool = getattr(motor.motor_asyncio.AsyncIOMotorDatabase, '__bool__', None)


def patched_bool_method(self):
    """
    Ersätter standard-__bool__, skriver ut stacktrace,
    och kastar sedan TypeError (eller anropar original om du så vill).
    """
    print("\n=== MonkeyPatch: Försök till bool-test av AsyncIOMotorDatabase! ===")
    print("Stacktrace (senaste överst):")
    traceback.print_stack()
    print("=== Slut på stacktrace. ===\n")

    # Om du vill att den skall “funka” och returnera False, kan du göra:
    # return False

    # Eller om du vill anropa originalet (oftast inte nödvändigt):
    if _original_bool:
        return _original_bool(self)

    # Annars kastar vi TypeError för att verkligen krasha anropet
    raise TypeError("Du bool-testar en Motor-databas-objekt! Sök stacktrace ovan.")


def patch_motor_database_bool():
    """
    Utför själva patchningen.
    """
    motor.motor_asyncio.AsyncIOMotorDatabase.__bool__ = patched_bool_method
    print("✅ Har monkeypatchat AsyncIOMotorDatabase.__bool__")


if __name__ == "__main__":
    patch_motor_database_bool()

    # Exempel på hur du kan anropa main.py eller köra annan kod:
    # (om du vill starta servern i samma process)
    #
    # from uvicorn import run
    # from main import app
    # run(app, host="0.0.0.0", port=8000)
    #
    # Alternativt bara importera main och göra
    # from main import app
    # ... och sedan trigga buggen på valfritt sätt.
    #
    # Just nu lämnar vi det upp till dig hur du vill exekvera projektet.
