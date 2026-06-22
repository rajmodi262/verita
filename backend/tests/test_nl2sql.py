"""Tests for the rule-based natural-language → SQL translator (the offline path)."""

from types import SimpleNamespace

import pandas as pd
import pytest

from app.services.sql_service import _rule_based_sql, guard_sql


@pytest.fixture
def df_and_profile():
    df = pd.DataFrame(
        {
            "amount": [100.0, 5000.0, 250.0, 9000.0, 30.0],
            "country": ["US", "RU", "US", "KY", "GB"],
            "channel": ["Card", "Wire", "Crypto", "Wire", "Card"],
            "is_fraud": [0, 1, 0, 1, 0],
        }
    )
    profile = SimpleNamespace(
        measures=["amount"],
        dimensions=["channel"],
        geos=["country"],
        temporals=[],
        booleans=["is_fraud"],
    )
    return df, profile


def _sql(q, df, profile):
    return _rule_based_sql(q.lower(), df, profile)[0]


def test_count_total(df_and_profile):
    df, p = df_and_profile
    sql = _sql("how many transactions are there", df, p)
    assert "COUNT(*)" in sql
    assert "SELECT *" not in sql        # the old bug: counts fell through to SELECT *
    guard_sql(sql)                       # must be a legal read-only query


def test_sum_by_dimension(df_and_profile):
    df, p = df_and_profile
    sql = _sql("total amount by channel", df, p)
    assert "SUM(\"amount\")" in sql
    assert "GROUP BY \"channel\"" in sql
    guard_sql(sql)


def test_average_by_geo(df_and_profile):
    df, p = df_and_profile
    sql = _sql("average amount by country", df, p)
    assert "AVG(\"amount\")" in sql and "GROUP BY \"country\"" in sql


def test_numeric_filter(df_and_profile):
    df, p = df_and_profile
    sql = _sql("show transactions over 5000", df, p)
    assert '"amount" > 5000' in sql
    guard_sql(sql)


def test_at_least_filter_uses_gte(df_and_profile):
    df, p = df_and_profile
    sql = _sql("count transactions with amount at least 1000", df, p)
    assert '"amount" >= 1000' in sql and "COUNT(*)" in sql


def test_categorical_filter(df_and_profile):
    df, p = df_and_profile
    sql = _sql("total amount in RU", df, p)
    assert "SUM(\"amount\")" in sql
    assert "\"country\" = 'RU'" in sql


def test_fraud_filter(df_and_profile):
    df, p = df_and_profile
    sql = _sql("how many fraudulent transactions", df, p)
    assert "COUNT(*)" in sql and '"is_fraud" = 1' in sql


def test_fraud_count_by_dimension(df_and_profile):
    df, p = df_and_profile
    sql = _sql("how many fraud transactions by channel", df, p)
    assert "COUNT(*)" in sql and 'GROUP BY "channel"' in sql and '"is_fraud" = 1' in sql


def test_combined_filter_and_group(df_and_profile):
    df, p = df_and_profile
    sql = _sql("total amount over 200 by country", df, p)
    assert '"amount" > 200' in sql and 'GROUP BY "country"' in sql


def test_top_n_limit(df_and_profile):
    df, p = df_and_profile
    sql = _sql("top 3 channels by total amount", df, p)
    assert "LIMIT 3" in sql


def test_number_before_top(df_and_profile):
    # The exact phrasing from the bug report: "15 top" (number BEFORE the word "top").
    df, p = df_and_profile
    sql = _sql("i need 15 top transactions", df, p)
    assert "LIMIT 15" in sql
    assert "LIMIT 50" not in sql                       # the old fallback bug
    assert 'ORDER BY "amount" DESC' in sql             # "top" → order by the money column
    guard_sql(sql)


def test_show_n_transactions(df_and_profile):
    df, p = df_and_profile
    sql = _sql("show me 20 transactions", df, p)
    assert "LIMIT 20" in sql


def test_highest_amounts(df_and_profile):
    df, p = df_and_profile
    sql = _sql("highest 5 transactions", df, p)
    assert 'ORDER BY "amount" DESC' in sql and "LIMIT 5" in sql


def test_all_outputs_are_guard_safe(df_and_profile):
    df, p = df_and_profile
    for q in [
        "how many transactions", "total amount by channel", "average amount by country",
        "transactions over 5000", "fraud transactions in US", "list everything",
    ]:
        guard_sql(_sql(q, df, p))   # never raises
