"""
Commodity data ingestion module.
Fetches real-time and historical prices from AlphaVantage and Regulations.Gov.
"""
import requests
from datetime import datetime, timedelta
from typing import Optional
import structlog
from src.config import get_config

logger = structlog.get_logger(__name__)


class CommodityDataFetcher:
    """
    Fetches commodity prices from multiple data sources.
    Supports AlphaVantage for metals pricing and Regulations.Gov for regulatory data.
    """

    BASE_URLS = {
        "alphavantage": "https://www.alphavantage.co/query",
        "regulations_gov": "https://api.regulations.gov/v4/documents",
    }

    # AlphaVantage function mappings for commodity metals
    METAL_FUNCTIONS = {
        "nickel": "NICKEL",
        "cobalt": "COBALT",
        "lithium": "LITHIUM",
        "copper": "COPPER",
        "manganese": "MANGANESE",
    }

    def __init__(self):
        cfg = get_config().data_sources
        self.alphavantage_key = cfg.alphavantage_key
        self.regulations_key = cfg.regulations_gov_key
        logger.info("data_fetcher_initialized", has_av_key=bool(self.alphavantage_key))

    def fetch_metal_price(self, metal: str) -> Optional[dict]:
        """
        Fetch current metal price from AlphaVantage.

        Args:
            metal: Metal name (nickel, cobalt, lithium, copper, manganese).

        Returns:
            Dict with price data or None if failed.
        """
        if not self.alphavantage_key:
            logger.warning("alphavantage_key_missing", metal=metal)
            return self._fallback_price(metal)

        function = self.METAL_FUNCTIONS.get(metal.upper(), metal.upper())

        params = {
            "function": function,
            "apikey": self.alphavantage_key,
        }

        try:
            response = requests.get(
                self.BASE_URLS["alphavantage"],
                params=params,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()

            # Parse AlphaVantage response
            # Format varies by function; handle common patterns
            price_data = self._parse_alphavantage_response(data, metal)

            if price_data:
                logger.info(
                    "price_fetched",
                    metal=metal,
                    price=price_data.get("price"),
                    source="alphavantage"
                )
                price_data["source"] = "AlphaVantage"
                price_data["fetched_at"] = datetime.utcnow().isoformat()

            return price_data

        except requests.exceptions.RequestException as e:
            logger.error("price_fetch_failed", metal=metal, error=str(e))
            return self._fallback_price(metal)

    def _parse_alphavantage_response(self, data: dict, metal: str) -> Optional[dict]:
        """Parse various AlphaVantage response formats."""
        # Try common response structures
        if "data" in data:
            # Time series format
            latest = data["data"][0] if data["data"] else None
            if latest:
                return {
                    "metal": metal,
                    "price": float(latest.get("value", 0)),
                    "date": latest.get("date", ""),
                    "unit": "USD/mt",
                }

        if "Global Quote" in data:
            quote = data["Global Quote"]
            return {
                "metal": metal,
                "price": float(quote.get("05. price", 0)),
                "date": quote.get("07. latest trading day", ""),
                "unit": "USD/mt",
            }

        # Check for error responses
        if "Error Message" in data or "Note" in data:
            logger.warning("alphavantage_error", response=data)
            return None

        logger.warning("unknown_response_format", keys=list(data.keys()))
        return None

    def _fallback_price(self, metal: str) -> dict:
        """Return fallback prices for demo/testing when no API key is available."""
        fallback_prices = {
            "nickel": 18500.0,
            "cobalt": 32000.0,
            "lithium": 25000.0,
            "copper": 8500.0,
            "manganese": 3200.0,
        }
        price = fallback_prices.get(metal.lower(), 0.0)
        logger.warning("using_fallback_price", metal=metal, price=price)
        return {
            "metal": metal,
            "price": price,
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "unit": "USD/mt",
            "source": "fallback",
            "fetched_at": datetime.utcnow().isoformat(),
        }

    def fetch_all_metals(self, metals: Optional[list] = None) -> dict:
        """
        Fetch prices for all tracked metals.

        Args:
            metals: List of metals to fetch. Defaults to Ni, Co, Li.

        Returns:
            Dict with all metal prices.
        """
        if metals is None:
            metals = ["nickel", "cobalt", "lithium"]

        results = {}
        for metal in metals:
            price_data = self.fetch_metal_price(metal)
            if price_data:
                results[metal] = price_data

        return results

    def search_regulations(self, search_term: str, page_size: int = 10) -> Optional[dict]:
        """
        Search Regulations.Gov for regulatory documents.

        Args:
            search_term: Search query.
            page_size: Number of results to return.

        Returns:
            Dict with regulatory search results or None.
        """
        if not self.regulations_key:
            logger.warning("regulations_key_missing")
            return None

        params = {
            "sort": "-postedDate",
            "filter[searchTerm]": search_term,
            "api_key": self.regulations_key,
            "page[size]": page_size,
        }

        try:
            response = requests.get(
                self.BASE_URLS["regulations_gov"],
                params=params,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            logger.info("regulations_search_complete", term=search_term, count=len(data.get("data", [])))
            return data
        except requests.exceptions.RequestException as e:
            logger.error("regulations_search_failed", error=str(e))
            return None

    def get_historical_prices(self, metal: str, days: int = 30) -> list:
        """
        Get historical prices for a metal (placeholder for Fabric Lakehouse query).

        In production, this would query the Fabric Lakehouse Delta table.
        For now, returns simulated historical data.

        Args:
            metal: Metal name.
            days: Number of days of history.

        Returns:
            List of historical price dicts.
        """
        logger.info("historical_data_requested", metal=metal, days=days)
        # In production: query Fabric Lakehouse
        # df = spark.read.format("delta").load(f"Tables/{metal}_prices")
        # return df.toPandas().to_dict(orient="records")

        # Placeholder: return current price
        current = self.fetch_metal_price(metal)
        if current:
            return [current]
        return []
