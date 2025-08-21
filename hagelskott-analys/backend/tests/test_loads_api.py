import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient
from bson import ObjectId
import asyncio

# Mock the database connection before the app is imported
from app.db.mongodb import db
db.client = AsyncMongoMockClient()

from main import app
from app.core.security import get_password_hash

# Fixtures
@pytest.fixture(scope="module")
def client():
    """
    Yield a TestClient instance for the app.
    """
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="module")
def event_loop():
    """
    Creates an asyncio event loop for the entire test module.
    """
    loop = asyncio.get_event_loop()
    yield loop
    loop.close()

@pytest.fixture(autouse=True)
async def setup_database():
    """
    Clear relevant collections before each test.
    """
    database = await db.get_database()
    await database["loads"].delete_many({})
    await database["users"].delete_many({})
    await database["components"].delete_many({})
    yield

@pytest.fixture(scope="module")
async def test_user():
    """
    Create a test user in the database.
    """
    database = await db.get_database()
    user = {
        "_id": ObjectId(),
        "username": "testuser",
        "email": "test@example.com",
        "hashed_password": get_password_hash("testpassword"),
        "is_active": True,
        "roles": ["user"]
    }
    await database["users"].insert_one(user)
    return user

@pytest.fixture(scope="module")
def auth_headers(client, test_user):
    """
    Log in the test user and return authorization headers.
    """
    login_data = {
        "username": "testuser",
        "password": "testpassword"
    }
    response = client.post("/api/auth/login", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

# Tests
@pytest.mark.asyncio
async def test_create_shotshell_load(client, auth_headers):
    """
    Test creating a new shotshell load successfully.
    """
    # First, create some components that the load will reference
    database = await db.get_database()
    hull_id = (await database["components"].insert_one({"name": "Test Hull", "type": "hull"})).inserted_id
    primer_id = (await database["components"].insert_one({"name": "Test Primer", "type": "primer"})).inserted_id
    powder_id = (await database["components"].insert_one({"name": "Test Powder", "type": "powder"})).inserted_id
    wad_id = (await database["components"].insert_one({"name": "Test Wad", "type": "wad"})).inserted_id
    shot_id = (await database["components"].insert_one({"name": "Test Shot", "type": "shot"})).inserted_id

    load_data = {
        "name": "My Test Load",
        "description": "A load for testing purposes.",
        "isPublic": True,
        "gauge": "12",
        "shellLength": 70.0,
        "components": [
            {"id": str(hull_id), "type": "hull"},
            {"id": str(primer_id), "type": "primer"},
            {"id": str(powder_id), "type": "powder", "weight": 1.5},
            {"id": str(wad_id), "type": "wad"},
            {"id": str(shot_id), "type": "shot", "weight": 28.0, "material": "lead", "shotSize": "#7"}
        ]
    }

    response = client.post("/api/loads/shotshell", headers=auth_headers, json=load_data)

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "My Test Load"
    assert data["gauge"] == "12"
    assert data["ownerId"] is not None
    # Check if component expansion worked
    assert "hullObject" in data
    assert data["hullObject"]["name"] == "Test Hull"
    assert "powderWeight" in data
    assert data["powderWeight"] == 1.5
    assert len(data["shotLoads"]) == 1
    assert data["shotLoads"][0]["weight_g"] == 28.0

@pytest.mark.asyncio
async def test_list_loads(client, auth_headers, test_user):
    """
    Test listing all loads.
    """
    # Create a couple of loads to list
    database = await db.get_database()
    await database["loads"].insert_one({
        "name": "Load A",
        "ownerId": str(test_user["_id"]),
        "gauge": "12",
        "shellLength": 70.0,
    })
    await database["loads"].insert_one({
        "name": "Load B",
        "ownerId": str(test_user["_id"]),
        "gauge": "20",
        "shellLength": 76.0,
    })

    response = client.get("/api/loads/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    # Check that the aggregation pipeline correctly added the owner's name
    assert data[0]["ownerName"] == "testuser"
    assert data[1]["ownerName"] == "testuser"

@pytest.mark.asyncio
async def test_get_single_load(client, auth_headers, test_user):
    """
    Test fetching a single load by its ID.
    """
    database = await db.get_database()
    result = await database["loads"].insert_one({
        "name": "Detailed Load",
        "ownerId": str(test_user["_id"]),
        "gauge": "12",
    })
    load_id = str(result.inserted_id)

    response = client.get(f"/api/loads/{load_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Detailed Load"
    assert data["_id"] == load_id

@pytest.mark.asyncio
async def test_update_load(client, auth_headers, test_user):
    """
    Test updating an existing load.
    """
    database = await db.get_database()
    result = await database["loads"].insert_one({
        "name": "Old Name",
        "description": "Old description",
        "ownerId": str(test_user["_id"]),
    })
    load_id = str(result.inserted_id)

    update_data = {
        "name": "New Name",
        "description": "New description",
        "isPublic": True,
    }

    response = client.put(f"/api/loads/{load_id}", headers=auth_headers, json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Name"
    assert data["description"] == "New description"
    assert data["isPublic"] is True

@pytest.mark.asyncio
async def test_delete_load(client, auth_headers, test_user):
    """
    Test deleting an existing load.
    """
    database = await db.get_database()
    result = await database["loads"].insert_one({
        "name": "To Be Deleted",
        "ownerId": str(test_user["_id"]),
    })
    load_id = str(result.inserted_id)

    # Delete the load
    delete_response = client.delete(f"/api/loads/{load_id}", headers=auth_headers)
    assert delete_response.status_code == 200
    assert delete_response.json()["message"] == "Laddningen har tagits bort"

    # Verify it's gone
    get_response = client.get(f"/api/loads/{load_id}", headers=auth_headers)
    assert get_response.status_code == 404
