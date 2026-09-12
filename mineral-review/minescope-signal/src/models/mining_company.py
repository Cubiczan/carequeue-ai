"""
MiningCompany — Core entity representing a mining corporation.

Tracks company-level metadata: ticker, tier, sector, market cap,
primary/secondary commodities, ESG scores, and operational counts.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from typing import List, Optional


class CompanyTier(str, Enum):
    MAJOR = "Major"
    MID_TIER = "Mid-Tier"
    JUNIOR = "Junior"
    ROYALTY = "Royalty/Streaming"


@dataclass
class MiningCompany:
    name: str
    ticker: str
    company_tier: CompanyTier
    sector: str  # "Precious Metals", "Base Metals", "Battery Metals", "Coal", "Industrial"
    headquarters: str
    primary_commodities: List[str]
    secondary_commodities: List[str] = field(default_factory=list)
    market_cap_usd: Optional[float] = None
    annual_revenue_usd: Optional[float] = None
    employees: Optional[int] = None
    founded_year: Optional[int] = None
    listing_exchange: str = "NYSE"
    website: Optional[str] = None
    esg_score: Optional[float] = None  # 0.0 – 100.0
    mine_count: int = 0
    active_mines: int = 0
    data_source: str = "manual"
    last_updated: date = field(default_factory=date.today)

    @property
    def tier_rank(self) -> int:
        order = [CompanyTier.MAJOR, CompanyTier.MID_TIER, CompanyTier.JUNIOR, CompanyTier.ROYALTY]
        return order.index(self.company_tier) if self.company_tier in order else 99

    @property
    def commodity_set(self) -> set:
        return set(self.primary_commodities + self.secondary_commodities)

    @property
    def revenue_per_employee(self) -> Optional[float]:
        if self.annual_revenue_usd and self.employees:
            return self.annual_revenue_usd / self.employees
        return None

    def matches_commodity(self, commodity: str) -> bool:
        return commodity.lower() in {c.lower() for c in self.commodity_set}

    def to_dict(self) -> dict:
        return {
            "name": self.name, "ticker": self.ticker,
            "company_tier": self.company_tier.value, "sector": self.sector,
            "headquarters": self.headquarters,
            "primary_commodities": self.primary_commodities,
            "secondary_commodities": self.secondary_commodities,
            "market_cap_usd": self.market_cap_usd,
            "annual_revenue_usd": self.annual_revenue_usd,
            "employees": self.employees,
            "listing_exchange": self.listing_exchange,
            "esg_score": self.esg_score,
            "mine_count": self.mine_count, "active_mines": self.active_mines,
            "data_source": self.data_source,
            "last_updated": self.last_updated.isoformat(),
        }
