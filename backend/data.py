"""Ayushkar: loads the shared JSON data (the same files the frontend imports)."""
import hashlib
import json
from datetime import date
from functools import lru_cache
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _load(name):
    with open(DATA_DIR / name, encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=None)
def corpus():
    c = _load("corpus.json")
    for p in c["provisions"]:
        p["sha256"] = hashlib.sha256(p["text"].encode("utf-8")).hexdigest()
        p.setdefault("family", p["id"])
    return c


@lru_cache(maxsize=None)
def instruments():
    return {i["id"]: i for i in corpus()["instruments"]}


@lru_cache(maxsize=None)
def provisions():
    return {p["id"]: p for p in corpus()["provisions"]}


@lru_cache(maxsize=None)
def ingredients():
    return _load("ingredients.json")["ingredients"]


@lru_cache(maxsize=None)
def formulations():
    return _load("formulations.json")["formulations"]


@lru_cache(maxsize=None)
def screens():
    return _load("screens.json")


def parse_date(s):
    if not s:
        return date.today()
    if isinstance(s, date):
        return s
    return date.fromisoformat(s)


def valid_at(p, as_of):
    start = parse_date(p.get("valid_from", "1900-01-01"))
    end = p.get("valid_to")
    return start <= as_of and (end is None or as_of <= parse_date(end))


def instrument_status(inst_id, as_of):
    """Status of an instrument on a date, or None if it did not exist yet."""
    hist = instruments()[inst_id]["status_history"]
    current = None
    for h in hist:
        if parse_date(h["from"]) <= as_of:
            current = h
    return current


def resolve(ref, as_of):
    """Return the version of a provision (or provision family) in force on as_of."""
    for p in corpus()["provisions"]:
        if p["family"] == ref or p["id"] == ref:
            if valid_at(p, as_of) and instrument_status(p["instrument"], as_of):
                return p
    return None


def public_provision(p, as_of):
    inst = instruments()[p["instrument"]]
    st = instrument_status(p["instrument"], as_of) or {}
    return {
        "id": p["id"],
        "family": p["family"],
        "jurisdiction": p["jurisdiction"],
        "instrument": inst["title"],
        "instrument_short": inst["short"],
        "section": p["section"],
        "title": p["title"],
        "text": p["text"],
        "text_kind": p["text_kind"],
        "url": inst["url"],
        "valid_from": p.get("valid_from"),
        "valid_to": p.get("valid_to"),
        "status": st.get("status"),
        "status_note": st.get("note"),
        "valid_on_date": valid_at(p, as_of) and st.get("status") not in (None,),
        "verify": bool(p.get("verify") or inst.get("verify")),
        "sha256": p["sha256"],
    }
