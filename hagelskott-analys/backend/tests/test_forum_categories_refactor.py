import sys
import os
import pytest

# Add the backend directory to the Python path to allow for absolute imports
# This is necessary because we are running pytest from the root of the repo
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.api.forum_categories import FORUM_CATEGORIES

def test_forum_categories_loaded():
    """
    Tests that the FORUM_CATEGORIES data is loaded correctly from the JSON file.
    """
    # 1. Test that the data is a list
    assert isinstance(FORUM_CATEGORIES, list), "FORUM_CATEGORIES should be a list."

    # 2. Test that the list is not empty
    assert len(FORUM_CATEGORIES) > 0, "FORUM_CATEGORIES should not be empty."

    # 3. Test the structure of the first category
    first_category = FORUM_CATEGORIES[0]
    assert isinstance(first_category, dict), "Each item in FORUM_CATEGORIES should be a dictionary."
    assert "name" in first_category, "Each category should have a 'name' key."
    assert "description" in first_category, "Each category should have a 'description' key."
    assert "children" in first_category, "Each category should have a 'children' key."

    # 4. Test a specific value to be reasonably sure the content is correct
    assert first_category["name"] == "Jakt", "The first category's name should be 'Jakt'."
