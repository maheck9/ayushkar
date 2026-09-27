"""Deterministic protection dossier: one row per regime, each from a rule table.

Rows whose value depends on a fact the user has not given are returned as
'pending' with the facts that would settle them.
"""
from itertools import product

from .. import data
from . import triage

CATEGORY = {
    "classical": {"label": "Classical (Ayurvedic drug)", "tone": "info",
                  "summary": "The composition matches a formula in a First Schedule book. It is an Ayurvedic drug under s.3(a), made exactly per the book.",
                  "provisions": ["dca_s3a", "dca_sch1"]},
    "proprietary": {"label": "Patent or proprietary medicine", "tone": "info",
                    "summary": "Every ingredient appears in First Schedule formulae, but the combination is not a listed formula. That is a patent or proprietary ASU medicine under s.3(h)(i).",
                    "provisions": ["dca_s3h"]},
    "new_drug": {"label": "New / non-classical drug", "tone": "caution",
                 "summary": "The product is outside s.3(a) and s.3(h)(i): it has an ingredient not found in the indexed First Schedule formulae, or it is given by a parenteral route. Expect a higher evidence burden and expert review.",
                 "provisions": ["dca_s3h"]},
    "phyto": {"label": "Phytopharmaceutical", "tone": "caution",
              "summary": "A purified, standardised plant fraction is regulated as a phytopharmaceutical drug under the NDCT Rules, approved by CDSCO rather than the state authority.",
              "provisions": ["ndct_phyto"]},
    "aahar": {"label": "Ayurveda Aahara / nutraceutical", "tone": "info",
              "summary": "Sold as a food, the product falls under FSSAI, not the drug regime. Ayurveda Aahara status needs recipes and ingredients from the listed Ayurveda books; otherwise the general nutraceutical route applies.",
              "provisions": ["fssai_aahara"]},
    "cosmetic": {"label": "Cosmetic", "tone": "info",
                 "summary": "Applied to the body for cleansing or beautifying, it is a cosmetic under s.3(aaa). Therapeutic claims would pull it back into the drug regime.",
                 "provisions": ["dca_s3aaa"]},
}

LICENCE = {
    "classical": {"label": "State licence, book reference", "tone": "ok",
                  "summary": "Apply to the State Licensing Authority. The book reference is the basis for the formulation.",
                  "provisions": ["dcr_r153"], "steps": [{"label": "Form 24-D (application); licence in Form 25-D", "authority": "State Licensing Authority (AYUSH)", "url": "https://cdsco.gov.in/opencms/opencms/en/Acts-and-rules/"}]},
    "proprietary": {"label": "State licence, declared formula + evidence", "tone": "caution",
                    "summary": "Apply to the State Licensing Authority with the declared composition and the safety and effectiveness evidence Rule 158-B asks for.",
                    "provisions": ["dcr_r153"], "steps": [{"label": "Form 24-D (application); licence in Form 25-D", "authority": "State Licensing Authority (AYUSH)", "url": "https://cdsco.gov.in/opencms/opencms/en/Acts-and-rules/"}]},
    "new_drug": {"label": "Safety and efficacy studies first", "tone": "block",
                 "summary": "A book reference cannot carry this product. Plan safety and efficacy studies, and have a regulatory expert confirm the route before approaching the licensing authority.",
                 "provisions": ["dca_s3h", "dcr_r153"], "steps": [{"label": "Facilitator review before filing", "authority": "AIIA IP facilitation cell", "url": None}]},
    "phyto": {"label": "CDSCO new-drug approval", "tone": "block",
              "summary": "Phytopharmaceuticals follow the new-drug path under the NDCT Rules: standardisation data, then clinical evidence, then approval by the Central Licensing Authority.",
              "provisions": ["ndct_phyto"], "steps": [{"label": "Application on the SUGAM portal", "authority": "CDSCO (Central Licensing Authority)", "url": "https://cdscoonline.gov.in"}]},
    "aahar": {"label": "FSSAI licence", "tone": "ok",
              "summary": "License it as a food on FoSCoS. Follow the Ayurveda Aahara labelling rules and make no disease claims.",
              "provisions": ["fssai_aahara"], "steps": [{"label": "Licence application on FoSCoS", "authority": "FSSAI", "url": "https://foscos.fssai.gov.in"}]},
    "cosmetic": {"label": "Cosmetic manufacturing licence", "tone": "ok",
                 "summary": "Obtain a cosmetic manufacturing licence from the State Licensing Authority. Keep claims cosmetic, not therapeutic.",
                 "provisions": ["dca_s3aaa"], "steps": [{"label": "Cosmetic manufacturing licence", "authority": "State Licensing Authority", "url": None}]},
}

PATENT = {
    "tk_bar": {"label": "Patent unlikely: traditional knowledge", "tone": "block",
               "summary": "A codified formula is traditional knowledge, so s.3(p) bars it. Protect it through the brand, trade secrets in manufacturing know-how, and defensive prior-art routes.",
               "provisions": ["pat_s3p", "ayush_g_tkdl", "tkdl_access", "bda_s6"],
               "evidence": None},
    "admixture_risk": {"label": "s.3(e) / s.3(p) objection likely", "tone": "caution",
                       "summary": "A new combination of known herbs meets s.3(e) (mere admixture) unless the application shows synergy: a significant difference in efficacy over the components.",
                       "provisions": ["pat_s3e", "pat_s3p", "case_ajantha", "bda_s6"],
                       "evidence": "Run a combination study (for example a Chou-Talalay Combination Index study; CI < 1 indicates synergy) and put comparative efficacy data in the specification, or have it ready for the examination-report reply."},
    "potential": {"label": "Patent possible with evidence", "tone": "ok",
                  "summary": "The composition is not codified traditional knowledge, so a patent may be possible if it is new, inventive and industrially applicable. Disclose the source and origin of any biological material.",
                  "provisions": ["pat_s2_1_j", "pat_s10_4", "bda_s6"],
                  "evidence": "Novelty and inventive-step evidence; source and origin records of the biological material."},
    "process_potential": {"label": "Process or fraction may be patentable", "tone": "ok",
                          "summary": "A new, inventive extraction or standardisation process, or a defined fraction, may be patentable even where the plant use is traditional. Traditional uses of the plant itself stay unpatentable.",
                          "provisions": ["pat_s2_1_j", "pat_s3p", "pat_s10_4", "bda_s6"],
                          "evidence": "Process parameters and comparative data showing the fraction or process is new and not an obvious extraction."},
}
PATENT_STEPS = [
    {"label": "Form 1 (application) with Form 2 (specification)", "authority": "Indian Patent Office", "url": "https://ipindia.gov.in"},
    {"label": "Form 18 (request for examination)", "authority": "Indian Patent Office", "url": "https://ipindia.gov.in"},
    {"label": "NBA approval before grant (s.6)", "authority": "National Biodiversity Authority", "url": "http://nbaindia.org"},
]

ABS = {
    "nba_approval": {"label": "NBA approval needed", "tone": "block",
                     "summary": "A foreign-controlled entity needs prior approval of the National Biodiversity Authority to obtain Indian biological resources or associated knowledge.",
                     "provisions": ["bda_s3", "abs_slabs"], "steps": [{"label": "Access application", "authority": "National Biodiversity Authority", "url": "http://nbaindia.org"}]},
    "exempt_practitioner": {"label": "Exempt: practitioner", "tone": "ok",
                            "summary": "Vaids, hakims and (after the 2023 amendment) registered AYUSH practitioners practising indigenous medicine are outside the prior-intimation requirement.",
                            "provisions": ["bda_s7"], "steps": []},
    "exempt_cultivated": {"label": "Exempt with certificate of origin", "tone": "ok",
                          "summary": "Cultivated medicinal plants and their products are exempt from prior intimation, provided you hold a certificate of origin.",
                          "provisions": ["bda_s7"], "steps": [{"label": "Certificate of origin for the cultivated material", "authority": "Biodiversity Management Committee / State Biodiversity Board", "url": "http://nbaindia.org/link/241/34/1/SBBs.html"}]},
    "prior_intimation": {"label": "Prior intimation to SBB", "tone": "caution",
                         "summary": "Give prior intimation to your State Biodiversity Board before obtaining the resource for commercial use. Benefit sharing is graded by turnover (ranges below; the notification decides).",
                         "provisions": ["bda_s7", "abs_slabs"], "steps": [{"label": "Prior intimation", "authority": "State Biodiversity Board of your state", "url": "http://nbaindia.org/link/241/34/1/SBBs.html"}]},
}

BRAND = {
    "drug": {"label": "Trade mark in class 5", "tone": "info",
             "summary": "Register the brand in class 5. A plain herb or classical formula name (e.g. 'Triphala') is descriptive and will be refused; pair it with a distinctive mark. Check for similar marks and registered GIs first.",
             "provisions": ["tm_s9", "tm_s11", "gi_s25"]},
    "aahar": {"label": "Trade mark in classes 29/30 (or 5)", "tone": "info",
              "summary": "Food marks sit in classes 29/30 (supplements may fit class 5). Descriptive herb names are refused; check similar marks and GIs.",
              "provisions": ["tm_s9", "tm_s11", "gi_s25"]},
    "cosmetic": {"label": "Trade mark in class 3", "tone": "info",
                 "summary": "Cosmetic brands register in class 3. Descriptive herb names are refused; check similar marks and GIs.",
                 "provisions": ["tm_s9", "tm_s11", "gi_s25"]},
}
BRAND_STEPS = [
    {"label": "Public search of the TM register", "authority": "IP India", "url": "https://tmrsearch.ipindia.gov.in/ESEARCH/"},
    {"label": "Form TM-A (application)", "authority": "Trade Marks Registry", "url": "https://ipindia.gov.in"},
    {"label": "GI registry check for place names", "authority": "GI Registry, Chennai", "url": "https://ipindia.gov.in"},
]

ADVERT = {
    "drug": {"label": "DMR Act applies", "tone": "caution",
             "summary": "Advertising may not claim to treat conditions in the DMR Act Schedule (diabetes, obesity, blood pressure and others) and may not be misleading.",
             "provisions": ["dmr_s3", "dmr_s4"]},
    "aahar": {"label": "No disease claims on food", "tone": "caution",
              "summary": "As a food it may not claim to cure or treat disease. Stick to permitted, substantiated claims.",
              "provisions": ["fssai_aahara"]},
    "cosmetic": {"label": "Cosmetic claims only", "tone": "caution",
                 "summary": "Therapeutic claims would make the product a drug. Keep claims to cleansing, beautifying and appearance.",
                 "provisions": ["dca_s3aaa", "dmr_s4"]},
}

EXPORT = {
    ("us", "drug"): {"label": "US: dietary supplement route", "tone": "info",
                     "summary": "In the US most Ayurvedic products are sold as dietary supplements: no pre-market approval, but no disease claims. A drug claim needs FDA drug approval.",
                     "provisions": ["us_dshea_overview", "pct_overview", "madrid_overview"]},
    ("us", "aahar"): {"label": "US: dietary supplement / food", "tone": "info",
                      "summary": "Sold as a dietary supplement or food; structure/function claims only, with the FDA disclaimer.",
                      "provisions": ["us_dshea_overview", "madrid_overview"]},
    ("us", "cosmetic"): {"label": "US: cosmetic", "tone": "info",
                         "summary": "Cosmetics need no FDA pre-market approval but must not make drug claims.",
                         "provisions": ["madrid_overview"]},
    ("eu", "drug"): {"label": "EU: traditional-use registration", "tone": "caution",
                     "summary": "An herbal medicine needs registration. The traditional-use route requires 30 years of medicinal use, 15 of them in the EU; otherwise a full marketing authorisation.",
                     "provisions": ["eu_thmpd_overview", "pct_overview", "madrid_overview"]},
    ("eu", "aahar"): {"label": "EU: novel food check", "tone": "caution",
                      "summary": "An ingredient not consumed in the EU before 15 May 1997 needs novel-food authorisation, or the traditional-food notification route.",
                      "provisions": ["eu_novel_food_overview", "madrid_overview"]},
    ("eu", "cosmetic"): {"label": "EU: cosmetic", "tone": "info",
                         "summary": "EU cosmetic rules apply (safety assessment, responsible person). No medicinal claims.",
                         "provisions": ["madrid_overview"]},
}

FACT_DEPS = {
    "category": ["use", "route", "form"],
    "licence": ["use", "route", "form"],
    "patent": ["form"],
    "prior_art": [],
    "abs": ["entity", "practitioner", "sourcing"],
    "brand": ["use"],
    "advert": ["use"],
    "export": ["market", "use"],
}
GOAL_ROWS = {
    "patent": {"patent", "prior_art"},
    "licence": {"category", "licence", "abs"},
    "export": {"export", "abs"},
    "brand": {"brand", "advert"},
}


def _value(key, f, match, as_of):
    if key == "category":
        return triage.category(f, match)
    if key == "licence":
        return triage.category(f, match)
    if key == "patent":
        return triage.patent_posture(f, match)
    if key == "prior_art":
        return triage.patent_posture(f, match) if f["form"] != "x" else "unknown"
    if key == "abs":
        return triage.abs_path(f, match, as_of)
    if key in ("brand", "advert"):
        return triage.group(f, match)
    if key == "export":
        return (f["market"], triage.group(f, match))


def _resolve_row(key, facts, match, as_of):
    deps = FACT_DEPS[key]
    known = {k: v for k, v in facts.items() if k in triage.FACTS}
    # enumerate only the facts this row depends on
    unknown = [d for d in deps if d not in known]
    base = {k: "x" for k in triage.FACTS}
    base.update(known)
    values = set()
    for combo in product(*(triage.FACTS[u] for u in unknown)):
        f = dict(base)
        f.update(zip(unknown, combo))
        if key == "export" and f["market"] == "x":
            continue
        values.add(_value(key, f, match, as_of))
    if len(values) == 1:
        return values.pop(), []
    blocking = []
    for u in unknown:
        seen = set()
        for v in triage.FACTS[u]:
            f = dict(base)
            f[u] = v
            others = [o for o in unknown if o != u]
            for combo in product(*(triage.FACTS[o] for o in others)):
                g = dict(f)
                g.update(zip(others, combo))
                seen.add((v, _value(key, g, match, as_of)))
        by_v = {}
        for v, val in seen:
            by_v.setdefault(v, set()).add(val)
        if len({frozenset(s) for s in by_v.values()}) > 1:
            blocking.append(u)
    return None, blocking or unknown


def _cite(ids, as_of):
    out = []
    for ref in ids:
        p = data.resolve(ref, as_of)
        if p:
            out.append(data.public_provision(p, as_of))
    return out


def build(facts, match, as_of_str):
    as_of = data.parse_date(as_of_str)
    iso = as_of.isoformat()
    goal = facts.get("goal")
    relevant = GOAL_ROWS.get(goal, set())
    rows = []

    def add(key, title, jurisdiction, table, steps=None, extra=None):
        value, pending = _resolve_row(key, facts, match, iso)
        row = {"key": key, "title": title, "jurisdiction": jurisdiction, "relevant": key in relevant}
        if value is None:
            row.update({"status": "pending", "label": "Needs an answer", "tone": "pending",
                        "summary": "This depends on facts you have not given yet.", "depends_on": pending,
                        "provisions": [], "steps": []})
        else:
            entry = table(value) if callable(table) else table[value]
            row.update({"status": "resolved", "value": value if isinstance(value, str) else "-".join(value),
                        "label": entry["label"], "tone": entry["tone"], "summary": entry["summary"],
                        "provisions": _cite(entry.get("provisions", []), as_of),
                        "steps": entry.get("steps", steps or []), "depends_on": []})
            if entry.get("evidence"):
                row["evidence"] = entry["evidence"]
            if extra:
                extra(row, value)
        rows.append(row)

    add("category", "Product category", "india", CATEGORY)
    add("licence", "Licence path", "india", LICENCE)
    add("patent", "Patent posture", "india", PATENT, steps=PATENT_STEPS)

    def prior_art(value):
        cited = ["tkdl_access", "pat_s25"]
        if value in ("tk_bar", "admixture_risk"):
            cited.insert(0, "ayush_g_tkdl")
        return {"label": "Prior-art search kit", "tone": "info",
                "summary": "The full TKDL is searched by the patent examiner. Before filing, search the public routes below using every name of each ingredient, and look at IPC class A61K 36/00 (plant-based medicinal preparations).",
                "provisions": cited,
                "steps": [{"label": "Public TKDL search", "authority": "CSIR-TKDL", "url": "https://www.tkdl.res.in"},
                          {"label": "InPASS patent search (IPC A61K 36/00)", "authority": "IP India", "url": "https://iprsearch.ipindia.gov.in/PublicSearch/"}]}
    add("prior_art", "Prior art and TKDL", "india", prior_art)

    def abs_table(value):
        entry = dict(ABS[value])
        if value == "prior_intimation" and iso < triage.AMENDMENT_2023 and facts.get("sourcing") == "cultivated":
            entry["summary"] = ("As of this date the cultivated-medicinal-plant exemption had not yet been added to s.7, so "
                                "cultivated sourcing still needs prior intimation. " + entry["summary"])
        return entry
    add("abs", "Biodiversity access and benefit sharing", "india", abs_table)
    add("brand", "Brand: trade mark and GI", "india", BRAND, steps=BRAND_STEPS)
    add("advert", "Advertising and label claims", "india", ADVERT)
    if facts.get("goal") == "export" or "market" in facts:
        add("export", "Export market", "international", lambda v: EXPORT[v])

    s = triage.what_would_change(facts, match, iso)
    return {"as_of": iso, "goal": goal, "match": match, "rows": rows, "what_would_change": s,
            "disclaimer": "Information, not legal advice. Screening results are indicative; the licensing authority, patent office or NBA decides."}
