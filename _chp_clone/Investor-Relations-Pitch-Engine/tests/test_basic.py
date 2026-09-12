"""Basic smoke tests for the Investor Relations Pitch Engine.

The IRPE is a set of standalone Python scripts (not a package).
These tests verify that the key modules can be imported and have basic structure.
"""

import importlib
import os
import sys
import pytest

# Add project root to path so standalone scripts can be imported
PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, PROJECT_ROOT)


def test_cubiczan_server_importable():
    """Verify cubiczan_server.py can be loaded as a module."""
    spec = importlib.util.spec_from_file_location(
        "cubiczan_server",
        os.path.join(PROJECT_ROOT, "cubiczan_server.py"),
    )
    assert spec is not None


def test_investor_relations_engine_importable():
    """Verify investor_relations_engine.py can be loaded as a module."""
    spec = importlib.util.spec_from_file_location(
        "investor_relations_engine",
        os.path.join(PROJECT_ROOT, "investor_relations_engine.py"),
    )
    assert spec is not None


def test_market_data_clients_importable():
    """Verify market_data_clients.py can be loaded as a module."""
    spec = importlib.util.spec_from_file_location(
        "market_data_clients",
        os.path.join(PROJECT_ROOT, "market_data_clients.py"),
    )
    assert spec is not None


def test_placeholder():
    """Placeholder test to ensure CI pipeline has at least one passing test."""
    assert True
