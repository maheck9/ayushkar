"""Fewest-questions triage.

The server never sees the formulation. It receives only:
  match  - result of the local formula match: "classical" | "proprietary" | "outside"
  facts  - answers to the questions below (any subset)

Every combination of facts leads to an *advice signature*: the part of the
advice that matters for the user's goal. We ask the question with the highest
information gain over those signatures and stop as soon as every remaining
combination gives the same advice. No language model is involved.
"""
from functools import lru_cache
from itertools import product
from math import log2

FACTS = {
    "goal": ["patent", "licence", "export", "brand"],
    "use": ["medicine", "food", "cosmetic"],
    "route": ["oral", "external", "parenteral"],
    "form": ["traditional", "extract"],
    "entity": ["indian", "foreign"],
    "sourcing": ["cultivated", "wild"],
    "practitioner": ["no", "yes"],
    "market": ["us", "eu"],
}
ORDER = list(FACTS)
MATCHES = ["classical", "proprietary", "outside"]
AMENDMENT_2023 = "2024-04-01"  # BD Act amendment in force (verify in Gazette)


# --- the rule table: each function reads only the facts it needs ----------

def category(f, match):
    if f["use"] == "cosmetic":
        return "cosmetic"
    if f["use"] == "food":
        return "aahar"
    if f["route"] == "parenteral":
        return "new_drug"
    if f["form"] == "extract":
        return "phyto"
    return {"classical": "classical", "proprietary": "proprietary", "outside": "new_drug"}[match]


def group(f, match):
    c = category(f, match)
    return c if c in ("cosmetic", "aahar") else "drug"


def patent_posture(f, match):
    if f["form"] == "extract":
        return "process_potential"
    return {"classical": "tk_bar", "proprietary": "admixture_risk", "outside": "potential"}[match]


def abs_path(f, match, as_of="9999-12-31"):
    if f["entity"] == "foreign":
        return "nba_approval"
    if f["practitioner"] == "yes":
        return "exempt_practitioner"
    if f["sourcing"] == "cultivated" and as_of >= AMENDMENT_2023:
        return "exempt_cultivated"
    return "prior_intimation"


def signature(f, match, as_of="9999-12-31"):
    goal = f["goal"]
    if goal == "patent":
        return (goal, patent_posture(f, match))
    if goal == "licence":
        return (goal, category(f, match), abs_path(f, match, as_of))
    if goal == "export":
        return (goal, f["market"], group(f, match), abs_path(f, match, as_of))
    return (goal, group(f, match))


# --- search ----------------------------------------------------------------

def completions(known):
    unknown = [k for k in ORDER if k not in known]
    for values in product(*(FACTS[k] for k in unknown)):
        f = dict(known)
        f.update(zip(unknown, values))
        yield f


def _entropy(items):
    counts = {}
    for s in items:
        counts[s] = counts.get(s, 0) + 1
    n = len(items)
    return -sum(c / n * log2(c / n) for c in counts.values())


@lru_cache(maxsize=20000)
def _next(known_items, skipped, match, as_of):
    known = dict(known_items)
    sigs = [signature(f, match, as_of) for f in completions(known)]
    remaining = len(set(sigs))
    if remaining == 1:
        return None, remaining
    base = _entropy(sigs)
    best, best_gain = None, 0.0
    for fact in ORDER:
        if fact in known or fact in skipped:
            continue
        cond = 0.0
        for v in FACTS[fact]:
            sub = [signature(f, match, as_of) for f in completions({**known, fact: v})]
            cond += _entropy(sub) / len(FACTS[fact])
        gain = base - cond
        if gain > best_gain + 1e-9:
            best, best_gain = fact, gain
    return best, remaining


def next_question(facts, match, skipped=(), as_of="9999-12-31"):
    known = {k: v for k, v in facts.items() if k in FACTS and v in FACTS[k]}
    q, remaining = _next(tuple(sorted(known.items())), tuple(sorted(skipped)), match, as_of)
    return {"next": q, "options": FACTS[q] if q else None,
            "advice_outcomes_left": remaining, "asked": len(known),
            "baseline_fixed_flow": len(FACTS)}


def what_would_change(facts, match, as_of="9999-12-31"):
    """Flip each answered fact (and the match result) and report which flips change the advice."""
    known = {k: v for k, v in facts.items() if k in FACTS}
    if "goal" not in known:
        return []

    current = {signature(f, match, as_of) for f in completions(known)}
    out = []
    for fact, value in known.items():
        if fact == "goal":
            continue
        for alt in FACTS[fact]:
            if alt == value:
                continue
            alt_known = {**known, fact: alt}
            alt_sigs = {signature(f, match, as_of) for f in completions(alt_known)}
            if alt_sigs != current:
                out.append({"fact": fact, "from": value, "to": alt,
                            "new_advice": sorted(alt_sigs)[0] if len(alt_sigs) == 1 else None})
    for alt in MATCHES:
        if alt == match:
            continue
        alt_sigs = {signature(f, alt, as_of) for f in completions(known)}
        if alt_sigs != current:
            out.append({"fact": "match", "from": match, "to": alt,
                        "new_advice": sorted(alt_sigs)[0] if len(alt_sigs) == 1 else None})
    return out


def simulate_all(as_of="9999-12-31"):
    """Proof 2: run triage for every possible user (all fact combinations x match results)
    answering truthfully; count questions and check early stopping never changed the advice."""
    counts, wrong, total = [], 0, 0
    for match in MATCHES:
        for truth in completions({}):
            known = {}
            while True:
                r = next_question(known, match, as_of=as_of)
                if r["next"] is None:
                    break
                known[r["next"]] = truth[r["next"]]
            counts.append(len(known))
            total += 1
            if {signature(f, match, as_of) for f in completions(known)} != {signature(truth, match, as_of)}:
                wrong += 1
    counts.sort()
    n = len(counts)
    hist = {}
    for c in counts:
        hist[c] = hist.get(c, 0) + 1
    return {"cases": total, "median": counts[n // 2], "max": counts[-1], "min": counts[0],
            "mean": round(sum(counts) / n, 2), "baseline_fixed_flow": len(FACTS),
            "advice_changed_by_stopping_early": wrong, "histogram": hist}
