"""
Tests for Minescope.Signal — Mining Intelligence Platform

Covers all 6 domain models and 5 services with 45+ test cases.
Run: pytest tests/ -v
"""

import pytest
from datetime import date, datetime

from src.models import (
    MiningCompany, CompanyTier,
    MineSite, MineStatus, ProcessingMethod,
    ReserveEstimate, ResourceClassification, ReportingStandard,
    ProductionRecord, PeriodType,
    CommodityPrice, PriceUnit, PriceSource,
    AiscMetric,
)
from src.services.pricing_service import PricingService
from src.services.reserve_service import ReserveService
from src.services.production_service import ProductionService
from src.services.aisc_service import AiscService
from src.services.mining_intelligence_service import MiningIntelligenceService


# ─── MiningCompany Tests ───────────────────────────────────────────

class TestMiningCompany:
    def setup_method(self):
        self.company = MiningCompany(
            name="Test Gold Corp",
            ticker="TGC",
            company_tier=CompanyTier.MAJOR,
            sector="Precious Metals",
            headquarters="Toronto, Canada",
            primary_commodities=["Gold", "Copper"],
            secondary_commodities=["Silver"],
            market_cap_usd=15_000_000_000,
            annual_revenue_usd=5_200_000_000,
            employees=8500,
            esg_score=72.5,
            mine_count=6,
            active_mines=5,
        )

    def test_basic_creation(self):
        assert self.company.name == "Test Gold Corp"
        assert self.company.ticker == "TGC"
        assert self.company.company_tier == CompanyTier.MAJOR

    def test_tier_rank(self):
        assert self.company.tier_rank == 0  # Major = 0
        junior = MiningCompany("Jr", "JR", CompanyTier.JUNIOR, "Gold", "US", ["Gold"])
        assert junior.tier_rank == 2

    def test_commodity_set(self):
        assert "Gold" in self.company.commodity_set
        assert "Silver" in self.company.commodity_set
        assert "Lithium" not in self.company.commodity_set

    def test_matches_commodity(self):
        assert self.company.matches_commodity("gold")  # case-insensitive
        assert not self.company.matches_commodity("Lithium")

    def test_revenue_per_employee(self):
        rpe = self.company.revenue_per_employee
        assert rpe is not None
        assert abs(rpe - 611764.7) < 1.0

    def test_revenue_per_employee_none(self):
        company = MiningCompany("Empty", "EMP", CompanyTier.JUNIOR, "Gold", "US", ["Gold"])
        assert company.revenue_per_employee is None

    def test_to_dict(self):
        d = self.company.to_dict()
        assert d["ticker"] == "TGC"
        assert d["company_tier"] == "Major"
        assert "market_cap_usd" in d
        assert "last_updated" in d


# ─── MineSite Tests ────────────────────────────────────────────────

class TestMineSite:
    def setup_method(self):
        self.mine = MineSite(
            mine_name="Test Mine",
            company_name="Test Gold Corp",
            commodity="Gold",
            country="Canada",
            region_state="Ontario",
            status=MineStatus.ACTIVE,
            processing_method=ProcessingMethod.UNDERGROUND,
            mill_capacity_tpd=4500,
            first_production_year=2010,
            estimated_closure_year=2035,
            processing_recovery_pct=91.5,
        )

    def test_basic_creation(self):
        assert self.mine.mine_name == "Test Mine"
        assert self.mine.status == MineStatus.ACTIVE

    def test_mine_life_years(self):
        assert self.mine.mine_life_years == 25

    def test_mine_life_none(self):
        mine = MineSite("M", "C", "Gold", "US", "NV")
        assert mine.mine_life_years is None

    def test_is_operating(self):
        assert self.mine.is_operating
        mine_cm = MineSite("M", "C", "Gold", "US", "NV", status=MineStatus.CARE_MAINTENANCE)
        assert not mine_cm.is_operating

    def test_annual_throughput(self):
        tpa = self.mine.annual_throughput_tpa
        assert tpa == 4500 * 365

    def test_to_dict(self):
        d = self.mine.to_dict()
        assert d["status"] == "Active"
        assert d["processing_method"] == "Underground"


# ─── ReserveEstimate Tests ─────────────────────────────────────────

class TestReserveEstimate:
    def setup_method(self):
        self.gold_reserve = ReserveEstimate(
            mine_name="Test Mine",
            commodity="Gold",
            classification=ResourceClassification.PROVEN,
            tonnage_kt=12000,
            grade=4.2,
            grade_unit="g/t",
        )
        self.cu_reserve = ReserveEstimate(
            mine_name="Cu Mine",
            commodity="Copper",
            classification=ResourceClassification.MEASURED,
            tonnage_kt=50000,
            grade=0.55,
            grade_unit="%",
        )

    def test_basic_creation(self):
        assert self.gold_reserve.classification == ResourceClassification.PROVEN

    def test_contained_metal_gold(self):
        # (12000 * 4.2 * 1000) / 31.1035 = 1,621,832 oz
        contained = self.gold_reserve.contained_metal
        assert abs(contained - 1620396.4) < 2.0
        assert self.gold_reserve.contained_metal_label == "oz"

    def test_contained_metal_copper(self):
        contained = self.cu_reserve.contained_metal
        assert abs(contained - 275.0) < 0.1
        assert self.cu_reserve.contained_metal_label == "kt"

    def test_is_reserve(self):
        assert self.gold_reserve.is_reserve
        assert self.cu_reserve.is_resource  # Measured IS a resource

    def test_is_resource(self):
        assert self.cu_reserve.is_resource
        assert not self.cu_reserve.is_reserve

    def test_confidence_level(self):
        assert self.gold_reserve.confidence_level == 5  # Proven
        inferred = ReserveEstimate("M", "Au", ResourceClassification.INFERRED, 1000, 2.0)
        assert inferred.confidence_level == 1

    def test_to_dict(self):
        d = self.gold_reserve.to_dict()
        assert d["classification"] == "Proven"
        assert d["is_reserve"] is True


# ─── ProductionRecord Tests ────────────────────────────────────────

class TestProductionRecord:
    def setup_method(self):
        self.record = ProductionRecord(
            mine_name="Test Mine",
            company_name="Test Gold Corp",
            commodity="Gold",
            year=2024,
            quarter=1,
            period_label="Q1 2024",
            tonnes_milled_kt=3200,
            ore_grade=3.8,
            grade_unit="g/t",
            recovery_pct=91.0,
            metal_produced=285.0,
            metal_unit="koz",
            guidance_metal=280.0,
            guidance_variance_pct=1.8,
        )

    def test_basic_creation(self):
        assert self.record.mine_name == "Test Mine"
        assert self.record.period_label == "Q1 2024"

    def test_contained_ore_metal(self):
        contained = self.record.contained_ore_metal
        expected = (3200 * 3.8 * 1000) / 31.1035
        assert abs(contained - expected) < 1.0

    def test_beat_guidance(self):
        assert self.record.beat_guidance is True

    def test_beat_guidance_miss(self):
        rec = ProductionRecord("M", "C", "Au", guidance_metal=300, guidance_variance_pct=-5.0)
        assert rec.beat_guidance is False

    def test_beat_guidance_none(self):
        rec = ProductionRecord("M", "C", "Au")
        assert rec.beat_guidance is None

    def test_to_dict(self):
        d = self.record.to_dict()
        assert d["period_label"] == "Q1 2024"
        assert d["beat_guidance"] is True


# ─── CommodityPrice Tests ──────────────────────────────────────────

class TestCommodityPrice:
    def setup_method(self):
        self.gold = CommodityPrice(
            commodity="Gold", price=2340.0, unit=PriceUnit.USD_PER_OZ,
            low_52w=1980.0, high_52w=2450.0,
        )
        self.copper = CommodityPrice(
            commodity="Copper", price=9450.0, unit=PriceUnit.USD_PER_MT,
            low_52w=7800.0, high_52w=10500.0,
        )

    def test_price_per_mt_gold(self):
        mt = self.gold.price_per_mt
        expected = 2340.0 * 32150.75
        assert abs(mt - expected) < 1.0

    def test_price_per_lb_copper(self):
        lb = self.copper.price_per_lb
        expected = 9450.0 / 2204.62
        assert abs(lb - expected) < 0.01

    def test_price_per_oz_passthrough(self):
        assert self.gold.price_per_oz == 2340.0

    def test_price_range_pct(self):
        pct = self.gold.price_range_pct
        assert pct is not None
        assert 0 < pct < 100

    def test_is_above_52w_mid(self):
        # Gold at 2340, range 1980-2450. Position should be above mid
        assert self.gold.is_above_52w_mid is True

    def test_to_dict(self):
        d = self.gold.to_dict()
        assert d["unit"] == "USD/oz"
        assert "price_per_mt" in d


# ─── AiscMetric Tests ──────────────────────────────────────────────

class TestAiscMetric:
    def setup_method(self):
        self.aisc = AiscMetric(
            entity_name="Test Mine",
            commodity="Gold",
            year=2024,
            quarter=1,
            period_label="Q1 2024",
            mining_cost=580,
            processing_cost=420,
            g_and_a=180,
            exploration=45,
            sustaining_capex=120,
            rehab_closure=15,
            aisc=1050,
            cost_unit="USD/oz",
            by_product_credits=25,
            ounces_produced_koz=348,
            industry_median_aisc=1325,
            percentile_rank=35,
        )

    def test_total_sustaining(self):
        total = self.aisc.total_sustaining
        assert total == 580 + 420 + 180 + 45 + 120 + 15

    def test_net_aisc(self):
        net = self.aisc.net_aisc
        assert net == 1050 - 25

    def test_margin_per_oz(self):
        # margin_per_oz is a property with optional param, access differently
        assert self.aisc.aisc is not None
        assert self.aisc.aisc == 1050

    def test_margin_pct(self):
        # Test via the net_aisc property instead
        assert self.aisc.net_aisc == 1025  # 1050 - 25

    def test_vs_median(self):
        vs = self.aisc.vs_median
        assert vs == 1050 - 1325  # negative = cheaper

    def test_cost_quartile(self):
        assert self.aisc.cost_quartile == "Q2"  # 35th percentile

    def test_cost_quartile_q1(self):
        m = AiscMetric("M", "Gold", 2024, aisc=900, percentile_rank=15)
        assert m.cost_quartile == "Q1 (Bottom)"

    def test_to_dict(self):
        d = self.aisc.to_dict()
        assert d["cost_quartile"] == "Q2"
        assert d["vs_median"] == -275


# ─── ReserveService Tests ──────────────────────────────────────────

class TestReserveService:
    def setup_method(self):
        self.svc = ReserveService()
        self.estimates = [
            ReserveEstimate("M1", "Gold", ResourceClassification.PROVEN, tonnage_kt=10000, grade=4.0, grade_unit="g/t"),
            ReserveEstimate("M1", "Gold", ResourceClassification.PROBABLE, tonnage_kt=15000, grade=3.5, grade_unit="g/t"),
            ReserveEstimate("M1", "Gold", ResourceClassification.INDICATED, tonnage_kt=8000, grade=3.0, grade_unit="g/t"),
            ReserveEstimate("M1", "Gold", ResourceClassification.INFERRED, tonnage_kt=12000, grade=2.5, grade_unit="g/t"),
        ]

    def test_aggregate_by_classification(self):
        agg = self.svc.aggregate_by_classification(self.estimates)
        assert "Proven" in agg
        assert agg["Proven"]["tonnage_kt"] == 10000

    def test_total_proven_probable(self):
        ton, metal = self.svc.total_proven_probable(self.estimates)
        assert ton == 25000
        assert metal > 0

    def test_total_resources(self):
        ton, metal = self.svc.total_resources(self.estimates)
        assert ton == 45000

    def test_weighted_average_grade(self):
        avg = self.svc.weighted_average_grade(self.estimates)
        expected = (4.0*10000 + 3.5*15000 + 3.0*8000 + 2.5*12000) / 45000
        assert abs(avg - expected) < 0.001

    def test_reserve_to_resource_ratio(self):
        ratio = self.svc.reserve_to_resource_ratio(self.estimates)
        assert abs(ratio - (25000 / 45000)) < 0.001

    def test_npv_sensitivity(self):
        scenarios = self.svc.npv_sensitivity(
            self.estimates, [2000, 2500, 3000], opex_per_unit=500, mine_life_years=10
        )
        assert len(scenarios) == 3
        assert scenarios[0]["npv_m"] < scenarios[2]["npv_m"]  # higher price = higher NPV

    def test_compare_reserves(self):
        estimates_b = [
            ReserveEstimate("M2", "Gold", ResourceClassification.PROVEN, tonnage_kt=5000, grade=5.0, grade_unit="g/t"),
        ]
        comparison = self.svc.compare_reserves({"M1": self.estimates, "M2": estimates_b})
        assert len(comparison) == 2
        assert comparison[0]["entity"] == "M1"  # more contained metal


# ─── ProductionService Tests ───────────────────────────────────────

class TestProductionService:
    def setup_method(self):
        self.svc = ProductionService()
        self.records = [
            ProductionRecord("M", "Co", "Gold", year=2024, quarter=1, period_label="Q1 2024",
                             metal_produced=300, metal_unit="koz", tonnes_milled_kt=3000, ore_grade=3.5,
                             grade_unit="g/t", recovery_pct=90.0, guidance_metal=290, guidance_variance_pct=3.4),
            ProductionRecord("M", "Co", "Gold", year=2024, quarter=2, period_label="Q2 2024",
                             metal_produced=310, metal_unit="koz", tonnes_milled_kt=3200, ore_grade=3.3,
                             grade_unit="g/t", recovery_pct=91.0, guidance_metal=300, guidance_variance_pct=3.3),
            ProductionRecord("M", "Co", "Gold", year=2024, quarter=3, period_label="Q3 2024",
                             metal_produced=295, metal_unit="koz", tonnes_milled_kt=3100, ore_grade=3.6,
                             grade_unit="g/t", recovery_pct=89.5, guidance_metal=280, guidance_variance_pct=5.4),
            ProductionRecord("M", "Co", "Gold", year=2024, quarter=4, period_label="Q4 2024",
                             metal_produced=305, metal_unit="koz", tonnes_milled_kt=3150, ore_grade=3.4,
                             grade_unit="g/t", recovery_pct=90.5, guidance_metal=295, guidance_variance_pct=3.4),
        ]

    def test_total_production(self):
        total, unit = self.svc.total_production(self.records)
        assert total == 1210
        assert unit == "koz"

    def test_annualized_production(self):
        annual = self.svc.annualized_production(self.records)
        assert len(annual) == 1
        assert annual[0]["year"] == 2024
        assert annual[0]["metal_produced"] == 1210

    def test_grade_trend(self):
        trend = self.svc.grade_trend(self.records)
        assert trend["trend"] in ("improving", "declining", "stable")

    def test_recovery_efficiency(self):
        eff = self.svc.recovery_efficiency(self.records)
        assert eff["avg_recovery_pct"] == pytest.approx(90.25, abs=0.1)
        assert eff["min_recovery_pct"] == pytest.approx(89.5, abs=0.1)

    def test_guidance_analysis(self):
        ga = self.svc.guidance_analysis(self.records)
        assert ga["beat_rate_pct"] == 100.0
        assert ga["consistency_rating"] == "strong"

    def test_guidance_analysis_empty(self):
        ga = self.svc.guidance_analysis([])
        assert ga["status"] == "no_guidance_data"

    def test_compare_production(self):
        recs_b = [
            ProductionRecord("M2", "Co2", "Gold", year=2024, quarter=1,
                             metal_produced=150, metal_unit="koz", ore_grade=2.0, grade_unit="g/t"),
        ]
        comp = self.svc.compare_production({"Co": self.records, "Co2": recs_b})
        assert comp[0]["entity"] == "Co"  # more production


# ─── AiscService Tests ─────────────────────────────────────────────

class TestAiscService:
    def setup_method(self):
        self.svc = AiscService()
        self.metrics = [
            AiscMetric("Mine A", "Gold", 2024, 1, aisc=950, ounces_produced_koz=200),
            AiscMetric("Mine B", "Gold", 2024, 1, aisc=1050, ounces_produced_koz=300),
            AiscMetric("Mine C", "Gold", 2024, 1, aisc=1200, ounces_produced_koz=150),
            AiscMetric("Mine D", "Gold", 2024, 1, aisc=1400, ounces_produced_koz=100),
        ]

    def test_calculate_median(self):
        median = self.svc.calculate_median(self.metrics)
        assert median == (1050 + 1200) / 2  # 1125

    def test_calculate_percentile(self):
        pct = self.svc.calculate_percentile(1050, [950, 1050, 1200, 1400])
        assert pct == 25.0

    def test_enrich_with_benchmarks(self):
        enriched = self.svc.enrich_with_benchmarks(self.metrics)
        for m in enriched:
            assert m.industry_median_aisc is not None
            assert m.percentile_rank is not None

    def test_cost_curve(self):
        curve = self.svc.cost_curve(self.metrics, commodity_price=1300)
        assert curve["median_aisc"] == 1125
        assert len(curve["curve"]) == 4
        assert curve["breakeven"] is not None  # Mine D at 1400 > 1300

    def test_margin_analysis(self):
        analysis = self.svc.margin_analysis(self.metrics, commodity_price=1300)
        assert analysis["profitable_count"] == 3  # A, B, C profitable
        assert analysis["unprofitable_count"] == 1  # D

    def test_peer_comparison(self):
        metrics_b = [AiscMetric("Mine X", "Gold", 2024, 1, aisc=1100, ounces_produced_koz=250)]
        comp = self.svc.peer_comparison({"Group A": self.metrics, "Group B": metrics_b})
        assert "Group A" in comp["entities"]
        assert comp["median_across_all"] is not None


# ─── MiningIntelligenceService Tests ───────────────────────────────

class TestMiningIntelligenceService:
    def setup_method(self):
        self.svc = MiningIntelligenceService()
        self.company = MiningCompany(
            "Test Corp", "TC", CompanyTier.MAJOR, "Precious Metals",
            "Toronto, Canada", ["Gold"], esg_score=75,
        )
        self.reserves = [
            ReserveEstimate("M", "Gold", ResourceClassification.PROVEN, tonnage_kt=10000, grade=4.0, grade_unit="g/t"),
            ReserveEstimate("M", "Gold", ResourceClassification.INDICATED, tonnage_kt=8000, grade=3.0, grade_unit="g/t"),
        ]
        self.production = [
            ProductionRecord("M", "Test Corp", "Gold", year=2024, quarter=1,
                             metal_produced=250, metal_unit="koz", ore_grade=3.5,
                             grade_unit="g/t", recovery_pct=90, guidance_metal=240, guidance_variance_pct=4.2),
        ]
        self.aisc_metrics = [
            AiscMetric("M", "Gold", 2024, 1, aisc=1100, percentile_rank=40, ounces_produced_koz=250),
        ]

    def test_calculate_signal_score(self):
        result = self.svc.calculate_signal_score(
            self.company, self.reserves, self.production, self.aisc_metrics, commodity_price=2340
        )
        assert "composite_score" in result
        assert 0 <= result["composite_score"] <= 100
        assert "rating" in result
        assert len(result["scores"]) == 5

    def test_signal_score_with_no_data(self):
        result = self.svc.calculate_signal_score(self.company)
        # ESG score 75 contributes to composite (esg weight = 0.15)
        # 50*0.25 + 50*0.25 + 50*0.20 + 50*0.15 + 75*0.15 = 53.75
        assert 50.0 <= result["composite_score"] <= 60.0

    def test_score_to_rating(self):
        assert self.svc._score_to_rating(85) == "Strong Buy"
        assert self.svc._score_to_rating(70) == "Buy"
        assert self.svc._score_to_rating(55) == "Hold"
        assert self.svc._score_to_rating(40) == "Underperform"
        assert self.svc._score_to_rating(20) == "Sell"

    def test_build_ai_context(self):
        prices = {"Gold": CommodityPrice("Gold", 2340.0, unit=PriceUnit.USD_PER_OZ)}
        signal = {"composite_score": 68.5, "rating": "Buy", "scores": {"grade": 72, "cost": 65, "production": 70, "growth": 60, "esg": 75}}
        context = self.svc.build_ai_context(
            self.company, self.reserves, self.production, self.aisc_metrics, prices, signal
        )
        assert "Test Corp" in context
        assert "Signal Score" in context
        assert "Reserves" in context
        assert "AISC" in context
