# Ayushkar (prototype)

Live: https://ayushkar-app.vercel.app

**New here or recording the demo?** Read [DEMO_GUIDE.md](DEMO_GUIDE.md): every feature explained in plain words, with a demo script.

A classification-first, citation-verified IP and regulatory assistant for Ayurveda.
Smart India Hackathon 2026, problem statement **SIH26045** (IP-SAKTI Sahayak) (Ministry of Ayush, All India Institute of Ayurveda). Team **The Council**.

> Information, not legal advice. This is an idea-round prototype: the formulation index and legal corpus are deliberately small and every record is flagged for verification against the official text.

## What the prototype shows

| Screen | Idea it demonstrates |
|---|---|
| **Product check** | *Statutory three-way test*: the ingredient list is matched against First Schedule (AFI) formula records to apply D&C Act s.3(a) / s.3(h)(i). The result shows the matched record or the exact ingredient, proportion or dosage form that breaks the match. Then *fewest-questions triage* asks only the questions that can change the advice for your goal, and a *deterministic protection dossier* covers category, licence, patent, prior art, ABS, brand, advertising and export, with cited provisions, forms and authorities, plus a computed *what would change this answer* list. |
| **Assistant chat** (side panel, every page) | A conversational assistant over the same cited engine. It keeps context ("what about internationally?" re-asks your last question in the other panel), gives a curated plain-language "in short" line plus the quoted provision, explains what changed in the law up to the selected date, sends classification questions to Product check, and abstains with a facilitator brief when out of scope. Ingredient names are redacted before sending. |
| **Ask the law** | Extractive, cited answers from two separate indexes (India / International), a confidence indicator, abstention with a facilitator brief, and redaction of ingredient names before anything is sent. |
| **Claim check** | Screens advertising or label copy against the DMR Act Schedule and misleading-claim patterns. |
| **Biopiracy screen** | Compares a foreign filing's claim text with codified formulations and documented traditional uses (Turmeric and Neem case replays, plus synthetic test filings). |
| **Law over time** | Each provision has effective dates. A global *law as of* date changes every answer. Includes treaty status (GRATK adopted, not in force) and a change-radar review queue where nothing goes live without human approval. |
| **Proofs** | Runs the evaluation plan live: perturbation benchmark, question counts vs a fixed form, as-of tests, answer accuracy, citation correctness, abstention, firewall and the vault canary leak test. |

**Formulation Vault.** The formula match runs in the browser. The server receives only a redacted fact sheet (`match`, answers, date). Every outbound request passes a guard that blocks it if it contains a formulation term, and the *What left your device* panel shows each payload byte for byte. The server audit log stores hashes and provision IDs, never content.

No language model decides anything. Classification, triage and the dossier are rule tables, answers quote retrieved provisions, and the chat's plain-language lines are curated by the team.

## Architecture

```
browser (React + Vite)
  formula match + ingredient dictionary + redaction + outbound guard   <- stays on device
        | redacted fact sheet / redacted question
FastAPI (Python)
  triage (information gain over advice signatures)
  dossier (rule table)   chat (intents + context over retrieval)
  retrieval: BM25, India index | International index (separate)
  as-of resolver (versioned provisions)   claim check   biopiracy screen   change radar   audit log
data/  ingredients.json  formulations.json  corpus.json  screens.json   (shared by both sides)
```

## Run locally

```bash
# backend
pip install -r requirements-dev.txt
uvicorn backend.main:app --port 8000

# frontend (proxies /api to :8000)
cd frontend && npm install && npm run dev
```

Tests:

```bash
python -m pytest tests          # firewall, as-of, triage, abstention, audit invariants
cd frontend && npm test         # formula match, perturbation benchmark, canary leak test
```

## Deploy

Vercel: the static frontend is built from `frontend/`, and `api/index.py` serves the FastAPI app as a Python function (see `vercel.json`).

## Data honesty notes

- The formulation index has 9 AFI records (the MVP target is 100 to 150). Proportions are to be verified against PCIM&H formulary specifications.
- Provisions are marked `quoted` (statutory wording) or `summary` (prototype paraphrase, to be replaced by ingested verbatim text). Rows with `verify: true` are open items in the claims register.
- ABS benefit-sharing figures are shown as ranges only, never as rupee amounts.
- The full TKDL is available only to patent offices. The prototype points to official routes and does not claim to search it.
- Bhashini integration is planned. The prototype ships pre-cached English and Hindi UI strings.
