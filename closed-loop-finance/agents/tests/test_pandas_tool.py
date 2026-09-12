from src.tools.pandas_tool import (
    ar_aging_buckets,
    cash_movement,
    inventory_total,
    variance_summary,
)


def test_variance_summary_empty():
    out = variance_summary([])
    assert out["rows"] == [] and out["total_lines"] == 0


def test_variance_summary_basic():
    out = variance_summary([
        {"Line": "Revenue", "Actual": 110, "Budget": 100, "Variance": 10, "Variance %": 0.10},
        {"Line": "EBITDA",  "Actual": 5,   "Budget": 10,  "Variance": -5, "Variance %": -0.50},
    ])
    assert out["total_lines"] == 2
    assert out["rows"][0]["variance"] == 10
    assert out["rows"][1]["variance_pct"] == -0.50


def test_ar_aging_buckets():
    out = ar_aging_buckets([
        {"Customer": "A", "Current": 100, "1-30": 50, "31-60": 0, "61-90": 0, "90+": 0, "Total": 150},
        {"Customer": "B", "Current": 0,   "1-30": 0,  "31-60": 25,"61-90": 0, "90+": 75, "Total": 100},
    ])
    assert out["Current"] == 100
    assert out["1-30"] == 50
    assert out["90+"] == 75


def test_cash_movement():
    out = cash_movement([
        {"Debit": 100, "Credit": 0},
        {"Debit": 0,   "Credit": 250},
    ])
    assert out["total_debits"] == 100
    assert out["total_credits"] == 250
    assert out["net"] == 150


def test_inventory_total():
    assert inventory_total([
        {"Extended Cost": 1000},
        {"Extended Cost": 500},
    ]) == 1500
