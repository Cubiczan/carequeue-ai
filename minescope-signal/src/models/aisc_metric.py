"""
AiscMetric — All-In Sustaining Cost benchmarking for mining operations.

AISC is the gold-standard cost metric for precious metals miners, published
quarterly.  This model tracks AISC, AIC (All-In Costs), cash costs, and
by-product credits for comparative benchmarking across peers.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Optional


@dataclass
class AiscMetric:
    """All-In Sustaining Cost metric for a mine or company."""

    entity_name: str  # Mine name or company name
    entity_type: str = "mine"  # "mine" or "company"
    commodity: str = "Gold"
    year: int = 2024
    quarter: Optional[int] = None
    period_label: str = ""

    # Cost components (USD per oz for gold, USD per lb for copper, etc.)
    mining_cost: float = 0.0
    processing_cost: float = 0.0
    g_and_a: float = 0.0
    exploration: float = 0.0
    sustaining_capex: float = 0.0
    rehab_closure: float = 0.0
    corporate_overhead: Optional[float] = None

    # Aggregated metrics
    cash_cost: Optional[float] = None
    aisc: Optional[float] = None  # All-In Sustaining Cost
    aic: Optional[float] = None   # All-In Costs (includes growth capex)
    cost_unit: str = "USD/oz"

    # By-product credits
    by_product_credits: float = 0.0
    by_product_commodities: str = ""  # "Cu, Ag"

    # Production context
    ounces_produced_koz: Optional[float] = None
    gold_equivalent_oz_koz: Optional[float] = None

    # Benchmarking
    industry_median_aisc: Optional[float] = None
    percentile_rank: Optional[float] = None  # 0–100, lower = cheaper

    data_source: str = "manual"
    created_at: date = field(default_factory=date.today)

    @property
    def total_sustaining(self) -> float:
        """Sum of all sustaining cost components."""
        return (
            self.mining_cost + self.processing_cost + self.g_and_a
            + self.exploration + self.sustaining_capex + self.rehab_closure
        )

    @property
    def net_aisc(self) -> float:
        """AISC minus by-product credits."""
        if self.aisc is not None:
            return max(0, self.aisc - self.by_product_credits)
        return self.total_sustaining - self.by_product_credits

    @property
    def margin_per_oz(self, commodity_price: Optional[float] = None) -> Optional[float]:
        """Gross margin = commodity price - AISC."""
        if self.aisc is not None and commodity_price is not None:
            return commodity_price - self.aisc
        return None

    @property
    def margin_pct(self, commodity_price: Optional[float] = None) -> Optional[float]:
        """Margin as % of commodity price."""
        if self.margin_per_oz(commodity_price) and commodity_price:
            return (self.margin_per_oz(commodity_price) / commodity_price) * 100
        return None

    @property
    def vs_median(self) -> Optional[float]:
        """Difference vs industry median (negative = cheaper than median)."""
        if self.aisc is not None and self.industry_median_aisc is not None:
            return self.aisc - self.industry_median_aisc
        return None

    @property
    def cost_quartile(self) -> Optional[str]:
        """Cost quartile based on percentile rank."""
        if self.percentile_rank is not None:
            if self.percentile_rank <= 25:
                return "Q1 (Bottom)"
            elif self.percentile_rank <= 50:
                return "Q2"
            elif self.percentile_rank <= 75:
                return "Q3"
            else:
                return "Q4 (Top)"
        return None

    def to_dict(self) -> dict:
        return {
            "entity_name": self.entity_name,
            "entity_type": self.entity_type,
            "commodity": self.commodity,
            "year": self.year,
            "quarter": self.quarter,
            "period_label": self.period_label,
            "mining_cost": self.mining_cost,
            "processing_cost": self.processing_cost,
            "g_and_a": self.g_and_a,
            "exploration": self.exploration,
            "sustaining_capex": self.sustaining_capex,
            "cash_cost": self.cash_cost,
            "aisc": self.aisc,
            "aic": self.aic,
            "cost_unit": self.cost_unit,
            "by_product_credits": self.by_product_credits,
            "net_aisc": round(self.net_aisc, 2),
            "ounces_produced_koz": self.ounces_produced_koz,
            "industry_median_aisc": self.industry_median_aisc,
            "percentile_rank": self.percentile_rank,
            "cost_quartile": self.cost_quartile,
            "vs_median": self.vs_median,
            "data_source": self.data_source,
            "created_at": self.created_at.isoformat(),
        }
