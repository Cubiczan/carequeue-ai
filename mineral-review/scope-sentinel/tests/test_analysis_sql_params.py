"""Athena analysis queries must bind user values, not interpolate them."""

import importlib
import sys
from unittest.mock import MagicMock, patch

sys.modules.setdefault("boto3", MagicMock())
analysis_handler = importlib.import_module("src.lambda.analysis_handler")


def test_compute_signal_scores_passes_ticker_as_execution_parameter():
    athena = MagicMock()
    athena.start_query_execution.return_value = {"QueryExecutionId": "q1"}
    with patch.object(analysis_handler, "boto3") as boto3:
        boto3.client.return_value = athena
        analysis_handler.compute_signal_scores({"tickers": ["O'; DROP TABLE reits; --"]})

    kwargs = athena.start_query_execution.call_args.kwargs
    query = kwargs["QueryString"]
    params = kwargs["ExecutionParameters"]
    assert "?" in query
    assert "DROP TABLE" not in query
    assert params[-1] == "O'; DROP TABLE reits; --"


def test_write_signals_binds_payload_fields():
    athena = MagicMock()
    athena.start_query_execution.return_value = {"QueryExecutionId": "q2"}
    payload = {
        "ticker": "PLD",
        "status": "computed",
        "sentinel_score": 80,
        "signal_rating": "Buy'); DROP TABLE reit_signals; --",
        "ai_analysis": "ok",
        "key_risks": [],
        "key_opportunities": [],
        "confidence_score": 0.9,
    }
    with patch.object(analysis_handler, "boto3") as boto3:
        boto3.client.return_value = athena
        analysis_handler.write_signals_to_iceberg([payload])

    kwargs = athena.start_query_execution.call_args.kwargs
    assert "DROP TABLE" not in kwargs["QueryString"]
    assert payload["signal_rating"] in kwargs["ExecutionParameters"]
