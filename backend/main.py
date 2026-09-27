"""IP-SAKTI Sahayak prototype API."""
import hashlib
import json
from datetime import date
from typing import Dict, List, Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import audit, data
from .engine import dossier, retrieval, screens, triage

app = FastAPI(title="IP-SAKTI Sahayak API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

Match = Literal["classical", "proprietary", "outside"]


class FactSheet(BaseModel):
    """The redacted fact sheet: the only product information the server ever receives."""
    match: Match
    facts: Dict[str, str] = Field(default_factory=dict)
    skipped: List[str] = Field(default_factory=list)
    as_of: Optional[str] = None


class AskIn(BaseModel):
    question: str = Field(max_length=600)
    jurisdiction: Literal["india", "international"]
    as_of: Optional[str] = None


class ClaimsIn(BaseModel):
    text: str = Field(max_length=4000)
    group: Literal["drug", "aahar", "cosmetic"] = "drug"
    as_of: Optional[str] = None


class FilingIn(BaseModel):
    text: str = Field(max_length=4000)


class RadarIn(BaseModel):
    decision: Literal["approved", "rejected", "pending"]


def _as_of(s):
    try:
        return data.parse_date(s).isoformat()
    except ValueError:
        raise HTTPException(422, "as_of must be a date in YYYY-MM-DD form")


@app.get("/api/health")
def health():
    c = data.corpus()
    return {"ok": True, "provisions": len(c["provisions"]), "instruments": len(c["instruments"]),
            "formulations": len(data.formulations()), "today": date.today().isoformat()}


@app.post("/api/triage")
def triage_next(body: FactSheet):
    as_of = _as_of(body.as_of)
    out = triage.next_question(body.facts, body.match, tuple(body.skipped), as_of)
    audit.record("triage", body.model_dump())
    return out


@app.post("/api/dossier")
def build_dossier(body: FactSheet):
    as_of = _as_of(body.as_of)
    out = dossier.build(body.facts, body.match, as_of)
    audit.record("dossier", body.model_dump(), [p["id"] for r in out["rows"] for p in r["provisions"]])
    return out


@app.post("/api/ask")
def ask(body: AskIn):
    out = retrieval.ask(body.question, body.jurisdiction, _as_of(body.as_of))
    audit.record("ask", body.model_dump(), [c["id"] for c in out["citations"]])
    return out


@app.post("/api/claims")
def claims(body: ClaimsIn):
    out = screens.check_claims(body.text, body.group, _as_of(body.as_of))
    audit.record("claims", body.model_dump(), [p["id"] for p in out["provisions"]])
    return out


@app.get("/api/biopiracy/cases")
def biopiracy_cases():
    return data.screens()["biopiracy_cases"]


@app.post("/api/biopiracy")
def biopiracy(body: FilingIn):
    out = screens.screen_filing(body.text)
    audit.record("biopiracy", body.model_dump())
    return out


@app.get("/api/timeline")
def timeline(as_of: Optional[str] = None):
    return screens.timeline(_as_of(as_of))


@app.get("/api/radar")
def radar():
    return screens.radar()


@app.post("/api/radar/{item_id}")
def radar_decide(item_id: str, body: RadarIn):
    try:
        out = screens.decide(item_id, body.decision)
    except KeyError:
        raise HTTPException(404, "No such change in the review queue")
    audit.record("radar", {"id": item_id, "decision": body.decision})
    return out


@app.get("/api/provision/{pid}")
def provision(pid: str, as_of: Optional[str] = None):
    p = data.provisions().get(pid)
    if not p:
        raise HTTPException(404, "Unknown provision")
    return data.public_provision(p, data.parse_date(_as_of(as_of)))


@app.get("/api/audit")
def audit_log():
    return audit.entries()


@app.post("/api/brief")
def brief(body: dict):
    """Facilitator case brief. Receives the same redacted material as the other endpoints."""
    raw = json.dumps(body, sort_keys=True).encode()
    case_id = "IPS-" + hashlib.sha256(raw).hexdigest()[:8].upper()
    audit.record("brief", body)
    return {"case_id": case_id, "prepared_on": date.today().isoformat(), **body}


# --- Evaluation harness (Proofs page) ----------------------------------------------

EVAL_QUESTIONS = [
    ("india", "Can I patent my classical churna?", {"pat_s3p"}),
    ("india", "Is a new combination of known herbs patentable?", {"pat_s3e", "case_ajantha"}),
    ("india", "What makes a medicine proprietary under the Drugs and Cosmetics Act?", {"dca_s3h"}),
    ("india", "Do I need to tell the State Biodiversity Board before using herbs commercially?", {"bda_s7"}),
    ("india", "How much benefit sharing do I pay on my turnover?", {"abs_slabs"}),
    ("india", "Can my advertisement say the product cures diabetes?", {"dmr_s3"}),
    ("india", "How do I register a trade mark for my brand?", {"tm_s9", "tm_s11"}),
    ("india", "What is a phytopharmaceutical drug?", {"ndct_phyto"}),
    ("india", "Who can search the full TKDL?", {"tkdl_access"}),
    ("india", "Which form do I use to get a licence to manufacture an Ayurvedic medicine?", {"dcr_r153"}),
    ("international", "Must a patent applicant disclose the origin of genetic resources?", {"gratk_a3"}),
    ("international", "How do I sell an herbal medicine in the European Union?", {"eu_thmpd_overview"}),
    ("international", "Can I sell a dietary supplement in the United States?", {"us_dshea_overview"}),
    ("international", "How do I file one international patent application in many countries?", {"pct_overview"}),
    ("international", "Where do I deposit a microorganism for a patent?", {"budapest_overview"}),
    ("international", "How do I protect my trade mark in other countries?", {"madrid_overview"}),
]
EVAL_OUT_OF_SCOPE = [
    "What is the GST rate on churna?", "How do I get bail?", "Who won the cricket match yesterday?",
    "Suggest dosage for my child's fever", "Help with my quantum physics homework", "Can I get a home loan?",
]
AS_OF_TESTS = [
    ("bda_s7", "2023-06-01", "bda_s7_v2002"), ("bda_s7", "2025-01-01", "bda_s7_v2023"),
    ("bda_s6", "2023-06-01", "bda_s6_v2002"), ("bda_s6", "2026-01-01", "bda_s6_v2023"),
    ("abs_slabs", "2024-12-01", "abs_2014_slabs"), ("abs_slabs", "2026-01-01", "abs_2025_slabs"),
    ("gratk_a3", "2023-01-01", None), ("gratk_a3", "2025-01-01", "gratk_a3"),
    ("ayush_g_tkdl", "2025-01-01", None), ("ayush_g_tkdl", "2025-10-01", "ayush_g_tkdl"),
]


@app.get("/api/eval")
def evaluate():
    today = date.today().isoformat()
    rows, top1, top3, cite_ok, cite_total, cross = [], 0, 0, 0, 0, 0
    for j, q, expected in EVAL_QUESTIONS:
        r = retrieval.ask(q, j, today)
        fams = [c["family"] for c in r["citations"]]
        hit1 = bool(fams) and fams[0] in expected
        hit3 = bool(set(fams) & expected)
        top1 += hit1
        top3 += hit3
        for c in r["citations"]:
            cite_total += 1
            cite_ok += c["span"] in data.provisions()[c["id"]]["text"]
        rows.append({"jurisdiction": j, "question": q, "expected": sorted(expected), "cited": fams,
                     "top1": hit1, "abstained": r["abstained"]})
        for other in ("india", "international"):
            rr = retrieval.ask(q, other, today)
            cross += sum(1 for c in rr["citations"] if c["jurisdiction"] != other)
    abst_in = sum(1 for _, q, _ in EVAL_QUESTIONS if retrieval.ask(q, _j(q), today)["abstained"])
    abst_out = sum(1 for q in EVAL_OUT_OF_SCOPE if retrieval.ask(q, "india", today)["abstained"])
    asof = []
    for fam, d, expected in AS_OF_TESTS:
        got = data.resolve(fam, data.parse_date(d))
        asof.append({"provision": fam, "date": d, "expected": expected, "got": got["id"] if got else None,
                     "pass": (got["id"] if got else None) == expected})
    return {
        "retrieval": {"questions": len(EVAL_QUESTIONS), "top1_correct": top1, "top3_correct": top3, "rows": rows},
        "citation": {"spans_checked": cite_total, "spans_found_verbatim_in_source": cite_ok},
        "abstention": {"out_of_scope": len(EVAL_OUT_OF_SCOPE), "abstained_correctly": abst_out,
                       "in_scope": len(EVAL_QUESTIONS), "abstained_wrongly": abst_in},
        "firewall": {"queries_run": len(EVAL_QUESTIONS) * 2, "cross_jurisdiction_citations": cross},
        "as_of": {"tests": len(asof), "passed": sum(a["pass"] for a in asof), "rows": asof},
        "triage": triage.simulate_all(),
    }


def _j(q):
    return next(j for j, qq, _ in EVAL_QUESTIONS if qq == q)
