import pytest
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="session")
async def db():
    """
    Pytest fixture to provide a database connection.
    This is session-scoped to avoid reconnecting for every test.
    """
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client[settings.MONGODB_DB]

    # Ping the server to ensure a connection is established
    try:
        await database.command("ping")
        print("\n--- Test DB Connection Successful ---")
    except Exception as e:
        print(f"\n--- Test DB Connection Failed: {e} ---")
        pytest.fail(f"Could not connect to MongoDB at {settings.MONGODB_URL}")

    yield database

    # Teardown: close the client connection
    client.close()
    print("\n--- Test DB Connection Closed ---")
