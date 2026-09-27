"""Invariants from the evaluation plan: firewall, as-of versions, triage, abstention, vault."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient  # noqa: E402

from backend import data  # noqa: E402
from backend.engine import retrieval, triage  # noqa: E402
from backend.main import AS_OF_TESTS, EVAL_OUT_OF_SCOPE, EVAL_QUESTIONS, app  # noqa: E402

client = TestClient(app)


def test_firewall_zero_cross_jurisdiction_citations():
    for _, q, _ in EVAL_QUESTIONS:
        for j in ("india", "international"):
            for c in retrieval.ask(q, j, None)["citations"]:
                assert c["jurisdiction"] == j


def test_indexes_are_disjoint():
    india = {d["id"] for d in retrieval.index("india").docs}
    intl = {d["id"] for d in retrieval.index("international").docs}
    assert india and intl and not india & intl


def test_as_of_picks_correct_version():
    for fam, d, expected in AS_OF_TESTS:
        got = data.resolve(fam, data.parse_date(d))
        assert (got["id"] if got else None) == expected, (fam, d)


def test_out_of_scope_abstains():
    for q in EVAL_OUT_OF_SCOPE:
        assert retrieval.ask(q, "india", None)["abstained"], q


def test_citation_spans_are_verbatim():
    for j, q, _ in EVAL_QUESTIONS:
        for c in retrieval.ask(q, j, None)["citations"]:
            assert c["span"] in data.provisions()[c["id"]]["text"]


def test_triage_never_changes_advice_and_beats_fixed_flow():
    r = triage.simulate_all()
    assert r["advice_changed_by_stopping_early"] == 0
    assert r["max"] <= r["baseline_fixed_flow"]
    assert r["median"] < r["baseline_fixed_flow"]


def test_classical_patent_needs_two_questions():
    known = {}
    truth = {"goal": "patent", "form": "traditional"}
    while (q := triage.next_question(known, "classical")["next"]):
        known[q] = truth[q]
    assert known == truth


def test_cultivated_exemption_changes_with_date():
    facts = {"goal": "licence", "use": "medicine", "route": "oral", "form": "traditional",
             "entity": "indian", "practitioner": "no", "sourcing": "cultivated"}
    before = client.post("/api/dossier", json={"match": "classical", "facts": facts, "as_of": "2023-06-01"}).json()
    after = client.post("/api/dossier", json={"match": "classical", "facts": facts, "as_of": "2025-06-01"}).json()
    abs_before = next(r for r in before["rows"] if r["key"] == "abs")
    abs_after = next(r for r in after["rows"] if r["key"] == "abs")
    assert abs_before["value"] == "prior_intimation"
    assert abs_after["value"] == "exempt_cultivated"


def test_fact_sheet_rejects_unknown_fields_shape():
    # The API accepts only match + facts: a formulation field has nowhere to go.
    r = client.post("/api/triage", json={"match": "classical", "facts": {}, "ingredients": ["haritaki"]})
    assert r.status_code == 200
    assert all("haritaki" not in str(e) for e in client.get("/api/audit").json())


def test_audit_log_stores_hashes_not_content():
    client.post("/api/ask", json={"question": "Can I patent my classical churna?", "jurisdiction": "india"})
    entry = client.get("/api/audit").json()[0]
    assert set(entry) == {"at", "endpoint", "request_sha256", "bytes", "provisions"}
