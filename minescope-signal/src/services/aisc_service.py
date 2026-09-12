"""
AiscService — All-In Sustaining Cost benchmarking and peer comparison.

Calculates industry medians, percentile rankings, cost curves,
and margin analysis across mining companies or individual mines.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, List, Optional

from ..models.aisc_metric import AiscMetric

logger = logging.getLogger(__name__)


@dataclass
class AiscService:
    """Service for AISC benchmarking and peer comparison."""

    def calculate_median(self, metrics: List[AiscMetric]) -> Optional[float]:
        """Calculate industry median AISC from a list of metrics."""
        valid = [m.aisc for m in metrics if m.aisc is not None and m.aisc > 0]
        if not valid:
            return None
        sorted_vals = sorted(valid)
        n = len(sorted_vals)
        if n % 2 == 0:
            return (sorted_vals[n // 2 - 1] + sorted_vals[n // 2]) / 2
        return sorted_vals[n // 2]

    def calculate_percentile(
        self, value: float, distribution: List[float]
    ) -> float:
        """Calculate percentile rank of a value within a distribution."""
        if not distribution:
            return 0.0
        below = sum(1 for v in distribution if v < value)
        return (below / len(distribution)) * 100

    def enrich_with_benchmarks(
        self, metrics: List[AiscMetric]
    ) -> List[AiscMetric]:
        """Add median and percentile to each metric in-place."""
        all_aisc = [m.aisc for m in metrics if m.aisc is not None and m.aisc > 0]
        median = self.calculate_median(metrics)

        for m in metrics:
            if m.aisc is not None:
                m.industry_median_aisc = median
                m.percentile_rank = self.calculate_percentile(m.aisc, all_aisc)

        return metrics

    def cost_curve(
        self, metrics: List[AiscMetric], commodity_price: Optional[float] = None
    ) -> Dict:
        """
        Build a cost curve: sort entities by AISC ascending,
        calculate cumulative production, and identify breakeven.
        """
        valid = sorted(
            [m for m in metrics if m.aisc is not None],
            key=lambda m: m.aisc,
        )

        if not valid:
            return {"status": "no_data"}

        total_oz = sum(m.ounces_produced_koz or 0 for m in valid)
        cumulative = 0.0

        curve = []
        for m in valid:
            oz = m.ounces_produced_koz or 0
            cumulative += oz
            margin = None
            if commodity_price and m.aisc:
                margin = commodity_price - m.aisc
            curve.append({
                "entity": m.entity_name,
                "aisc": m.aisc,
                "oz_koz": oz,
                "cumulative_oz_koz": round(cumulative, 1),
                "pct_of_total": round((cumulative / total_oz * 100) if total_oz > 0 else 0, 1),
                "margin_per_oz": round(margin, 2) if margin else None,
                "quartile": m.cost_quartile,
            })

        # Find breakeven point
        breakeven = None
        if commodity_price:
            for i, entry in enumerate(curve):
                if entry["aisc"] > commodity_price:
                    breakeven = {
                        "aisc_threshold": round(commodity_price, 2),
                        "pct_producing_below": curve[i - 1]["pct_of_total"] if i > 0 else 0,
                        "total_unprofitable": sum(
                            c["oz_koz"] for c in curve[i:]
                        ),
                    }
                    break

        return {
            "total_entities": len(valid),
            "total_oz_koz": round(total_oz, 1),
            "median_aisc": self.calculate_median(valid),
            "lowest_aisc": valid[0].aisc,
            "highest_aisc": valid[-1].aisc,
            "commodity_price": commodity_price,
            "breakeven": breakeven,
            "curve": curve,
        }

    def margin_analysis(
        self, metrics: List[AiscMetric], commodity_price: float
    ) -> Dict:
        """Comprehensive margin analysis at a given commodity price."""
        enriched = self.enrich_with_benchmarks(metrics)

        margins = []
        for m in enriched:
            if m.aisc is not None:
                margin_val = commodity_price - m.aisc
                margins.append({
                    "entity": m.entity_name,
                    "aisc": m.aisc,
                    "margin": round(margin_val, 2),
                    "margin_pct": round((margin_val / commodity_price) * 100, 1),
                    "net_aisc": round(m.net_aisc, 2),
                    "quartile": m.cost_quartile,
                })

        profitable = [m for m in margins if m["margin"] > 0]
        unprofitable = [m for m in margins if m["margin"] <= 0]

        return {
            "commodity_price": commodity_price,
            "total_entities": len(margins),
            "profitable_count": len(profitable),
            "unprofitable_count": len(unprofitable),
            "avg_margin": round(
                sum(m["margin"] for m in margins) / len(margins), 2
            ) if margins else 0,
            "median_margin": round(
                sorted([m["margin"] for m in margins])[len(margins) // 2], 2
            ) if margins else 0,
            "best_performer": max(margins, key=lambda x: x["margin"]) if margins else None,
            "worst_performer": min(margins, key=lambda x: x["margin"]) if margins else None,
            "margins": sorted(margins, key=lambda x: x["margin"], reverse=True),
        }

    def peer_comparison(
        self, entity_metrics: Dict[str, List[AiscMetric]], commodity_price: Optional[float] = None
    ) -> Dict:
        """Compare AISC profiles across multiple companies."""
        summary = {}
        for entity, metrics in entity_metrics.items():
            enriched = self.enrich_with_benchmarks(metrics)
            latest = max(enriched, key=lambda m: (m.year, m.quarter or 0))

            summary[entity] = {
                "latest_aisc": latest.aisc,
                "latest_net_aisc": round(latest.net_aisc, 2),
                "quartile": latest.cost_quartile,
                "vs_median": latest.vs_median,
                "percentile_rank": latest.percentile_rank,
                "oz_produced_koz": latest.ounces_produced_koz,
            }

        return {
            "entities": summary,
            "commodity_price": commodity_price,
            "median_across_all": self.calculate_median(
                [m for ms in entity_metrics.values() for m in ms]
            ),
        }
