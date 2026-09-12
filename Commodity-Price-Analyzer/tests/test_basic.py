"""Basic import tests for Commodity-Price-Analyzer.

Validates that core modules can be imported without errors.
"""

def test_import_business_rules():
    """Test that the business_rules module imports."""
    from src.contracts.business_rules import (
        calculate_black_mass_payables,
        calculate_primary_offtaker_mhp_offtake,
        calculate_lithium_carbonate_gtc,
        run_all_calculations,
    )
    assert callable(calculate_black_mass_payables)
    assert callable(calculate_primary_offtaker_mhp_offtake)
    assert callable(calculate_lithium_carbonate_gtc)
    assert callable(run_all_calculations)


def test_import_config_settings():
    """Test that the config module imports."""
    from src.config.settings import AppConfig, AzureAIConfig, get_config
    assert AppConfig is not None
    assert AzureAIConfig is not None
    assert callable(get_config)


def test_import_data_fetcher():
    """Test that the data fetcher module imports."""
    from src.data.fetcher import DataFetcher
    assert DataFetcher is not None


def test_business_rules_calculation():
    """Test a simple business rules calculation."""
    from src.contracts.business_rules import calculate_black_mass_payables
    result = calculate_black_mass_payables(ni_price=18000, co_price=35000)
    assert "ni_payable_usd_per_mt" in result
    assert "co_payable_usd_per_mt" in result
    assert result["ni_payable_usd_per_mt"] > 0


def test_lithium_gtc_floor_active():
    """Test that lithium GTC floor protection activates correctly."""
    from src.contracts.business_rules import calculate_lithium_carbonate_gtc
    result = calculate_lithium_carbonate_gtc(li_price=15000)
    assert result["floor_protection_active"] is True
    assert result["effective_price_usd_per_mt"] == 20000


def test_lithium_gtc_ceiling_active():
    """Test that lithium GTC ceiling cap activates correctly."""
    from src.contracts.business_rules import calculate_lithium_carbonate_gtc
    result = calculate_lithium_carbonate_gtc(li_price=35000)
    assert result["ceiling_cap_active"] is True
    assert result["effective_price_usd_per_mt"] == 30000


def test_unit_conversion():
    """Test USD/mt to USD/lb conversion."""
    from src.contracts.business_rules import convert_usd_mt_to_lb, convert_usd_lb_to_mt
    result_lb = convert_usd_mt_to_lb(2204.62)
    assert abs(result_lb - 1.0) < 0.001
    result_mt = convert_usd_lb_to_mt(1.0)
    assert abs(result_mt - 2204.62) < 0.01
