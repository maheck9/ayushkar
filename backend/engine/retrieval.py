"""Cited, extractive answers from two separate indexes (India, International).

Every sentence shown to the user is quoted from a retrieved provision, so the
claim-to-span check holds by construction. When the evidence is weak the
assistant abstains and prepares a facilitator brief instead of guessing.
"""
import math
import re
from functools import lru_cache

from .. import data

STOP = set("""a an the of and or to in on for with by is are be can i my we our it this that
do does what which who how when where under as at from any me you your should need needs
about into if than then there their them they was were will would could may might must
product products ayurvedic ayurveda""".split())

SYNONYMS = {
    "patent": ["invention", "patentable"], "patenting": ["patent", "invention"],
    "classical": ["authoritative", "schedule", "classical"], "generic": ["classical", "authoritative"],
    "brand": ["trademark", "mark"], "trademark": ["trade", "mark", "brand"], "name": ["trademark", "mark"],
    "abs": ["benefit", "sharing", "biodiversity"], "biodiversity": ["biological", "resource"],
    "benefit": ["sharing"], "herb": ["biological", "resource", "plant"], "herbs": ["biological", "resource", "plant"],
    "export": ["international", "abroad"], "licence": ["license", "manufacture"], "license": ["licence", "manufacture"],
    "advert": ["advertisement"], "ad": ["advertisement"], "ads": ["advertisement"], "advertising": ["advertisement"],
    "claim": ["advertisement", "claim"], "gi": ["geographical", "indication"], "tkdl": ["traditional", "knowledge", "digital", "library"],
    "tk": ["traditional", "knowledge"], "combination": ["admixture", "synergy"], "mixture": ["admixture"],
    "usa": ["united", "states"], "us": ["united", "states"], "america": ["united", "states"], "europe": ["european", "union"],
    "eu": ["european", "union"], "foreign": ["abroad", "international"], "cream": ["cosmetic"], "soap": ["cosmetic"],
    "food": ["aahara", "food"], "supplement": ["supplement", "nutraceutical"], "extract": ["extract", "standardised", "fraction"],
    "cultivated": ["cultivated", "certificate", "origin"], "farm": ["cultivated"], "farmer": ["cultivators", "growers"],
    "vaid": ["vaids", "practitioner"], "vaidya": ["vaids", "practitioner"], "microbe": ["microorganism"], "probiotic": ["microorganism"],
    "design": ["industrial", "design"], "packaging": ["design"], "treaty": ["treaty", "international"],
}
INTERNATIONAL_HINTS = {"trips", "wipo", "gratk", "pct", "madrid", "hague", "budapest", "nagoya", "cbd", "fda", "usa", "us", "eu", "europe", "european", "america", "abroad", "export", "international", "treaty"}
INDIA_HINTS = {"india", "indian", "nba", "sbb", "tkdl", "fssai", "cdsco", "ayush", "dmr"}

K1, B = 1.4, 0.75


def tokens(text):
    out = []
    for t in re.findall(r"[a-z0-9]+", text.lower()):
        if t in STOP or len(t) < 2:
            continue
        if len(t) > 4 and t.endswith("s") and not t.endswith("ss"):
            t = t[:-1]
        out.append(t)
    return out


def expand(q_tokens):
    out = list(q_tokens)
    for t in q_tokens:
        for s in SYNONYMS.get(t, []):
            out.extend(tokens(s))
    return out


class Index:
    def __init__(self, docs):
        self.docs = docs
        self.tf = []
        self.df = {}
        for d in docs:
            inst = data.instruments()[d["instrument"]]
            body = " ".join([d["title"], d["section"], inst["short"], inst["title"], d["text"], d.get("keywords", "")])
            toks = tokens(body)
            counts = {}
            for t in toks:
                counts[t] = counts.get(t, 0) + 1
            self.tf.append((counts, len(toks)))
            for t in counts:
                self.df[t] = self.df.get(t, 0) + 1
        self.avg = sum(n for _, n in self.tf) / max(len(self.tf), 1)

    def search(self, q_tokens, as_of):
        n = len(self.docs)
        scores = []
        for d, (counts, length) in zip(self.docs, self.tf):
            if not (data.valid_at(d, as_of) and data.instrument_status(d["instrument"], as_of)):
                continue
            s = 0.0
            for t in set(q_tokens):
                if t not in counts:
                    continue
                idf = math.log(1 + (n - self.df[t] + 0.5) / (self.df[t] + 0.5))
                f = counts[t]
                s += idf * f * (K1 + 1) / (f + K1 * (1 - B + B * length / self.avg))
            if s > 0:
                scores.append((s, d))
        scores.sort(key=lambda x: -x[0])
        return scores


@lru_cache(maxsize=None)
def index(jurisdiction):
    # Separate objects built from disjoint document lists: the firewall is structural.
    return Index([p for p in data.corpus()["provisions"] if p["jurisdiction"] == jurisdiction])


def _best_span(text, q_tokens):
    sentences = [s.strip() for s in re.split(r"(?<=[.;])\s+", text) if s.strip()]
    qs = set(q_tokens)
    return max(sentences, key=lambda s: len(qs & set(tokens(s))))


def out_of_scope(question):
    ql = question.lower()
    return [w for w in data.corpus()["out_of_scope"] if re.search(r"\b" + re.escape(w) + r"\b", ql)]


def ask(question, jurisdiction, as_of_str):
    as_of = data.parse_date(as_of_str)
    q_raw = tokens(question)
    q = expand(q_raw)
    result = {"jurisdiction": jurisdiction, "as_of": as_of.isoformat(), "question": question}

    oos = out_of_scope(question)
    hits = index(jurisdiction).search(q, as_of) if q_raw else []
    top = hits[0][0] if hits else 0.0
    matched = set(q_raw) & set(tokens(" ".join([hits[0][1]["text"], hits[0][1].get("keywords", ""), hits[0][1]["title"]]))) if hits else set()
    coverage = len(matched) / max(len(set(q_raw)), 1)

    if oos or top < 3.0 or coverage < 0.25:
        reason = ("The question is outside IP and regulatory guidance for Ayurveda." if oos else
                  "The indexed provisions do not cover this question well enough to answer from them.")
        result.update({"abstained": True, "confidence": "low", "reason": reason, "citations": [],
                       "near_misses": [data.public_provision(d, as_of)["title"] for _, d in hits[:3]]})
    else:
        keep = [(s, d) for s, d in hits[:4] if s >= 0.45 * top][:3]
        level = "high" if top >= 7.0 and coverage >= 0.5 else "medium"
        result.update({
            "abstained": False, "confidence": level,
            "reason": f"{len(matched)} of {len(set(q_raw))} question terms found in the top provision; {len(keep)} provision(s) cited.",
            "citations": [{**data.public_provision(d, as_of), "span": _best_span(d["text"], q), "score": round(s, 2)} for s, d in keep],
        })

    words = set(re.findall(r"[a-z]+", question.lower()))
    if jurisdiction == "india" and words & INTERNATIONAL_HINTS:
        result["switch_hint"] = "Your question mentions international instruments or markets. Those answers are kept in the International panel."
    if jurisdiction == "international" and words & INDIA_HINTS:
        result["switch_hint"] = "Your question mentions Indian law or bodies. Those answers are kept in the India panel."
    return result
