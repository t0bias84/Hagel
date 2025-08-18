import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient
from bson import ObjectId
import os

# To handle the async nature of the app, we need to use a library that can
# properly handle the event loop. `pytest-asyncio` is a good choice.
# We also need to mock the database connection.
from app.db.mongodb import db
from main import app

# Mock the database connection before the app is imported
# This is crucial to ensure the app uses the mock database
db.client = AsyncMongoMockClient()

@pytest.fixture(scope="module")
def client():
    """
    Yield a TestClient instance that can be used to make requests to the application.
    """
    with TestClient(app) as c:
        yield c

@pytest.fixture(autouse=True)
async def setup_database():
    """
    This fixture runs before each test. It clears the 'components' collection
    to ensure a clean state for each test.
    """
    database = await db.get_database()
    await database["components"].delete_many({})
    yield
    # Teardown can happen here if needed, but we clear before each test anyway.

def test_create_component(client):
    """
    Test creating a new component.
    """
    response = client.post(
        "/api/components/",
        data={
            "name": "Test Powder",
            "type": "powder",
            "manufacturer": "TestCorp",
            "description": "A fine test powder.",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Powder"
    assert data["type"] == "powder"
    assert "_id" in data

def test_get_component(client):
    """
    Test fetching a single component by its ID.
    """
    # First, create a component to fetch
    create_response = client.post(
        "/api/components/",
        data={
            "name": "Test Primer",
            "type": "primer",
            "manufacturer": "TestCorp",
        },
    )
    assert create_response.status_code == 200
    component_id = create_response.json()["_id"]

    # Now, fetch it
    get_response = client.get(f"/api/components/{component_id}")
    assert get_response.status_code == 200
    data = get_response.json()
    assert data["name"] == "Test Primer"
    assert data["_id"] == component_id

def test_list_components(client):
    """
    Test listing components with and without filters.
    """
    # Create a few components
    client.post("/api/components/", data={"name": "Steel Powder", "type": "powder", "manufacturer": "Steel Inc."})
    client.post("/api/components/", data={"name": "Lead Powder", "type": "powder", "manufacturer": "Lead Corp."})
    client.post("/api/components/", data={"name": "Cheddite Primer", "type": "primer", "manufacturer": "Cheddite"})

    # Test listing all components
    response = client.get("/api/components/")
    assert response.status_code == 200
    assert len(response.json()) == 3

    # Test filtering by type
    response = client.get("/api/components/?ctype=powder")
    assert response.status_code == 200
    assert len(response.json()) == 2
    for comp in response.json():
        assert comp["type"] == "powder"

    # Test filtering by manufacturer
    response = client.get("/api/components/?manufacturer=Cheddite")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["manufacturer"] == "Cheddite"

def test_update_component(client):
    """
    Test updating an existing component.
    """
    # Create a component
    create_response = client.post("/api/components/", data={"name": "Old Name", "type": "wad"})
    component_id = create_response.json()["_id"]

    # Update it
    update_response = client.put(
        f"/api/components/{component_id}",
        data={"name": "New Name", "description": "Updated description"},
    )
    assert update_response.status_code == 200
    data = update_response.json()
    assert data["name"] == "New Name"
    assert data["description"] == "Updated description"
    assert data["type"] == "wad" # Ensure type was not changed

def test_delete_component(client):
    """
    Test deleting a component.
    """
    # Create a component
    create_response = client.post("/api/components/", data={"name": "To Be Deleted", "type": "hull"})
    component_id = create_response.json()["_id"]

    # Delete it
    delete_response = client.delete(f"/api/components/{component_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["message"] == "Komponent raderad"

    # Verify it's gone
    get_response = client.get(f"/api/components/{component_id}")
    assert get_response.status_code == 404
