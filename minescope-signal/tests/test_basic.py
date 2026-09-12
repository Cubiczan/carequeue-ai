"""Basic smoke tests for minescope-signal models and services."""

import pytest


class TestReserveEstimate:
    """Tests for the ReserveEstimate dataclass."""

    def test_create_reserve_estimate(self):
        from src.models.reserve_estimate import ReserveEstimate, ResourceClassification
        r = ReserveEstimate(
            mine_name="Carlin",
            commodity="Gold",
            classification=ResourceClassification.PROVEN,
            tonnage_kt=50000,
            grade=5.2,
            grade_unit="g/t",
        )
        assert r.mine_name == "Carlin"
        assert r.is_reserve is True
        assert r.is_resource is False

    def test_resource_classification(self):
        from src.models.reserve_estimate import ResourceClassification
        assert ResourceClassification.PROVEN.value == "Proven"
        assert ResourceClassification.INFERRED.value == "Inferred"

    def test_contained_metal_gt(self):
        from src.models.reserve_estimate import ReserveEstimate, ResourceClassification
        r = ReserveEstimate(
            mine_name="Test", commodity="Gold",
            classification=ResourceClassification.PROVEN,
            tonnage_kt=1000, grade=10.0, grade_unit="g/t",
        )
        # 1000 kt * 10 g/t * 1000 kg/kt / 31.1035 g/oz
        assert r.contained_metal > 0
        assert r.contained_metal_label == "oz"

    def test_contained_metal_pct(self):
        from src.models.reserve_estimate import ReserveEstimate, ResourceClassification
        r = ReserveEstimate(
            mine_name="Test", commodity="Copper",
            classification=ResourceClassification.MEASURED,
            tonnage_kt=10000, grade=2.5, grade_unit="%",
        )
        assert r.contained_metal == 250.0  # 10000 * 2.5 / 100
        assert r.is_resource is True

    def test_confidence_level(self):
        from src.models.reserve_estimate import ReserveEstimate, ResourceClassification
        proven = ReserveEstimate(mine_name="A", commodity="Au", classification=ResourceClassification.PROVEN, tonnage_kt=1, grade=1)
        inferred = ReserveEstimate(mine_name="B", commodity="Au", classification=ResourceClassification.INFERRED, tonnage_kt=1, grade=1)
        assert proven.confidence_level > inferred.confidence_level

    def test_to_dict(self):
        from src.models.reserve_estimate import ReserveEstimate, ResourceClassification
        r = ReserveEstimate(
            mine_name="Carlin", commodity="Gold",
            classification=ResourceClassification.PROVEN,
            tonnage_kt=50000, grade=5.2, grade_unit="g/t",
        )
        d = r.to_dict()
        assert d["mine_name"] == "Carlin"
        assert d["classification"] == "Proven"
        assert d["is_reserve"] is True

    def test_reporting_standard(self):
        from src.models.reserve_estimate import ReportingStandard
        assert ReportingStandard.NI_43_101.value == "NI 43-101"
        assert ReportingStandard.JORC.value == "JORC"


class TestMiningCompany:
    """Tests for the MiningCompany dataclass."""

    def test_company_tier(self):
        from src.models.mining_company import CompanyTier
        assert CompanyTier.MAJOR.value == "Major"
        assert CompanyTier.JUNIOR.value == "Junior"


class TestMiningIntelligenceService:
    """Tests for MiningIntelligenceService scoring."""

    def test_score_to_rating(self):
        from src.services.mining_intelligence_service import MiningIntelligenceService
        svc = MiningIntelligenceService()
        assert svc._score_to_rating(85) == "Strong Buy"
        assert svc._score_to_rating(70) == "Buy"
        assert svc._score_to_rating(55) == "Hold"
        assert svc._score_to_rating(40) == "Underperform"
        assert svc._score_to_rating(20) == "Sell"

    def test_default_weightings(self):
        from src.services.mining_intelligence_service import MiningIntelligenceService
        svc = MiningIntelligenceService()
        assert svc.w_grade == 0.25
        assert svc.w_cost == 0.25
        total = svc.w_grade + svc.w_cost + svc.w_production + svc.w_growth + svc.w_esg
        assert abs(total - 1.0) < 1e-9
