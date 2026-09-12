"""
CommodityPrice — Time-series commodity price data with unit conversion.

Supports multiple price sources (LME, Fastmarkets, spot, futures) and
automatic USD/mt <-> USD/lb conversion for battery metals.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from typing import Optional


class PriceUnit(str, Enum):
    USD_PER_OZ = "USD/oz"
    USD_PER_LB = "USD/lb"
    USD_PER_MT = "USD/mt"
    USD_PER_TONNE = "USD/tonne"
    USD_PER_KG = "USD/kg"


class PriceSource(str, Enum):
    LME = "LME"
    FASTMARKETS = "Fastmarkets"
    SPOT = "Spot"
    FUTURES = "Futures"
    ALPHA_VANTAGE = "AlphaVantage"
    FRED = "FRED"
    TWELVE_DATA = "Twelve Data"
    MANUAL = "Manual"


@dataclass
class CommodityPrice:
    commodity: str
    price: float
    currency: str = "USD"
    unit: PriceUnit = PriceUnit.USD_PER_OZ
    source: PriceSource = PriceSource.SPOT
    timestamp: datetime = field(default_factory=datetime.utcnow)
    change_pct_24h: Optional[float] = None
    high_52w: Optional[float] = None
    low_52w: Optional[float] = None
    volume: Optional[float] = None
    contract: Optional[str] = None  # e.g. "LME 3-Month", "COMEX Dec"
    data_source: str = "api"

    # Conversion constants
    LBS_PER_MT = 2204.62
    KG_PER_MT = 1000.0
    OZ_PER_MT = 32150.75  # troy oz per metric tonne
    OZ_PER_LB = 14.5833

    @property
    def price_per_mt(self) -> float:
        """Convert to USD per metric tonne."""
        if self.unit == PriceUnit.USD_PER_MT or self.unit == PriceUnit.USD_PER_TONNE:
            return self.price
        elif self.unit == PriceUnit.USD_PER_LB:
            return self.price * self.LBS_PER_MT
        elif self.unit == PriceUnit.USD_PER_OZ:
            return self.price * self.OZ_PER_MT
        elif self.unit == PriceUnit.USD_PER_KG:
            return self.price * self.KG_PER_MT
        return self.price

    @property
    def price_per_lb(self) -> float:
        if self.unit == PriceUnit.USD_PER_LB:
            return self.price
        elif self.unit == PriceUnit.USD_PER_MT or self.unit == PriceUnit.USD_PER_TONNE:
            return self.price / self.LBS_PER_MT
        elif self.unit == PriceUnit.USD_PER_OZ:
            return self.price / self.OZ_PER_LB
        elif self.unit == PriceUnit.USD_PER_KG:
            return self.price / 2.20462
        return self.price

    @property
    def price_per_oz(self) -> float:
        if self.unit == PriceUnit.USD_PER_OZ:
            return self.price
        elif self.unit == PriceUnit.USD_PER_MT:
            return self.price / self.OZ_PER_MT
        elif self.unit == PriceUnit.USD_PER_LB:
            return self.price * self.OZ_PER_LB
        elif self.unit == PriceUnit.USD_PER_KG:
            return self.price * 32.1507
        return self.price

    @property
    def price_range_pct(self) -> Optional[float]:
        """52-week range as percentage from low."""
        if self.high_52w and self.low_52w and self.low_52w > 0:
            return ((self.price - self.low_52w) / (self.high_52w - self.low_52w)) * 100
        return None

    @property
    def is_above_52w_mid(self) -> Optional[bool]:
        """True if price is in upper half of 52-week range."""
        if self.price_range_pct is not None:
            return self.price_range_pct > 50
        return None

    def to_dict(self) -> dict:
        return {
            "commodity": self.commodity,
            "price": self.price,
            "currency": self.currency,
            "unit": self.unit.value,
            "source": self.source.value,
            "timestamp": self.timestamp.isoformat(),
            "change_pct_24h": self.change_pct_24h,
            "price_per_mt": round(self.price_per_mt, 2),
            "price_per_lb": round(self.price_per_lb, 2),
            "price_per_oz": round(self.price_per_oz, 2),
            "high_52w": self.high_52w,
            "low_52w": self.low_52w,
            "price_range_pct": self.price_range_pct,
            "data_source": self.data_source,
        }
