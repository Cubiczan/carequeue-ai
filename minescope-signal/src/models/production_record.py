"""
ProductionRecord — Quarterly/annual production output from a mine site.

Tracks tonnes milled, ore grade, recovery, and metal produced
for production benchmarking and trend analysis.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from typing import Optional


class PeriodType(str, Enum):
    QUARTERLY = "Quarterly"
    ANNUAL = "Annual"
    MONTHLY = "Monthly"


@dataclass
class ProductionRecord:
    mine_name: str
    company_name: str
    commodity: str
    period_type: PeriodType = PeriodType.QUARTERLY
    year: int = 2024
    quarter: Optional[int] = None  # 1–4 if quarterly
    period_label: str = ""  # "Q1 2024", "FY 2024"

    # Production metrics
    tonnes_milled_kt: float = 0.0
    ore_grade: float = 0.0
    grade_unit: str = "g/t"
    recovery_pct: float = 90.0
    metal_produced: float = 0.0  # Commodity-specific units
    metal_unit: str = "koz"      # "koz", "M lbs", "kt", "tonnes"

    # Cost metrics (optional)
    cash_cost: Optional[float] = None
    cash_cost_unit: str = "USD/oz"
    all_in_sustaining_cost: Optional[float] = None  # AISC
    aisc_unit: str = "USD/oz"

    # Guidance vs actual
    guidance_metal: Optional[float] = None
    guidance_variance_pct: Optional[float] = None  # positive = beat guidance

    data_source: str = "manual"
    created_at: date = field(default_factory=date.today)

    @property
    def contained_ore_metal(self) -> float:
        """Metal contained in ore before recovery."""
        if self.grade_unit == "g/t":
            return (self.tonnes_milled_kt * self.ore_grade * 1000) / 31.1035
        elif self.grade_unit == "%":
            return self.tonnes_milled_kt * self.ore_grade / 100
        return 0.0

    @property
    def effective_recovery(self) -> float:
        """Recovery-adjusted metal output as % of contained metal."""
        if self.contained_ore_metal > 0 and self.metal_produced > 0:
            return (self.metal_produced / self.contained_ore_metal) * 100
        return self.recovery_pct

    @property
    def beat_guidance(self) -> Optional[bool]:
        if self.guidance_variance_pct is not None:
            return self.guidance_variance_pct > 0
        return None

    def to_dict(self) -> dict:
        return {
            "mine_name": self.mine_name,
            "company_name": self.company_name,
            "commodity": self.commodity,
            "period_type": self.period_type.value,
            "year": self.year,
            "quarter": self.quarter,
            "period_label": self.period_label,
            "tonnes_milled_kt": self.tonnes_milled_kt,
            "ore_grade": self.ore_grade,
            "recovery_pct": self.recovery_pct,
            "metal_produced": self.metal_produced,
            "metal_unit": self.metal_unit,
            "cash_cost": self.cash_cost,
            "all_in_sustaining_cost": self.all_in_sustaining_cost,
            "guidance_metal": self.guidance_metal,
            "guidance_variance_pct": self.guidance_variance_pct,
            "beat_guidance": self.beat_guidance,
            "data_source": self.data_source,
            "created_at": self.created_at.isoformat(),
        }
