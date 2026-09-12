"""
PricingService — Commodity price fetching, caching, and unit normalization.

Supports AlphaVantage (free tier, 5 req/min), FRED, and Twelve Data as
sources with automatic rate-limiting and fallback pricing.
"""

from __future__ import annotations

import time
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional

import requests

from ..models.commodity_price import CommodityPrice, PriceUnit, PriceSource

logger = logging.getLogger(__name__)

# AlphaVantage function codes for commodities
AV_METAL_FUNCTIONS = {
    "Nickel": "NICKEL",
    "Cobalt": "COBALT",
    "Lithium": "LITHIUM",
    "Copper": "COPPER",
    "Iron": "IRON",
    "Zinc": "ZINC",
    "Aluminum": "ALUMINUM",
    "Lead": "LEAD",
    "Manganese": "MANGANESE",
    "Silver": "SILVER",
    "Gold": "GOLD",  # Note: AV may not have direct gold, use alternative
    "Platinum": "PLATINUM",
    "Palladium": "PALLADIUM",
    "Uranium": "URANIUM",
}

# Unit mapping for AV metals (all return USD/mt for base/battery metals)
AV_UNITS = {
    "Nickel": PriceUnit.USD_PER_MT,
    "Cobalt": PriceUnit.USD_PER_MT,
    "Lithium": PriceUnit.USD_PER_MT,
    "Copper": PriceUnit.USD_PER_MT,
    "Iron": PriceUnit.USD_PER_MT,
    "Zinc": PriceUnit.USD_PER_MT,
    "Aluminum": PriceUnit.USD_PER_MT,
    "Lead": PriceUnit.USD_PER_MT,
    "Manganese": PriceUnit.USD_PER_MT,
    "Silver": PriceUnit.USD_PER_OZ,
    "Gold": PriceUnit.USD_PER_OZ,
    "Platinum": PriceUnit.USD_PER_OZ,
    "Palladium": PriceUnit.USD_PER_OZ,
    "Uranium": PriceUnit.USD_PER_LB,
}

# Fallback prices when APIs are unavailable (conservative estimates)
FALLBACK_PRICES = {
    "Gold": (2340.0, PriceUnit.USD_PER_OZ),
    "Silver": (28.50, PriceUnit.USD_PER_OZ),
    "Copper": (9200.0, PriceUnit.USD_PER_MT),
    "Nickel": (16500.0, PriceUnit.USD_PER_MT),
    "Cobalt": (28000.0, PriceUnit.USD_PER_MT),
    "Lithium": (13000.0, PriceUnit.USD_PER_MT),
    "Iron": (115.0, PriceUnit.USD_PER_MT),
    "Zinc": (2650.0, PriceUnit.USD_PER_MT),
    "Aluminum": (2350.0, PriceUnit.USD_PER_MT),
    "Platinum": (980.0, PriceUnit.USD_PER_OZ),
    "Palladium": (1020.0, PriceUnit.USD_PER_OZ),
    "Uranium": (82.0, PriceUnit.USD_PER_LB),
    "Manganese": (4.50, PriceUnit.USD_PER_LB),
    "Lead": (2100.0, PriceUnit.USD_PER_MT),
}


@dataclass
class PricingService:
    """Fetches and normalizes commodity prices from multiple sources."""

    alpha_vantage_key: Optional[str] = None
    fred_api_key: Optional[str] = None
    twelve_data_key: Optional[str] = None
    rate_limit_delay: float = 12.5  # seconds between AV calls (5/min)
    timeout: int = 30

    _last_request_time: float = field(default=0.0, repr=False)

    def _enforce_rate_limit(self):
        """Ensure minimum delay between API calls."""
        elapsed = time.time() - self._last_request_time
        if elapsed < self.rate_limit_delay:
            sleep_time = self.rate_limit_delay - elapsed
            logger.debug(f"Rate limit: sleeping {sleep_time:.1f}s")
            time.sleep(sleep_time)
        self._last_request_time = time.time()

    def fetch_alpha_vantage(self, commodity: str) -> Optional[CommodityPrice]:
        """Fetch price from AlphaVantage commodities API."""
        if not self.alpha_vantage_key:
            return None

        function_code = AV_METAL_FUNCTIONS.get(commodity)
        if not function_code:
            logger.warning(f"No AlphaVantage function for {commodity}")
            return None

        self._enforce_rate_limit()

        try:
            url = "https://www.alphavantage.co/query"
            params = {
                "function": function_code,
                "interval": "monthly",
                "apikey": self.alpha_vantage_key,
            }
            resp = requests.get(url, params=params, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()

            # Parse response — AV returns array of monthly entries
            price = None
            if "data" in data and isinstance(data["data"], list) and len(data["data"]) > 0:
                latest = data["data"][0]
                price = float(latest.get("value", 0))
            elif "Global Quote" in data:
                price = float(data["Global Quote"].get("05. price", 0))

            if price and price > 0:
                unit = AV_UNITS.get(commodity, PriceUnit.USD_PER_MT)
                return CommodityPrice(
                    commodity=commodity,
                    price=price,
                    unit=unit,
                    source=PriceSource.ALPHA_VANTAGE,
                    timestamp=datetime.utcnow(),
                    data_source="alpha_vantage",
                )
        except Exception as e:
            logger.error(f"AlphaVantage error for {commodity}: {e}")

        return None

    def fetch_fred(self, series_id: str, commodity: str) -> Optional[CommodityPrice]:
        """Fetch price from FRED API using a series ID."""
        if not self.fred_api_key:
            return None

        self._enforce_rate_limit()

        try:
            url = "https://api.stlouisfed.org/fred/series/observations"
            params = {
                "series_id": series_id,
                "api_key": self.fred_api_key,
                "file_type": "json",
                "sort_order": "desc",
                "limit": 1,
            }
            resp = requests.get(url, params=params, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()

            if "observations" in data and len(data["observations"]) > 0:
                obs = data["observations"][0]
                price = float(obs.get("value", 0))
                if price > 0:
                    return CommodityPrice(
                        commodity=commodity,
                        price=price,
                        unit=PriceUnit.USD_PER_MT,
                        source=PriceSource.FRED,
                        timestamp=datetime.utcnow(),
                        data_source="fred",
                    )
        except Exception as e:
            logger.error(f"FRED error for {series_id}: {e}")

        return None

    def get_price(self, commodity: str) -> CommodityPrice:
        """Get price for a commodity, trying sources in order with fallback."""
        # Try AlphaVantage first
        price = self.fetch_alpha_vantage(commodity)
        if price and price.price > 0:
            logger.info(f"AlphaVantage price for {commodity}: ${price.price:,.2f} {price.unit.value}")
            return price

        # Fallback
        fallback = FALLBACK_PRICES.get(commodity)
        if fallback:
            fb_price, fb_unit = fallback
            logger.warning(f"Using fallback price for {commodity}: ${fb_price:,.2f} {fb_unit.value}")
            return CommodityPrice(
                commodity=commodity,
                price=fb_price,
                unit=fb_unit,
                source=PriceSource.MANUAL,
                timestamp=datetime.utcnow(),
                data_source="fallback",
            )

        raise ValueError(f"No price available for commodity: {commodity}")

    def get_prices(self, commodities: List[str]) -> Dict[str, CommodityPrice]:
        """Fetch prices for multiple commodities with rate limiting."""
        results = {}
        for commodity in commodities:
            try:
                results[commodity] = self.get_price(commodity)
            except Exception as e:
                logger.error(f"Failed to fetch {commodity}: {e}")
        return results

    def calculate_metal_value(
        self, commodity: str, contained_units: float, price: Optional[CommodityPrice] = None
    ) -> float:
        """Calculate USD value of contained metal given a price."""
        if price is None:
            price = self.get_price(commodity)

        # Normalize everything to per-mt
        price_per_mt = price.price_per_mt
        contained_mt = contained_units  # depends on context

        if price.unit == PriceUnit.USD_PER_OZ:
            # contained_units is in oz, convert to value
            return contained_units * price.price
        elif price.unit == PriceUnit.USD_PER_LB:
            return contained_units * price.price
        elif price.unit == PriceUnit.USD_PER_MT:
            return contained_mt * price.price
        elif price.unit == PriceUnit.USD_PER_KG:
            return contained_mt * price.price

        return 0.0
