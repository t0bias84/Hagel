# test_auth.py
import asyncio
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext


# ------------------- Konfiguration -------------------
# Konfiguration för lösenordshashning (bcrypt):
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

TEST_USERNAME = "test_user"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "test_password"


# ------------------- Test 1: Databasanslutning -------------------
async def test_database_connection():
    """
    Testar att en MongoDB-databas kan kontaktas med Motor.
    Returnerar databasobjektet om det lyckas, annars None.
    """
    print("\n=== Testing Database Connection ===")
    try:
        client = AsyncIOMotorClient("mongodb://localhost:27017")
        db = client.hagelskott_db  # Justera namnet om du använder ett annat DB-namn
        await db.command("ping")
        print("✅ Database connection successful")
        return db
    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}")
        return None


# ------------------- Test 2: Finns test_user i databasen? -------------------
async def test_user_exists(db):
    """
    Kollar om en testanvändare (test_user) finns i users-kollektionen.
    Returnerar användardokumentet eller None.
    """
    print("\n=== Testing User Existence ===")
    if db is None:
        print("❌ No database handle; cannot check user existence.")
        return None

    try:
        user = await db.users.find_one({"username": TEST_USERNAME})
        if user:
            print("✅ Test user found in database")
            print(f"Username: {user['username']}")
            print(f"Email: {user.get('email', 'Not set')}")
            print(f"Has password hash: {'hashed_password' in user}")
            return user
        else:
            print("❌ Test user not found in database")
            return None
    except Exception as e:
        print(f"❌ Error checking user: {str(e)}")
        return None


# ------------------- Test 3: Verifiera lösenordshash -------------------
async def test_password_verification(db, user):
    """
    Testar om det lagrade lösenordet för test_user stämmer överens med
    test_password (= 'test_password' i den här filen).
    """
    print("\n=== Testing Password Verification ===")
    if user is None:
        print("❌ Cannot test password - no user found")
        return

    try:
        stored_hash = user.get('hashed_password')
        if stored_hash:
            is_valid = pwd_context.verify(TEST_PASSWORD, stored_hash)
            print(f"Password verification result: {'✅ Success' if is_valid else '❌ Failed'}")
            print(f"Test password used: {TEST_PASSWORD}")
            print(f"Stored hash exists: {'Yes' if stored_hash else 'No'}")
        else:
            print("❌ No password hash found in user document")
    except Exception as e:
        print(f"❌ Error verifying password: {str(e)}")


# ------------------- Test 4: Testa /api/auth/login -------------------
async def test_login_api():
    """
    Testar inloggnings-API:t på http://localhost:8000/api/auth/login
    Med username=test_user, password=test_password
    """
    print("\n=== Testing Login API ===")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'http://localhost:8000/api/auth/login',
                data={
                    'username': TEST_USERNAME,
                    'password': TEST_PASSWORD,
                    'grant_type': 'password'
                },
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            print(f"Status code: {response.status_code}")
            print(f"Response body: {response.text}")
            return response
    except Exception as e:
        print(f"❌ Error testing login API: {str(e)}")
        return None


# ------------------- Test 5: Återskapa test_user -------------------
async def recreate_test_user(db):
    """
    Tar bort en eventuell befintlig test_user och lägger in en ny med
    ett känt lösenord.
    """
    print("\n=== Recreating Test User ===")
    if db is None:
        print("❌ No database handle; cannot recreate user.")
        return None

    try:
        # Radera användaren om den redan finns
        await db.users.delete_one({"username": TEST_USERNAME})

        # Skapa ny test user med känd hash
        test_user_doc = {
            "username": TEST_USERNAME,
            "email": TEST_EMAIL,
            "hashed_password": pwd_context.hash(TEST_PASSWORD),
            "disabled": False
        }

        result = await db.users.insert_one(test_user_doc)
        print("✅ Test user recreated successfully")
        return result.inserted_id
    except Exception as e:
        print(f"❌ Error recreating test user: {str(e)}")
        return None


# ------------------- Main (körs som skript) -------------------
async def main():
    print("Starting authentication diagnostic tests...")

    # 1) Databas-test
    db = await test_database_connection()
    if db is None:
        print("Cannot proceed without database connection")
        return

    # 2) Kolla om test_user redan finns
    user = await test_user_exists(db)

    # 3) Testa lösenordsverifiering
    await test_password_verification(db, user)

    # 4) Testa login-API
    await test_login_api()

    # 5) Fråga om vi vill återskapa test_user (eller om den saknas)
    should_recreate = False
    if user is None:
        # Om test_user inte hittades
        should_recreate = True
    else:
        prompt = "\nWould you like to recreate the test user? (y/n): "
        answer = input(prompt).strip().lower()
        should_recreate = (answer == 'y')

    if should_recreate:
        await recreate_test_user(db)

        # Retesta med ny user
        print("\n=== Retesting with new user ===")
        user = await test_user_exists(db)
        await test_password_verification(db, user)
        await test_login_api()


if __name__ == "__main__":
    asyncio.run(main())
