"""Basic import tests for metal-price-agent (metal-monitor subpackage).

Validates that core modules can be imported without errors.
"""

def test_import_metal_monitor_package():
    """Test that the metal_monitor package imports with version."""
    from metal_monitor import __version__
    assert __version__ == "0.1.0"


def test_import_models():
    """Test that the models module imports."""
    from metal_monitor.models import (
        PriceObservation,
        PriceSummary,
        AIAnalysis,
        PriceAlert,
        WeeklySummary,
        CommodityInfo,
        COMMODITY_REGISTRY,
    )
    assert PriceObservation is not None
    assert PriceSummary is not None
    assert AIAnalysis is not None
    assert PriceAlert is not None
    assert WeeklySummary is not None
    assert CommodityInfo is not None


def test_price_observation_creation():
    """Test PriceObservation dataclass creation."""
    from metal_monitor.models import PriceObservation
    obs = PriceObservation(
        date="2026-01-01",
        source="shmet",
        commodity="lithium_carbonate",
        grade="battery_grade",
        price_cny=75000.0,
    )
    assert obs.commodity == "lithium_carbonate"
    assert obs.price_cny == 75000.0
    assert obs.timestamp != ""  # auto-populated


def test_commodity_registry_not_empty():
    """Test that the commodity registry has entries."""
    from metal_monitor.models import COMMODITY_REGISTRY
    assert len(COMMODITY_REGISTRY) > 0


def test_get_commodity_info():
    """Test looking up commodity info by name."""
    from metal_monitor.models import get_commodity_info
    info = get_commodity_info("lithium_carbonate")
    assert info is not None
    assert info.name_cn == "碳酸锂"
    assert "battery_material" in info.category


def test_price_alert_auto_id():
    """Test that PriceAlert auto-generates an ID."""
    from metal_monitor.models import PriceAlert
    alert = PriceAlert(
        commodity="lithium_carbonate",
        alert_type="anomaly",
        severity="high",
        message="Price spike detected",
    )
    assert alert.id != ""
    assert len(alert.id) == 8


def test_import_scraper():
    """Test that the scraper package imports."""
    import metal_monitor.scraper
    assert metal_monitor.scraper is not None


def test_import_alerts():
    """Test that the alerts package imports."""
    import metal_monitor.alerts
    assert metal_monitor.alerts is not None
