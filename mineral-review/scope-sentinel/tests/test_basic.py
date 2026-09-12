"""Basic smoke tests for scope-sentinel models and services."""

import pytest


class TestREITModel:
    """Tests for the REIT dataclass."""

    def test_create_reit(self):
        from src.models.reit import REIT, REITSector
        reit = REIT(ticker="O", name="Realty Income", sector=REITSector.RETAIL)
        assert reit.ticker == "O"
        assert reit.sector == REITSector.RETAIL

    def test_reit_validation_uppercase_ticker(self):
        from src.models.reit import REIT, REITSector
        reit = REIT(ticker="amt", name="American Tower", sector=REITSector.INFRASTRUCTURE)
        assert reit.ticker == "AMT"

    def test_reit_validation_empty_ticker_raises(self):
        from src.models.reit import REIT, REITSector
        with pytest.raises(ValueError, match="ticker must be non-empty"):
            REIT(ticker="  ", name="Bad", sector=REITSector.RETAIL)

    def test_reit_sector_enum(self):
        from src.models.reit import REITSector
        assert REITSector.RETAIL.value == "Retail"
        assert REITSector.DATA_CENTER.value == "DataCenter"

    def test_create_seed_reits(self):
        from src.models.reit import REIT
        reits = REIT.create_seed_reits()
        assert len(reits) == 12
        tickers = {r.ticker for r in reits}
        assert "O" in tickers
        assert "AMT" in tickers

    def test_get_by_ticker(self):
        from src.models.reit import REIT
        reit = REIT.get_by_ticker("PLD")
        assert reit is not None
        assert reit.name == "Prologis"

    def test_get_by_ticker_case_insensitive(self):
        from src.models.reit import REIT
        reit = REIT.get_by_ticker("pld")
        assert reit is not None
        assert reit.ticker == "PLD"

    def test_to_dict(self):
        from src.models.reit import REIT, REITSector
        reit = REIT(ticker="O", name="Realty Income", sector=REITSector.RETAIL)
        d = reit.to_dict()
        assert d["ticker"] == "O"
        assert d["sector"] == "Retail"

    def test_from_dict(self):
        from src.models.reit import REIT
        d = {"ticker": "O", "name": "Realty Income", "sector": "Retail"}
        reit = REIT.from_dict(d)
        assert reit.ticker == "O"
        assert reit.sector.value == "Retail"


class TestSentinelService:
    """Tests for SentinelService scoring logic."""

    def test_fundamental_score_no_service(self):
        from src.services.sentinel_service import SentinelService
        svc = SentinelService(bedrock_client=None)
        svc._client = None
        score = svc.compute_fundamental_score("O")
        assert score == 50.0  # default when no service injected

    def test_valuation_score_no_service(self):
        from src.services.sentinel_service import SentinelService
        svc = SentinelService(bedrock_client=None)
        svc._client = None
        score = svc.compute_valuation_score("O")
        assert score == 50.0

    def test_macro_score_no_service(self):
        from src.services.sentinel_service import SentinelService
        svc = SentinelService(bedrock_client=None)
        svc._client = None
        score = svc.compute_macro_score()
        assert score == 50.0

    def test_momentum_score_no_service(self):
        from src.services.sentinel_service import SentinelService
        svc = SentinelService(bedrock_client=None)
        svc._client = None
        score = svc.compute_momentum_score("O")
        assert score == 50.0

    def test_sentiment_score_no_service(self):
        from src.services.sentinel_service import SentinelService
        svc = SentinelService(bedrock_client=None)
        svc._client = None
        score = svc.compute_sentiment_score("O")
        assert score == 50.0
