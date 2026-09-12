"""
ReserveService — Reserve estimation, aggregation, and comparative analysis.

Aggregates reserve/resource estimates across classification tiers, computes
NPV sensitivity at different commodity prices, and compares reserve profiles
across companies or mines.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from ..models.reserve_estimate import (
    ReserveEstimate, ResourceClassification, ReportingStandard,
)
from ..models.commodity_price import CommodityPrice

logger = logging.getLogger(__name__)


@dataclass
class ReserveService:
    """Service for reserve aggregation, analysis, and benchmarking."""

    default_discount_rate: float = 0.08  # 8% mining industry standard
    default_recovery: float = 0.88

    def aggregate_by_classification(
        self, estimates: List[ReserveEstimate]
    ) -> Dict[str, Dict[str, float]]:
        """Aggregate tonnage and contained metal by classification tier."""
        agg: Dict[str, Dict[str, float]] = {}
        for est in estimates:
            cls = est.classification.value
            if cls not in agg:
                agg[cls] = {"tonnage_kt": 0.0, "contained_metal": 0.0}
            agg[cls]["tonnage_kt"] += est.tonnage_kt
            agg[cls]["contained_metal"] += est.contained_metal
        return agg

    def total_proven_probable(
        self, estimates: List[ReserveEstimate]
    ) -> Tuple[float, float]:
        """Sum proven + probable reserves (tonnage, contained metal)."""
        total_tonnage = 0.0
        total_metal = 0.0
        for est in estimates:
            if est.is_reserve:
                total_tonnage += est.tonnage_kt
                total_metal += est.contained_metal
        return total_tonnage, total_metal

    def total_resources(
        self, estimates: List[ReserveEstimate]
    ) -> Tuple[float, float]:
        """Sum all measured + indicated + inferred resources."""
        total_tonnage = 0.0
        total_metal = 0.0
        for est in estimates:
            total_tonnage += est.tonnage_kt
            total_metal += est.contained_metal
        return total_tonnage, total_metal

    def weighted_average_grade(
        self, estimates: List[ReserveEstimate]
    ) -> float:
        """Calculate tonnage-weighted average grade."""
        total_tonnage = sum(e.tonnage_kt for e in estimates if e.tonnage_kt > 0)
        if total_tonnage == 0:
            return 0.0
        weighted_sum = sum(e.grade * e.tonnage_kt for e in estimates)
        return weighted_sum / total_tonnage

    def reserve_to_resource_ratio(
        self, estimates: List[ReserveEstimate]
    ) -> float:
        """Ratio of proven+probable to total resources (conversion potential)."""
        res_tonnage, _ = self.total_resources(estimates)
        if res_tonnage == 0:
            return 0.0
        prov_tonnage, _ = self.total_proven_probable(estimates)
        return prov_tonnage / res_tonnage

    def npv_sensitivity(
        self,
        estimates: List[ReserveEstimate],
        price_scenarios: List[float],
        recovery: Optional[float] = None,
        opex_per_unit: float = 0.0,
        mine_life_years: float = 10.0,
    ) -> List[Dict]:
        """
        Quick NPV sensitivity across a range of commodity prices.

        Simplified model:
          annual_revenue = contained_metal × recovery × price_per_unit
          annual_cost = contained_metal / mine_life × opex_per_unit
          npv = sum((annual_revenue - annual_cost) / (1 + r)^t)
        """
        rec = recovery or self.default_recovery
        total_tonnage, total_metal = self.total_proven_probable(estimates)
        if total_metal == 0:
            return []

        results = []
        for price in price_scenarios:
            annual_metal = total_metal * rec / mine_life_years
            annual_revenue = annual_metal * price
            annual_cost = (total_tonnage / mine_life_years) * opex_per_unit
            net_annual = annual_revenue - annual_cost

            npv = 0.0
            for t in range(int(mine_life_years)):
                npv += net_annual / ((1 + self.default_discount_rate) ** t)

            results.append({
                "price": price,
                "annual_revenue_m": round(annual_revenue / 1e6, 2),
                "annual_cost_m": round(annual_cost / 1e6, 2),
                "npv_m": round(npv / 1e6, 2),
                "payback_years": round(abs(annual_cost / net_annual), 1) if net_annual > 0 else None,
            })

        return results

    def compare_reserves(
        self,
        portfolios: Dict[str, List[ReserveEstimate]],
    ) -> List[Dict]:
        """Compare reserve profiles across multiple entities (companies/mines)."""
        comparison = []
        for entity, estimates in portfolios.items():
            res_ton, res_metal = self.total_resources(estimates)
            pp_ton, pp_metal = self.total_proven_probable(estimates)
            avg_grade = self.weighted_average_grade(estimates)
            conv_ratio = self.reserve_to_resource_ratio(estimates)

            comparison.append({
                "entity": entity,
                "total_tonnage_kt": round(res_ton, 1),
                "total_contained_metal": round(res_metal, 2),
                "proven_probable_tonnage_kt": round(pp_ton, 1),
                "proven_probable_metal": round(pp_metal, 2),
                "avg_grade": round(avg_grade, 4),
                "conversion_ratio": round(conv_ratio, 3),
            })

        # Sort by contained metal descending
        comparison.sort(key=lambda x: x["total_contained_metal"], reverse=True)
        return comparison
