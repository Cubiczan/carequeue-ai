"""Basic smoke tests for scope-vantage models and services."""

import pytest


class TestTradeFlowModel:
    """Tests for the TradeFlow dataclass."""

    def test_create_trade_flow(self):
        from src.models.trade_flow import TradeFlow, TradeDirection
        tf = TradeFlow(
            reporter_code="842",
            reporter_name="USA",
            partner_code="156",
            partner_name="China",
            commodity_code="260300",
            commodity_name="Copper ores",
            trade_direction=TradeDirection.IMPORT,
            year=2024,
            net_weight_kg=500000,
            trade_value_usd=5000000,
        )
        assert tf.trade_direction == TradeDirection.IMPORT
        assert tf.net_weight_tonnes == 500.0

    def test_trade_flow_auto_id(self):
        from src.models.trade_flow import TradeFlow, TradeDirection
        tf = TradeFlow(
            reporter_code="842", partner_code="156",
            commodity_code="260300", year=2024,
            trade_direction=TradeDirection.EXPORT,
        )
        assert tf.flow_id == "842_156_260300_2024_Export"

    def test_unit_value_calculations(self):
        from src.models.trade_flow import TradeFlow
        tf = TradeFlow(net_weight_kg=1000, trade_value_usd=50000)
        assert tf.unit_value_usd_per_kg == 50.0
        assert tf.unit_value_usd_per_tonne == 50000.0

    def test_zero_weight_division(self):
        from src.models.trade_flow import TradeFlow
        tf = TradeFlow(net_weight_kg=0, trade_value_usd=1000)
        assert tf.unit_value_usd_per_kg == 0.0

    def test_to_dict_roundtrip(self):
        from src.models.trade_flow import TradeFlow, TradeDirection
        tf = TradeFlow(
            reporter_code="842", reporter_name="USA",
            partner_code="156", partner_name="China",
            commodity_code="260300", year=2024,
            net_weight_kg=1000, trade_value_usd=5000,
            trade_direction=TradeDirection.IMPORT,
        )
        d = tf.to_dict()
        assert d["trade_direction"] == "Import"
        restored = TradeFlow.from_dict(d)
        assert restored.net_weight_kg == 1000

    def test_trade_direction_enum(self):
        from src.models.trade_flow import TradeDirection
        assert TradeDirection.IMPORT.value == "Import"
        assert TradeDirection.EXPORT.value == "Export"


class TestSupplyChainService:
    """Tests for SupplyChainService graph analysis."""

    def test_hhi_calculation(self):
        from src.services.supply_chain_service import SupplyChainService
        # Monopoly
        hhi = SupplyChainService.compute_hhi({"A": 100})
        assert hhi == 10000.0
        # Perfect competition
        hhi = SupplyChainService.compute_hhi({"A": 50, "B": 50})
        assert hhi == 5000.0

    def test_hhi_interpretation(self):
        from src.services.supply_chain_service import SupplyChainService
        assert SupplyChainService.interpret_hhi(1000) == "Unconcentrated"
        assert SupplyChainService.interpret_hhi(2000) == "Moderately Concentrated"
        assert SupplyChainService.interpret_hhi(3000) == "Highly Concentrated"

    def test_add_and_get_node(self):
        from src.services.supply_chain_service import SupplyChainService
        from src.models.supply_chain_node import SupplyChainNode, NodeType
        svc = SupplyChainService()
        node = SupplyChainNode(
            node_id="CONGO", name="DR Congo Cobalt", node_type=NodeType.ORIGIN_COUNTRY,
            country="DR Congo", commodities=["Cobalt"],
        )
        svc.add_node(node)
        assert svc.get_node("CONGO") is not None

    def test_empty_hhi(self):
        from src.services.supply_chain_service import SupplyChainService
        hhi = SupplyChainService.compute_hhi({})
        assert hhi == 0.0

    def test_risk_score_missing_node(self):
        from src.services.supply_chain_service import SupplyChainService
        svc = SupplyChainService()
        assert svc.compute_node_risk("NONEXISTENT") == 0.0

    def test_detect_bottlenecks_empty(self):
        from src.services.supply_chain_service import SupplyChainService
        svc = SupplyChainService()
        assert svc.detect_bottlenecks() == []
