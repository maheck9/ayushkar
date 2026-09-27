"""Claim & label check, outbound biopiracy screen, change radar."""
import hashlib
import re

from .. import data


# --- Claim & label check -----------------------------------------------------

def check_claims(text, product_group, as_of_str):
    as_of = data.parse_date(as_of_str)
    lex = data.screens()["dmr_schedule"]
    low = text.lower()
    flags = []
    for term in lex["terms"]:
        for phrase in term["phrases"]:
            for m in re.finditer(r"\b" + re.escape(phrase) + r"\b", low):
                flags.append({"start": m.start(), "end": m.end(), "text": text[m.start():m.end()],
                              "kind": "schedule", "condition": term["condition"],
                              "why": f"'{term['condition']}' is in the DMR Act Schedule: a drug advertisement may not claim to treat it.",
                              "provision": "dmr_s3"})
    for pat in lex["misleading_patterns"]:
        for m in re.finditer(re.escape(pat["pattern"]), low):
            flags.append({"start": m.start(), "end": m.end(), "text": text[m.start():m.end()],
                          "kind": "misleading", "condition": None, "why": pat["why"] + " (s.4: false or misleading claims).",
                          "provision": "dmr_s4"})
    therapeutic = re.findall(r"\b(cure|cures|treat|treats|treatment|heal|heals)\b", low)
    notes = []
    if product_group == "cosmetic" and therapeutic:
        notes.append({"text": "Words like 'cure' or 'treat' on a cosmetic describe a drug use. The product may be treated as a drug, not a cosmetic.",
                      "provision": "dca_s3aaa"})
    if product_group == "aahar" and therapeutic:
        notes.append({"text": "Food products may not claim to cure or treat disease.", "provision": "fssai_aahara"})
    # de-duplicate overlapping flags, keep first
    flags.sort(key=lambda f: (f["start"], -(f["end"] - f["start"])))
    clean, last_end = [], -1
    for f in flags:
        if f["start"] >= last_end:
            clean.append(f)
            last_end = f["end"]
    cited = sorted({f["provision"] for f in clean} | {n["provision"] for n in notes})
    return {"flags": clean, "notes": notes,
            "provisions": [data.public_provision(data.resolve(c, as_of), as_of) for c in cited if data.resolve(c, as_of)],
            "verdict": "clear" if not clean and not notes else "revise"}


# --- Outbound biopiracy screen ---------------------------------------------------

# Words in a patent claim that indicate a documented traditional use.
USE_WORDS = {
    "wound healing": ["wound"], "skin disorders": ["skin", "dermat"], "antifungal": ["fungi", "fungal", "fungicid"],
    "insect repellent": ["insect", "pest"], "antimicrobial": ["microb", "bacteri"], "anti-inflammatory": ["inflamm"],
    "digestive": ["digest", "bowel", "dyspeps"], "mild laxative": ["laxative", "bowel", "constipation"],
    "sleep": ["sleep", "insomnia"], "strength": ["stamina", "strength"], "rasayana": ["rejuvenat", "stress", "adaptogen"],
    "cough": ["cough"], "respiratory": ["respirat", "cough", "asthma"], "fever": ["fever"], "immunity": ["immun"],
    "memory": ["memory", "cognit"], "joint pain": ["joint", "arthrit"], "lipid disorders": ["lipid", "cholesterol"],
}

def _alias_index():
    idx = []
    for ing in data.ingredients():
        names = set(a.lower() for a in ing["aliases"])
        for k in ("sanskrit", "english", "latin"):
            if ing.get(k):
                names.add(ing[k].lower())
        for n in names:
            if len(n) >= 4 and re.match(r"^[a-z0-9 .\-]+$", n):
                idx.append((n, ing))
    idx.sort(key=lambda x: -len(x[0]))
    return idx


def screen_filing(text):
    low = text.lower()
    found, spans = {}, []
    for name, ing in _alias_index():
        for m in re.finditer(r"\b" + re.escape(name) + r"\b", low):
            if any(s <= m.start() < e for s, e in spans):
                continue
            spans.append((m.start(), m.end()))
            found.setdefault(ing["id"], {"id": ing["id"], "name": ing["sanskrit"] or ing["english"],
                                         "latin": ing["latin"], "as_written": text[m.start():m.end()],
                                         "in_universe": ing["in_universe"], "tk_uses": ing["tk_uses"]})
    trad = {k for k, v in found.items() if v["in_universe"]}
    findings = []
    for f in data.formulations():
        fset = {i["id"] for i in f["ingredients"]}
        if not trad or not fset:
            continue
        if fset <= trad:
            findings.append({"level": "strong", "formulation": f["name"], "book": f["book"],
                             "why": f"The filing names every ingredient of {f['name']} ({len(fset)} of {len(fset)})."})
        elif len(fset & trad) >= 2 and len(fset & trad) / len(fset) >= 0.5:
            findings.append({"level": "partial", "formulation": f["name"], "book": f["book"],
                             "why": f"The filing names {len(fset & trad)} of {len(fset)} ingredients of {f['name']}."})
    for iid in trad:
        ing = found[iid]
        uses = [u for u in ing["tk_uses"] if any(w in low for w in USE_WORDS.get(u, [u.lower()]))]
        if uses:
            findings.append({"level": "use", "formulation": None, "book": None,
                             "why": f"{ing['name']} ({ing['latin']}) is claimed for {', '.join(uses)}, a documented traditional use."})
    order = {"strong": 0, "partial": 1, "use": 2}
    findings.sort(key=lambda x: order[x["level"]])
    return {"ingredients": list(found.values()), "findings": findings,
            "action": ("Refer to a human reviewer with the matched records. If confirmed, evidence can be filed through a third-party "
                       "observation or pre-grant opposition in the relevant office." if findings else
                       "No overlap with the indexed formulations or documented uses. This covers only the indexed records."),
            "provisions": [data.public_provision(data.resolve(p, data.parse_date(None)), data.parse_date(None)) for p in ("pat_s25", "pat_s3p")]}


# --- Change radar -----------------------------------------------------------------

_decisions = {}


def radar():
    out = []
    for item in data.screens()["radar"]:
        inst = data.instruments()[item["instrument"]]
        out.append({**item, "status": _decisions.get(item["id"], item["status"]), "instrument_title": inst["title"],
                    "hash_before": hashlib.sha256(item["before"].encode()).hexdigest()[:16],
                    "hash_after": hashlib.sha256(item["after"].encode()).hexdigest()[:16]})
    return out


def decide(item_id, decision):
    if decision not in ("approved", "rejected", "pending"):
        raise ValueError("decision must be approved, rejected or pending")
    if item_id not in {i["id"] for i in data.screens()["radar"]}:
        raise KeyError(item_id)
    _decisions[item_id] = decision
    return radar()


def timeline(as_of_str):
    as_of = data.parse_date(as_of_str)
    out = []
    for inst in data.corpus()["instruments"]:
        st = data.instrument_status(inst["id"], as_of)
        versions = [data.public_provision(p, as_of) for p in data.corpus()["provisions"]
                    if p["instrument"] == inst["id"] and (p.get("valid_to") or p["family"] != p["id"])]
        out.append({"id": inst["id"], "title": inst["title"], "short": inst["short"], "jurisdiction": inst["jurisdiction"],
                    "url": inst["url"], "status": st["status"] if st else "not_yet", "note": (st or {}).get("note"),
                    "history": inst["status_history"], "versions": versions, "verify": bool(inst.get("verify"))})
    return out
