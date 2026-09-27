"""Conversational layer over the cited retrieval engine.

No language model: intents are recognised with rules, answers are assembled
from retrieved provisions (quoted spans) plus curated plain-language gists.
The client sends only the redacted message and a small context object.
"""
import re

from . import retrieval

# Curated one-line takeaways, written and reviewed by the team (not generated).
GIST = {
    "dca_s3a": "A classical Ayurvedic drug is one made exactly to a formula in a First Schedule book.",
    "dca_s3h": "Using only book ingredients in a new combination makes it a patent or proprietary medicine, unless it is injected.",
    "dca_s3aaa": "A product applied to the body to clean or beautify it is a cosmetic, not a drug.",
    "dca_sch1": "The First Schedule is the list of books that count, including the Ayurvedic Formulary and Pharmacopoeia of India.",
    "dcr_r153": "Manufacturing needs a State licence (application in Form 24-D, licence in Form 25-D); proprietary products need more evidence.",
    "ndct_phyto": "A standardised plant fraction is a phytopharmaceutical and goes through CDSCO as a new drug.",
    "fssai_aahara": "Sold as food, it needs an FSSAI licence and cannot claim to treat disease.",
    "pat_s2_1_j": "To be patentable, something must be new, inventive and industrially useful.",
    "pat_s3e": "Just mixing known ingredients is not an invention unless you show synergy beyond the sum of the parts.",
    "pat_s3p": "Traditional knowledge, and known uses of traditional herbs, cannot be patented in India.",
    "pat_s10_4": "A patent using biological material must disclose where that material came from.",
    "pat_s25": "Anyone can oppose a patent that copies traditional knowledge or hides the source of biological material.",
    "ayush_g_tkdl": "For AYUSH patents, examiners search TKDL and applicants disclose the origin of biological resources.",
    "case_ajantha": "To get past s.3(e), put comparative efficacy or synergy data in the application.",
    "tkdl_access": "Only patent offices can search the full TKDL; the public portal is limited.",
    "bda_s3": "A foreign-controlled company needs NBA approval before using Indian biological resources.",
    "bda_s6": "A patent based on Indian biological resources needs NBA approval before it is granted.",
    "bda_s7": "Tell your State Biodiversity Board before using biological resources commercially, unless an exemption applies.",
    "abs_slabs": "Benefit sharing is a small percentage of ex-factory sales, graded by turnover; the notification decides the figure.",
    "tm_s9": "A plain herb or formula name cannot be your trade mark: it has to be distinctive.",
    "tm_s11": "Your brand is refused if it is confusingly similar to an existing mark for similar goods.",
    "gi_s25": "A trade mark cannot use a registered geographical indication for goods from elsewhere.",
    "gi_s22": "Only authorised users can use a registered GI.",
    "dmr_s3": "Ads cannot claim a drug treats listed conditions such as diabetes, obesity or blood pressure.",
    "dmr_s4": "Drug ads cannot be false or misleading.",
    "trips_a27_1": "WTO members must make patents available for new, inventive, industrially useful inventions.",
    "trips_a27_3b": "Countries may exclude plants and animals from patents but must protect plant varieties somehow.",
    "trips_a22": "Countries must stop misleading use of geographical indications.",
    "cbd_a15": "Genetic resources belong to the providing country; access needs its consent and benefit sharing.",
    "cbd_a8j": "Traditional knowledge of local communities should be respected and its benefits shared.",
    "nagoya_a5": "Benefits from using genetic resources must be shared fairly with the providing country.",
    "nagoya_a7": "Traditional knowledge needs the consent of the community that holds it.",
    "gratk_a3": "Under GRATK, patent applicants would disclose the origin of genetic resources and traditional knowledge. It is not yet in force.",
    "pct_overview": "One PCT application reserves your rights in many countries; national phase is usually at 30 months.",
    "madrid_overview": "One Madrid application can extend an Indian trade mark to other member countries.",
    "hague_overview": "Hague registers designs internationally, but India has not joined yet.",
    "budapest_overview": "Deposit a microorganism once with an approved depositary and patent offices everywhere accept it.",
    "us_dshea_overview": "In the US, sell it as a dietary supplement without disease claims; no pre-approval needed.",
    "eu_thmpd_overview": "In the EU, traditional-use registration needs 30 years of use, 15 of them in the EU.",
    "eu_novel_food_overview": "In the EU, a food not eaten there before 1997 needs novel-food authorisation.",
}

GREET = re.compile(r"^\s*(hi|hello|hey|namaste|namaskar|hii+|good (morning|evening|afternoon))\b", re.I)
THANKS = re.compile(r"\b(thanks|thank you|dhanyavad|shukriya|ok thanks)\b", re.I)
HELP = re.compile(r"\b(what can you do|help|how does this work|who are you)\b", re.I)
CLASSIFY = re.compile(r"\b(classify|category|which category|is (it|my \w+) (classical|proprietary)|what kind of (drug|product)|is my formula)\b", re.I)
SWITCH_INTL = re.compile(r"\b(international(ly)?|abroad|outside india|other countries|globally|what about (the )?(eu|us|usa|europe|america))\b", re.I)
SWITCH_INDIA = re.compile(r"\b(in india|indian law|what about india|back to india)\b", re.I)
CHANGED = re.compile(r"\b(what changed|what has changed|recent changes?|amendments?|latest changes?)\b", re.I)
BRIEF = re.compile(r"\b(human|expert|facilitator|talk to (a|an) (person|lawyer|agent)|escalate)\b", re.I)

START_SUGGESTIONS = [
    "Can I patent my classical churna?",
    "Do I need permission to buy herbs from farmers?",
    "How do I register a brand name?",
    "Can my ad say it controls diabetes?",
]
FOLLOW_UPS = {
    "pat_s3p": ["How do I register a brand name?", "Who can search the full TKDL?", "What about internationally?"],
    "pat_s3e": ["What evidence shows synergy?", "What about internationally?"],
    "case_ajantha": ["Is a new combination of known herbs patentable?"],
    "bda_s7": ["How much benefit sharing do I pay?", "What changed recently?"],
    "abs_slabs": ["Who is exempt from prior intimation?"],
    "tm_s9": ["Can I use a GI name in my brand?", "How do I protect my brand abroad?"],
    "dmr_s3": ["What claims count as misleading?"],
    "us_dshea_overview": ["How do I sell in the EU?"],
    "eu_thmpd_overview": ["Can I sell it as a dietary supplement in the USA?"],
    "gratk_a3": ["Is the GRATK treaty in force?", "What does Indian patent law require?"],
}


def _msg(text, **kw):
    return {"text": text, "citations": [], "suggestions": [], "actions": [], **kw}


def reply(message, context):
    jurisdiction = context.get("jurisdiction") or "india"
    last_q = context.get("last_question")
    as_of = context.get("as_of")
    text = message.strip()
    redacted = "[INGREDIENT" in text

    if not text or GREET.match(text) and len(text.split()) <= 4:
        return _msg("Namaste. I answer questions on IP and regulation for Ayurvedic products, and every answer quotes the law it relies on. "
                    "Ask in plain words. Switch between India and International in the panel header.",
                    suggestions=START_SUGGESTIONS, intent="greet")
    if THANKS.search(text) and len(text.split()) <= 5:
        return _msg("Happy to help. Remember this is information, not legal advice.", suggestions=START_SUGGESTIONS[:2], intent="thanks")
    if HELP.search(text) and len(text.split()) <= 8:
        return _msg("I can: explain which law applies (patents, licences, biodiversity, trade marks, advertising, export); quote the provision; "
                    "show the law as it stood on a past date; and hand a case to a human IP facilitator when I am not sure. "
                    "To classify a formulation, use Product check: your ingredients stay on your device there.",
                    suggestions=START_SUGGESTIONS, actions=[{"label": "Open Product check", "href": "#/check"}], intent="help")
    if CHANGED.search(text):
        return _changes(as_of)
    if BRIEF.search(text):
        return _msg("I can prepare a case brief for an IP facilitator with the question, the law date and what I found. Nothing about your formulation is included.",
                    actions=[{"label": "Prepare facilitator brief", "brief": True}], intent="escalate")
    if CLASSIFY.search(text) or (redacted and re.search(r"\b(classical|proprietary|category)\b", text, re.I)):
        return _msg("Classifying a product means testing its exact ingredients, proportions and form against the First Schedule books. "
                    "Do that in Product check, where the match runs on your device and nothing about the formula is sent.",
                    actions=[{"label": "Open Product check", "href": "#/check"}],
                    suggestions=["What is a proprietary medicine?", "What makes a medicine classical?"], intent="classify")

    # Follow-ups like "what about internationally?" re-ask the last question in the other panel.
    words = len(re.findall(r"[a-z]+", text.lower()))
    if SWITCH_INTL.search(text) and words <= 6 and last_q:
        return _answer(last_q, "international", as_of, switched=True)
    if SWITCH_INDIA.search(text) and words <= 6 and last_q:
        return _answer(last_q, "india", as_of, switched=True)

    out = _answer(text, jurisdiction, as_of)
    if redacted:
        out["text"] = "I removed ingredient names before sending your question. " + out["text"]
    return out


def _answer(question, jurisdiction, as_of, switched=False):
    r = retrieval.ask(question, jurisdiction, as_of)
    panel = "Indian law" if jurisdiction == "india" else "international law"
    if r["abstained"]:
        text = (f"I can't answer that from {panel} in my corpus, so I won't guess. " + r["reason"] +
                " I can pass it to a human IP facilitator.")
        return _msg(text, abstained=True, confidence="low", jurisdiction=jurisdiction, question=question, intent="abstain",
                    actions=[{"label": "Prepare facilitator brief", "brief": True}],
                    suggestions=START_SUGGESTIONS[:2], switch_hint=r.get("switch_hint"))
    top = r["citations"][0]
    lead = f"Looking at {panel}" + (" instead" if switched else "") + f" as of {r['as_of']}. "
    gist = GIST.get(top["family"]) or GIST.get(top["id"])
    text = lead + (f"In short: {gist}" if gist else f"The closest provision is {top['instrument_short']} {top['section']}.")
    if top.get("status") == "adopted_not_in_force" and "not yet in force" not in text:
        text += " Note that this instrument is adopted but not yet in force."
    also = [c for c in r["citations"][1:]]
    if also:
        text += " Also relevant: " + "; ".join(f"{c['instrument_short']} {c['section']}" for c in also) + "."
    sugg = [q for q in FOLLOW_UPS.get(top["family"], FOLLOW_UPS.get(top["id"], [])) if q.lower() != question.lower()]
    other = "What about internationally?" if jurisdiction == "india" else "What about in India?"
    if other not in sugg:
        sugg.insert(0, other) if r.get("switch_hint") else sugg.append(other)
    return _msg(text, citations=r["citations"], confidence=r["confidence"], reason=r["reason"], abstained=False,
                jurisdiction=jurisdiction, question=question, intent="answer", suggestions=sugg[:3],
                switch_hint=r.get("switch_hint"), gist_is_curated=bool(gist))


def _changes(as_of):
    """Summarise the modelled legal transitions up to the selected date."""
    from .. import data
    d = data.parse_date(as_of)
    lines = []
    for p in data.corpus()["provisions"]:
        if p["family"] != p["id"] and p.get("valid_to") is None and data.parse_date(p["valid_from"]) <= d:
            inst = data.instruments()[p["instrument"]]
            lines.append((p["valid_from"], f"{inst['short']} {p['section']} ({p['valid_from']}): {GIST.get(p['family'], p['title'])}"))
    for i in data.corpus()["instruments"]:
        st = data.instrument_status(i["id"], d)
        if st and st["status"] == "adopted_not_in_force":
            lines.append((st["from"], f"{i['short']} adopted {st['from']}, not yet in force."))
    lines.sort(reverse=True)
    if not lines:
        return _msg(f"No modelled changes before {d.isoformat()}.", intent="changes")
    return _msg(f"Changes modelled in the corpus up to {d.isoformat()}, newest first. Pick an earlier date in the header to see answers as the law stood then.",
                items=[l for _, l in lines], intent="changes", actions=[{"label": "Open Law over time", "href": "#/timeline"}],
                suggestions=["Who is exempt from prior intimation?", "How much benefit sharing do I pay?"])
