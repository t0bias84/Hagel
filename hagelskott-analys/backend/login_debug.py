#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
login_debug.py
--------------------------------------
Ett script för att felsöka login-problemen.
Kör med:  python login_debug.py

Detta script gör:
1) Ansluter till databasen (via db.connect_db()).
2) Hämtar referens till databasen.
3) Letar upp en viss användare (t.ex. "test_user").
4) Jämför inskrivet lösenord mot user_doc["hashed_password"] via passlib.
5) Skriver ut var i flödet något går fel, om så sker.
"""

import asyncio
import logging
from passlib.context import CryptContext

# Justera importvägarna efter din projektstruktur
from app.db.mongodb import db   # <--- se till att detta stämmer
from app.core.security import verify_password  # <--- se till att detta stämmer

# Fyll i vilka inloggningsuppgifter du vill testa
TEST_USERNAME = "test_user"
TEST_PASSWORD = "test_password"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    try:
        logger.info("1) Försöker ansluta till databasen...")
        await db.connect_db()  # Kör din motor-setup
        logger.info("   ✅ connect_db() klart.")

        database = await db.get_database()
        if database is None:
            logger.error("   ❌ get_database() gav None. Kan ej fortsätta.")
            return
        logger.info("   ✅ Lyckades hämta database-objekt.")

        logger.info(f"2) Letar upp användare '{TEST_USERNAME}' i 'users'-kollektionen...")
        user_doc = await database.users.find_one({"username": TEST_USERNAME})
        if not user_doc:
            logger.warning(f"   ❌ Hittar ingen user med username='{TEST_USERNAME}'.")
            logger.warning("   Du kanske måste skapa test_user först.")
            return
        else:
            logger.info(f"   ✅ Hittade user-dokument:\n       {user_doc}")

        # Lösenords-hash
        hashed_pw = user_doc.get("hashed_password")
        if not hashed_pw:
            logger.error("   ❌ user_doc saknar 'hashed_password'-fältet!")
            return
        logger.info(f"3) hashed_password (ur DB) = {hashed_pw}")

        logger.info(f"4) Verifierar inskrivet lösenord ('{TEST_PASSWORD}') mot den hashen...")
        # Samma verify_password som ditt login-endpoint
        if verify_password(TEST_PASSWORD, hashed_pw):
            logger.info("   ✅ Lösenordet matchar! -> (Samma som 'login succeeded')")
        else:
            logger.error("   ❌ Lösenordet matchar INTE - passlib verify_password fail.")

        logger.info("5) [Optional] Om du vill, kan du generera token etc. Men främst är verifikationen klar.")
        logger.info("Slut på scriptet. Om du fick 'matchar inte' fast du är säker på lösenordet, kan du debugga passlib/bcrypt-setup.")
    except Exception as e:
        logger.error(f"Fick ett oväntat fel i login_debug-scriptet: {e}")

if __name__ == "__main__":
    asyncio.run(main())
