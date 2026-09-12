"""
ProductionService — Production analytics, trend tracking, and guidance analysis.

Computes production rates, grade trends, recovery efficiency, and
guidance beat/miss metrics for individual mines or company-level rollups.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from ..models.production_record import ProductionRecord, PeriodType

logger = logging.getLogger(__name__)


@dataclass
class ProductionService:
    """Service for production analytics and benchmarking."""

    def total_production(
        self, records: List[ProductionRecord]
    ) -> Tuple[float, str]:
        """Sum total metal produced across records."""
        unit = records[0].metal_unit if records else "koz"
        total = sum(r.metal_produced for r in records)
        return total, unit

    def annualized_production(
        self, records: List[ProductionRecord]
    ) -> Optional[Dict]:
        """Calculate annualized production from quarterly records."""
        if not records:
            return None

        yearly: Dict[int, List[ProductionRecord]] = {}
        for r in records:
            yearly.setdefault(r.year, []).append(r)

        annual = []
        for year, recs in sorted(yearly.items()):
            total = sum(r.metal_produced for r in recs)
            total_tonnes = sum(r.tonnes_milled_kt for r in recs)
            avg_grade = (
                sum(r.ore_grade * r.tonnes_milled_kt for r in recs) / total_tonnes
                if total_tonnes > 0 else 0
            )
            annual.append({
                "year": year,
                "metal_produced": round(total, 2),
                "metal_unit": recs[0].metal_unit,
                "tonnes_milled_kt": round(total_tonnes, 1),
                "avg_grade": round(avg_grade, 4),
                "quarters_reported": len(recs),
            })

        return annual

    def grade_trend(
        self, records: List[ProductionRecord]
    ) -> Dict:
        """Analyze ore grade trend over time."""
        if len(records) < 2:
            return {"trend": "insufficient_data", "direction": "flat"}

        sorted_recs = sorted(records, key=lambda r: (r.year, r.quarter or 0))

        grades = [r.ore_grade for r in sorted_recs]
        first_half = grades[: len(grades) // 2]
        second_half = grades[len(grades) // 2 :]

        avg_first = sum(first_half) / len(first_half)
        avg_second = sum(second_half) / len(second_half)
        change_pct = ((avg_second - avg_first) / avg_first * 100) if avg_first > 0 else 0

        direction = "declining" if change_pct < -2 else ("improving" if change_pct > 2 else "stable")

        return {
            "trend": direction,
            "direction": direction,
            "earliest_avg_grade": round(avg_first, 4),
            "latest_avg_grade": round(avg_second, 4),
            "change_pct": round(change_pct, 2),
            "periods_analyzed": len(records),
        }

    def recovery_efficiency(
        self, records: List[ProductionRecord]
    ) -> Dict:
        """Analyze metallurgical recovery rates."""
        if not records:
            return {}

        recoveries = [r.recovery_pct for r in records if r.recovery_pct > 0]
        if not recoveries:
            return {}

        effective = [r.effective_recovery for r in records if r.effective_recovery > 0]

        return {
            "avg_recovery_pct": round(sum(recoveries) / len(recoveries), 2),
            "min_recovery_pct": round(min(recoveries), 2),
            "max_recovery_pct": round(max(recoveries), 2),
            "avg_effective_recovery_pct": round(sum(effective) / len(effective), 2) if effective else None,
            "recovery_std_dev": round(
                (sum((r - sum(recoveries) / len(recoveries)) ** 2 for r in recoveries) / len(recoveries)) ** 0.5,
                2,
            ),
        }

    def guidance_analysis(
        self, records: List[ProductionRecord]
    ) -> Dict:
        """Analyze production guidance beat/miss patterns."""
        guided = [r for r in records if r.guidance_metal is not None]
        if not guided:
            return {"status": "no_guidance_data"}

        beats = sum(1 for r in guided if r.beat_guidance)
        misses = len(guided) - beats
        avg_variance = (
            sum(r.guidance_variance_pct for r in guided if r.guidance_variance_pct is not None)
            / len(guided)
        )

        return {
            "periods_with_guidance": len(guided),
            "beats": beats,
            "misses": misses,
            "beat_rate_pct": round((beats / len(guided)) * 100, 1),
            "avg_variance_pct": round(avg_variance, 2),
            "consistency_rating": "strong" if beats / len(guided) >= 0.7 else ("moderate" if beats / len(guided) >= 0.5 else "weak"),
        }

    def compare_production(
        self,
        portfolios: Dict[str, List[ProductionRecord]],
    ) -> List[Dict]:
        """Compare production metrics across entities."""
        comparison = []
        for entity, records in portfolios.items():
            total, unit = self.total_production(records)
            grade_trend = self.grade_trend(records)
            recovery = self.recovery_efficiency(records)
            guidance = self.guidance_analysis(records)

            comparison.append({
                "entity": entity,
                "total_produced": round(total, 2),
                "unit": unit,
                "periods": len(records),
                "avg_grade": round(
                    sum(r.ore_grade for r in records) / len(records), 4
                ) if records else 0,
                "grade_trend": grade_trend.get("direction", "flat"),
                "avg_recovery_pct": recovery.get("avg_recovery_pct"),
                "guidance_beat_rate": guidance.get("beat_rate_pct"),
            })

        comparison.sort(key=lambda x: x["total_produced"], reverse=True)
        return comparison
