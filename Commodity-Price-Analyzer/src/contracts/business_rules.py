"""
GLI Business Rules Engine.
Ported from the original Airia Python Code step.
Calculates payables, floor/ceiling logic, profit shares, and sensitivity analysis.
"""
import json
from datetime import datetime
from typing import Optional
import structlog

logger = structlog.get_logger(__name__)


# =============================================================================
# Constants (from original Airia flow)
# =============================================================================
THRESHOLD_PRICE_PER_MT = 20000   # Ni threshold for profit share
FLOOR_DISCOUNT = 0.08            # 8% floor discount
PROFIT_SHARE = 0.15              # 15% profit share above threshold
GRADE_MULTIPLIER = 0.85          # Black mass grade multiplier
LBS_PER_MT = 2204.62             # Conversion factor


def calculate_black_mass_payables(
    ni_price: float,
    co_price: float,
    grade_multiplier: float = GRADE_MULTIPLIER
) -> dict:
    """
    Black mass payables based on Ni/Co prices and grade multiples.
    Uses LME 3-month average as basis.

    Args:
        ni_price: Nickel price in USD/mt.
        co_price: Cobalt price in USD/mt.
        grade_multiplier: Grade adjustment factor (default 85%).

    Returns:
        Dict with payable calculations.
    """
    ni_payable = ni_price * grade_multiplier
    co_payable = co_price * grade_multiplier

    return {
        "ni_payable_usd_per_mt": round(ni_payable, 2),
        "co_payable_usd_per_mt": round(co_payable, 2),
        "ni_input_price": ni_price,
        "co_input_price": co_price,
        "grade_multiplier": grade_multiplier,
        "basis": "LME 3-month average",
        "total_value_per_mt": round(ni_payable + co_payable, 2),
    }


def calculate_primary_offtaker_mhp_offtake(
    ni_price: float,
    co_price: float,
    floor_discount: float = FLOOR_DISCOUNT,
    profit_share_threshold: float = THRESHOLD_PRICE_PER_MT,
) -> dict:
    """
    Primary Offtaker MHP offtake pricing with floor discounts and profit sharing.
    Uses Fastmarkets MB indices.

    Args:
        ni_price: Nickel price in USD/mt.
        co_price: Cobalt price in USD/mt.
        floor_discount: Floor discount percentage (default 8%).
        profit_share_threshold: Ni price threshold for profit share (default $20k/mt).

    Returns:
        Dict with MHP offtake calculations including profit share trigger status.
    """
    floor_ni = ni_price * (1 - floor_discount)
    floor_co = co_price * (1 - floor_discount)

    profit_share_triggered = ni_price > profit_share_threshold
    incremental_price = max(0.0, ni_price - profit_share_threshold)
    profit_share_amount = incremental_price * PROFIT_SHARE if profit_share_triggered else 0.0

    realized_ni = floor_ni - profit_share_amount

    return {
        "floor_ni_usd_per_mt": round(floor_ni, 2),
        "floor_co_usd_per_mt": round(floor_co, 2),
        "floor_discount_pct": floor_discount * 100,
        "profit_share_triggered": profit_share_triggered,
        "incremental_price_above_threshold": round(incremental_price, 2),
        "profit_share_amount": round(profit_share_amount, 2),
        "realized_ni_payable": round(realized_ni, 2),
        "basis": "Fastmarkets MB CO-0005 monthly average",
        "margin_vs_spot": round((floor_ni - ni_price) / ni_price * 100, 2) if ni_price else 0,
        "counterparty_label": "Primary Offtaker / MHP Offtaker",
    }


def calculate_lithium_carbonate_gtc(
    li_price: float,
    contract_floor: float = 20000,
    contract_ceiling: float = 30000
) -> dict:
    """
    Lithium carbonate GTC pricing with floor and ceiling protection.

    Args:
        li_price: Lithium carbonate spot price in USD/mt.
        contract_floor: Contract floor price (default $20,000/mt).
        contract_ceiling: Contract ceiling price (default $30,000/mt).

    Returns:
        Dict with GTC calculations including floor/ceiling trigger status.
    """
    effective_price = max(contract_floor, min(li_price, contract_ceiling))

    return {
        "spot_li_price_usd_per_mt": li_price,
        "effective_price_usd_per_mt": effective_price,
        "contract_floor": contract_floor,
        "contract_ceiling": contract_ceiling,
        "floor_protection_active": li_price < contract_floor,
        "ceiling_cap_active": li_price > contract_ceiling,
        "realized_vs_spot_diff": round(effective_price - li_price, 2),
        "basis": "Fastmarkets lithium carbonate 99.5% CIF",
    }


def calculate_li_cycle_feedstock(
    li_price: float,
    ni_price: float,
    co_price: float,
    feedstock_grade: float = 0.92
) -> dict:
    """
    Li Cycle feedstock pricing based on contained value.
    Multi-commodity payables structure.

    Args:
        li_price: Lithium price in USD/mt.
        ni_price: Nickel price in USD/mt.
        co_price: Cobalt price in USD/mt.
        feedstock_grade: Feedstock grade factor (default 92%).

    Returns:
        Dict with feedstock payable calculations.
    """
    li_payable = li_price * feedstock_grade * 0.75
    ni_payable = ni_price * 0.03 * 0.90
    co_payable = co_price * 0.02 * 0.90

    total_value = li_payable + ni_payable + co_payable

    return {
        "li_payable_usd_per_mt": round(li_payable, 2),
        "ni_payable_usd_per_mt": round(ni_payable, 2),
        "co_payable_usd_per_mt": round(co_payable, 2),
        "total_feedstock_value": round(total_value, 2),
        "feedstock_grade": feedstock_grade,
        "basis": "Mixed Fastmarkets/LME composite",
    }


def convert_usd_mt_to_lb(price_usd_mt: float) -> float:
    """Convert USD/metric ton to USD/lb."""
    return round(price_usd_mt / LBS_PER_MT, 4)


def convert_usd_lb_to_mt(price_usd_lb: float) -> float:
    """Convert USD/lb to USD/metric ton."""
    return round(price_usd_lb * LBS_PER_MT, 2)


def run_all_calculations(prices: dict) -> dict:
    """
    Execute all GLI contract calculations.

    Args:
        prices: Dict with 'nickel', 'cobalt', 'lithium' prices in USD/mt.

    Returns:
        Complete calculation results with insights and sensitivity analysis.
    """
    ni_price = prices.get("nickel", prices.get("NI", 18000))
    co_price = prices.get("cobalt", prices.get("CO", 35000))
    li_price = prices.get("lithium", prices.get("LI", prices.get("lithium_carbonate", 25000)))

    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "gli_calculations": {},
        "unit_conversions": {},
        "business_insights": [],
        "sensitivity_analysis": {},
    }

    # Run all contract calculations
    results["gli_calculations"]["black_mass_payables"] = calculate_black_mass_payables(ni_price, co_price)
    results["gli_calculations"]["primary_offtaker_mhp_offtake"] = calculate_primary_offtaker_mhp_offtake(ni_price, co_price)
    results["gli_calculations"]["lithium_carbonate_gtc"] = calculate_lithium_carbonate_gtc(li_price)
    results["gli_calculations"]["li_cycle_feedstock"] = calculate_li_cycle_feedstock(li_price, ni_price, co_price)

    # Unit conversions
    results["unit_conversions"] = {
        "ni_usd_per_lb": convert_usd_mt_to_lb(ni_price),
        "co_usd_per_lb": convert_usd_mt_to_lb(co_price),
        "li_usd_per_lb": convert_usd_mt_to_lb(li_price),
        "ni_usd_per_mt": ni_price,
        "co_usd_per_mt": co_price,
        "li_usd_per_mt": li_price,
    }

    # Generate business insights
    primary_offtaker = results["gli_calculations"]["primary_offtaker_mhp_offtake"]
    if primary_offtaker["profit_share_triggered"]:
        results["business_insights"].append(
            f"ALERT: Primary Offtaker profit share TRIGGERED. Ni ${ni_price}/mt exceeds "
            f"$20,000/mt threshold. Additional ${primary_offtaker['profit_share_amount']}/mt "
            f"shared back with MHP as profit share."
        )

    black_mass = results["gli_calculations"]["black_mass_payables"]
    results["business_insights"].append(
        f"Black mass total value: ${black_mass['total_value_per_mt']}/mt "
        f"(Ni: ${black_mass['ni_payable_usd_per_mt']}, Co: ${black_mass['co_payable_usd_per_mt']})"
    )

    li_gtc = results["gli_calculations"]["lithium_carbonate_gtc"]
    if li_gtc["floor_protection_active"]:
        results["business_insights"].append(
            f"ALERT: Lithium floor protection ACTIVE. Spot ${li_price}/mt is below the "
            f"contract floor of ${li_gtc['contract_floor']}/mt."
        )
    elif li_gtc["ceiling_cap_active"]:
        results["business_insights"].append(
            f"ALERT: Lithium ceiling cap ACTIVE. Spot ${li_price}/mt exceeds the "
            f"contract ceiling of ${li_gtc['contract_ceiling']}/mt."
        )

    # Sensitivity analysis
    results["sensitivity_analysis"] = {
        "ni_plus_1000": {
            "black_mass_delta": round(1000 * GRADE_MULTIPLIER, 2),
            "primary_offtaker_floor_delta": round(1000 * (1 - FLOOR_DISCOUNT), 2),
        },
        "co_plus_1000": {
            "black_mass_delta": round(1000 * GRADE_MULTIPLIER, 2),
            "primary_offtaker_floor_delta": round(1000 * (1 - FLOOR_DISCOUNT), 2),
        },
        "li_plus_1000": {
            "gtc_delta": "depends on floor/ceiling band",
            "feedstock_delta": round(1000 * 0.92 * 0.75, 2),
        },
    }

    logger.info(
        "calculations_complete",
        ni=ni_price,
        co=co_price,
        li=li_price,
        profit_share=primary_offtaker["profit_share_triggered"]
    )

    return results
