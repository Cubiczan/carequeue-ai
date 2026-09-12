"""
MiningIntelligenceService — Orchestrator that ties pricing, reserves,
production, and AISC together for cross-company comparative intelligence.

Produces signal scores and AI-ready context for Azure AI Foundry agents.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from ..models.mining_company import MiningCompany, CompanyTier
from ..models.commodity_price import CommodityPrice
from ..models.reserve_estimate import ReserveEstimate
from ..models.production_record import ProductionRecord
from ..models.aisc_metric import AiscMetric
from .pricing_service import PricingService
from .reserve_service import ReserveService
from .production_service import ProductionService
from .aisc_service import AiscService

logger = logging.getLogger(__name__)


@dataclass
class MiningIntelligenceService:
    """
    Top-level orchestrator for mining intelligence.

    Combines pricing, reserves, production, and cost data to generate
    composite signal scores and AI-ready analysis context.
    """

    pricing_service: PricingService = field(default_factory=PricingService)
    reserve_service: ReserveService = field(default_factory=ReserveService)
    production_service: ProductionService = field(default_factory=ProductionService)
    aisc_service: AiscService = field(default_factory=AiscService)

    # Signal weightings
    w_grade: float = 0.25
    w_cost: float = 0.25
    w_production: float = 0.20
    w_growth: float = 0.15
    w_esg: float = 0.15

    def calculate_signal_score(
        self,
        company: MiningCompany,
        reserves: Optional[List[ReserveEstimate]] = None,
        production: Optional[List[ProductionRecord]] = None,
        aisc_metrics: Optional[List[AiscMetric]] = None,
        commodity_price: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Calculate a composite 0-100 signal score for a mining company.

        Components:
          - Grade Signal: reserve quality (avg grade, P/P ratio)
          - Cost Signal: AISC percentile rank
          - Production Signal: output consistency and guidance beat rate
          - Growth Signal: reserve/resource conversion potential
          - ESG Signal: ESG score if available
        """
        scores: Dict[str, float] = {}

        # Grade signal (0-100)
        if reserves:
            avg_grade = self.reserve_service.weighted_average_grade(reserves)
            conv_ratio = self.reserve_service.reserve_to_resource_ratio(reserves)
            # Normalize: grade signal based on percentile within typical ranges
            grade_score = min(100, max(0, (avg_grade / 5.0) * 50 + (conv_ratio * 100)))
            scores["grade"] = round(grade_score, 1)
        else:
            scores["grade"] = 50.0  # neutral

        # Cost signal (0-100) — lower AISC percentile = higher score
        if aisc_metrics and commodity_price:
            enriched = self.aisc_service.enrich_with_benchmarks(aisc_metrics)
            latest = max(enriched, key=lambda m: (m.year, m.quarter or 0))
            if latest.percentile_rank is not None:
                scores["cost"] = round(100 - latest.percentile_rank, 1)
            else:
                scores["cost"] = 50.0
        else:
            scores["cost"] = 50.0

        # Production signal (0-100)
        if production:
            guidance = self.production_service.guidance_analysis(production)
            recovery = self.production_service.recovery_efficiency(production)
            guidance_score = guidance.get("beat_rate_pct", 50)
            recovery_score = min(100, recovery.get("avg_recovery_pct", 90))
            scores["production"] = round((guidance_score + recovery_score) / 2, 1)
        else:
            scores["production"] = 50.0

        # Growth signal (0-100)
        if reserves:
            conv = self.reserve_service.reserve_to_resource_ratio(reserves)
            scores["growth"] = round(min(100, conv * 150), 1)
        else:
            scores["growth"] = 50.0

        # ESG signal (0-100)
        if company.esg_score is not None:
            scores["esg"] = company.esg_score
        else:
            scores["esg"] = 50.0

        # Weighted composite
        composite = (
            scores["grade"] * self.w_grade
            + scores["cost"] * self.w_cost
            + scores["production"] * self.w_production
            + scores["growth"] * self.w_growth
            + scores["esg"] * self.w_esg
        )

        return {
            "company": company.name,
            "ticker": company.ticker,
            "tier": company.company_tier.value,
            "composite_score": round(composite, 1),
            "scores": scores,
            "weightings": {
                "grade": self.w_grade,
                "cost": self.w_cost,
                "production": self.w_production,
                "growth": self.w_growth,
                "esg": self.w_esg,
            },
            "rating": self._score_to_rating(composite),
        }

    def _score_to_rating(self, score: float) -> str:
        if score >= 80:
            return "Strong Buy"
        elif score >= 65:
            return "Buy"
        elif score >= 50:
            return "Hold"
        elif score >= 35:
            return "Underperform"
        else:
            return "Sell"

    def build_ai_context(
        self,
        company: MiningCompany,
        reserves: Optional[List[ReserveEstimate]] = None,
        production: Optional[List[ProductionRecord]] = None,
        aisc_metrics: Optional[List[AiscMetric]] = None,
        prices: Optional[Dict[str, CommodityPrice]] = None,
        signal_score: Optional[Dict] = None,
    ) -> str:
        """
        Build a structured text context for AI Foundry agent prompts.
        This is the input that the Comparative Analysis Agent will receive.
        """
        sections = []

        sections.append(f"# {company.name} ({company.ticker})")
        sections.append(f"- **Tier:** {company.company_tier.value}")
        sections.append(f"- **Sector:** {company.sector}")
        sections.append(f"- **HQ:** {company.headquarters}")
        sections.append(f"- **Commodities:** {', '.join(company.primary_commodities)}")
        if company.secondary_commodities:
            sections.append(f"- **By-products:** {', '.join(company.secondary_commodities)}")
        if company.market_cap_usd:
            sections.append(f"- **Market Cap:** ${company.market_cap_usd / 1e9:.1f}B" if company.market_cap_usd >= 1e9 else f"- **Market Cap:** ${company.market_cap_usd / 1e6:.0f}M")
        if company.esg_score:
            sections.append(f"- **ESG Score:** {company.esg_score:.0f}/100")
        sections.append("")

        if signal_score:
            sections.append("## Signal Score")
            sections.append(f"- **Composite:** {signal_score['composite_score']}/100 ({signal_score['rating']})")
            for k, v in signal_score["scores"].items():
                sections.append(f"- **{k.capitalize()}:** {v}/100")
            sections.append("")

        if prices:
            sections.append("## Commodity Prices")
            for name, price in prices.items():
                sections.append(f"- **{name}:** ${price.price:,.2f} {price.unit.value}")
            sections.append("")

        if reserves:
            sections.append("## Reserves & Resources")
            agg = self.reserve_service.aggregate_by_classification(reserves)
            for cls, vals in agg.items():
                label = cls
                sections.append(f"- **{cls}:** {vals['tonnage_kt']:,.0f} kt | {vals['contained_metal']:,.0f} contained units")
            pp_ton, pp_metal = self.reserve_service.total_proven_probable(reserves)
            sections.append(f"- **Total P/P:** {pp_ton:,.0f} kt | {pp_metal:,.0f} contained")
            sections.append("")

        if production:
            sections.append("## Production")
            guidance = self.production_service.guidance_analysis(production)
            annual = self.production_service.annualized_production(production)
            if annual:
                latest = annual[-1]
                sections.append(f"- **Latest Annual:** {latest['metal_produced']:,.1f} {latest['metal_unit']}")
            if guidance.get("beat_rate_pct") is not None:
                sections.append(f"- **Guidance Beat Rate:** {guidance['beat_rate_pct']}%")
            sections.append("")

        if aisc_metrics:
            enriched = self.aisc_service.enrich_with_benchmarks(aisc_metrics)
            latest = max(enriched, key=lambda m: (m.year, m.quarter or 0))
            sections.append("## Cost Profile (AISC)")
            sections.append(f"- **AISC:** ${latest.aisc:,.0f} {latest.cost_unit}")
            sections.append(f"- **Net AISC (after credits):** ${latest.net_aisc:,.0f}")
            if latest.cost_quartile:
                sections.append(f"- **Cost Quartile:** {latest.cost_quartile}")
            sections.append("")

        return "\n".join(sections)
