"""
MineSite — Individual mine or mining operation within a company's portfolio.

Tracks location, commodity, operational status, processing method,
mill capacity, and life-of-mine estimates.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from typing import Optional


class MineStatus(str, Enum):
    ACTIVE = "Active"
    CARE_MAINTENANCE = "Care & Maintenance"
    DEVELOPMENT = "Development"
    EXPLORATION = "Exploration"
    DEPLETED = "Depleted"
    RECLAMATION = "Reclamation"


class ProcessingMethod(str, Enum):
    OPEN_PIT = "Open Pit"
    UNDERGROUND = "Underground"
    BOTH = "Open Pit + Underground"
    PLACER = "Placer"
    ISR = "In-Situ Recovery"


@dataclass
class MineSite:
    mine_name: str
    company_name: str
    commodity: str
    country: str
    region_state: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: MineStatus = MineStatus.ACTIVE
    processing_method: ProcessingMethod = ProcessingMethod.OPEN_PIT
    open_pit_reserve_pct: float = 0.0
    underground_reserve_pct: float = 0.0
    mill_capacity_tpd: Optional[float] = None
    strip_ratio: Optional[float] = None
    discovery_year: Optional[int] = None
    first_production_year: Optional[int] = None
    estimated_closure_year: Optional[int] = None
    processing_recovery_pct: float = 90.0
    data_source: str = "manual"
    last_updated: date = field(default_factory=date.today)

    @property
    def mine_life_years(self) -> Optional[float]:
        if self.first_production_year and self.estimated_closure_year:
            return self.estimated_closure_year - self.first_production_year
        return None

    @property
    def is_operating(self) -> bool:
        return self.status == MineStatus.ACTIVE

    @property
    def annual_throughput_tpa(self) -> Optional[float]:
        if self.mill_capacity_tpd:
            return self.mill_capacity_tpd * 365
        return None

    def to_dict(self) -> dict:
        return {
            "mine_name": self.mine_name,
            "company_name": self.company_name,
            "commodity": self.commodity,
            "country": self.country,
            "region_state": self.region_state,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "status": self.status.value,
            "processing_method": self.processing_method.value,
            "mill_capacity_tpd": self.mill_capacity_tpd,
            "strip_ratio": self.strip_ratio,
            "processing_recovery_pct": self.processing_recovery_pct,
            "mine_life_years": self.mine_life_years,
            "annual_throughput_tpa": self.annual_throughput_tpa,
            "data_source": self.data_source,
            "last_updated": self.last_updated.isoformat(),
        }
