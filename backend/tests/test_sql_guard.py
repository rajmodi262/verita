"""
Adversarial tests for the SQL playground guard — the most security-critical path.

The contract: only read-only SELECT/WITH queries run; everything mutating or multi-statement
is rejected; and even if a payload slipped through, DuckDB only ever sees the single registered
`data` DataFrame (no filesystem, no catalog, no second statement).
"""

import pytest

# Each payload MUST be rejected (HTTP 400) by the guard.
INJECTION_CORPUS = [
    "DROP TABLE data",
    "DELETE FROM data",
    "UPDATE data SET amount = 0",
    "INSERT INTO data VALUES (1)",
    "ALTER TABLE data ADD COLUMN x INT",
    "CREATE TABLE evil AS SELECT * FROM data",
    "SELECT * FROM data; DROP TABLE data",                 # stacked statement
    "SELECT * FROM data; DELETE FROM data;",
    "ATTACH 'evil.db' AS e",                               # attach another db
    "COPY data TO 'out.csv'",                              # exfiltration
    "INSTALL httpfs",                                      # load extension
    "LOAD httpfs",
    "PRAGMA database_list",                                # metadata probing
    "SELECT * FROM read_csv_auto('/etc/passwd')",          # file read function — not a SELECT-of-data but blocked: contains no forbidden kw, see note
    "set memory_limit='1GB'",
]


@pytest.mark.parametrize("payload", INJECTION_CORPUS)
def test_injection_rejected(client, dataset_id, payload):
    resp = client.post("/api/sql/query", json={"dataset_id": dataset_id, "sql": payload})
    # Either the guard rejects (400) or DuckDB itself errors (400) — never a 200 that mutates.
    assert resp.status_code == 400, f"payload should not succeed: {payload!r} → {resp.status_code} {resp.text}"


def test_valid_select_runs(client, dataset_id):
    resp = client.post("/api/sql/query", json={
        "dataset_id": dataset_id,
        "sql": "SELECT channel, COUNT(*) AS n, ROUND(AVG(amount),2) AS avg_amt FROM data GROUP BY channel ORDER BY n DESC",
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["columns"] == ["channel", "n", "avg_amt"]
    assert body["row_count"] >= 2
    assert body["elapsed_ms"] >= 0


def test_cte_with_is_allowed(client, dataset_id):
    resp = client.post("/api/sql/query", json={
        "dataset_id": dataset_id,
        "sql": "WITH t AS (SELECT channel, amount FROM data) SELECT channel, SUM(amount) s FROM t GROUP BY channel",
    })
    assert resp.status_code == 200


def test_result_capped_at_500(client, dataset_id):
    resp = client.post("/api/sql/query", json={"dataset_id": dataset_id, "sql": "SELECT * FROM data"})
    assert resp.status_code == 200
    assert resp.json()["row_count"] <= 500
    assert resp.json()["truncated"] is True


def test_unknown_dataset_404(client):
    resp = client.post("/api/sql/query", json={"dataset_id": "deadbeefdead", "sql": "SELECT 1"})
    assert resp.status_code == 404


def test_data_is_only_table(client, dataset_id):
    """The registered table must be exactly `data` — no access to anything else."""
    resp = client.post("/api/sql/query", json={"dataset_id": dataset_id, "sql": "SELECT * FROM sqlite_master"})
    assert resp.status_code == 400  # table doesn't exist → DuckDB error surfaced as 400


def test_nl_to_sql_translation(client, dataset_id):
    resp = client.post("/api/sql/translate", json={"dataset_id": dataset_id, "question": "average amount by channel top 5"})
    assert resp.status_code == 200
    body = resp.json()
    # Identifiers are now quoted (handles spaces/casing safely); the SQL must still group by channel.
    assert 'GROUP BY "channel"' in body["sql"] or "GROUP BY channel" in body["sql"]
    assert body["interpretation"]["aggregate"] == "AVG"
    assert body["interpretation"]["measure"] == "amount"
    # And the generated SQL must actually run.
    run = client.post("/api/sql/query", json={"dataset_id": dataset_id, "sql": body["sql"]})
    assert run.status_code == 200
