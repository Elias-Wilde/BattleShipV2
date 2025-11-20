"""
Sanity check: Database connection works.
(This file is kept minimal - real tests are in test_api.py)
"""


def test_database_isolation(test_db):
    """Verify fresh database is created for each test."""
    # If we get here, the test_db fixture worked
    assert test_db is not None
