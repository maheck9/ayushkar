# Ayushkar: the complete guide (for the demo video)

This guide explains every part of the Ayushkar website in plain words: what each screen does, why it matters, exactly what to click in the demo, and what to say. Read it once from top to bottom, then keep the **Demo script** section (section 5) open while recording.

- **Live site:** https://ayushkar-app.vercel.app (older address, still working: https://sih-ayurveda-shi.vercel.app)
- **Code:** https://github.com/maheck9/ayushkar
- **Problem statement:** SIH26045, "IP-SAKTI Sahayak", from the Ministry of Ayush (All India Institute of Ayurveda)
- **Team:** The Council

---

## Contents

1. [What Ayushkar is, in one minute](#1-what-ayushkar-is-in-one-minute)
2. [The five ideas that make it different](#2-the-five-ideas-that-make-it-different)
3. [A tour of the screen](#3-a-tour-of-the-screen)
4. [Every feature, one by one](#4-every-feature-one-by-one)
5. [Demo video script (about 6 minutes)](#5-demo-video-script-about-6-minutes)
6. [How it works behind the scenes](#6-how-it-works-behind-the-scenes)
7. [Words you will hear (glossary)](#7-words-you-will-hear-glossary)
8. [What is real and what is prototype](#8-what-is-real-and-what-is-prototype)
9. [Questions judges may ask, with answers](#9-questions-judges-may-ask-with-answers)
10. [Recording tips and troubleshooting](#10-recording-tips-and-troubleshooting)

---

## 1. What Ayushkar is, in one minute

Imagine you run a small Ayurvedic company, or you are a vaidya, and you have made a product: say, a churna. You want to know:

- *Can I patent it?*
- *Which licence do I need to make and sell it?*
- *Do I need permission from a biodiversity board to buy the herbs?*
- *Can I call it "Triphala Gold" as a brand?*
- *Can my advert say it controls diabetes?*
- *How do I sell it in the US or Europe?*

Today the answers are spread across a dozen laws (patents, trade marks, geographical indications, the Biological Diversity Act, the Drugs and Cosmetics Act, advertising law, food law, international treaties). Most people cannot find them, and general chatbots often make up section numbers.

**Ayushkar is a helper website that answers these questions, and every answer shows the exact law it comes from.**

The key insight from the problem statement: **you cannot answer an IP question until you know what kind of product it is in law.** A "classical" medicine (made exactly from an old authoritative book) is treated very differently from a "new" medicine. So Ayushkar **first works out the product's legal category**, and only then gives advice.

---

## 2. The five ideas that make it different

Many teams are building "a chatbot with citations" for this problem statement. These five things are what set Ayushkar apart. Mention them in the video.

| # | Idea | In simple words | Where you see it |
|---|---|---|---|
| 1 | **Tests the product using the law's own test** | The Drugs and Cosmetics Act says a medicine is "classical" if it is made exactly to a formula in the listed books, and "proprietary" if it only uses ingredients from those books in a new combination. Ayushkar actually checks your ingredients against real formula records from the Ayurvedic Formulary of India. It doesn't guess from keywords. | Product check (the big yellow result) |
| 2 | **Asks the fewest questions** | It only asks a question if the answer could change the advice. For "can I patent my Triphala churna?" it asks just 2 questions. A normal form would ask all 8. | Product check (the questions) and Proofs |
| 3 | **Your secret formula never leaves your computer** | Companies will not type their secret recipe into a website. The formula matching happens inside your own browser, and the server only receives the result ("classical", "proprietary" or "not covered"). A panel shows you exactly what was sent. | "What left your device" button |
| 4 | **Law as of any date** | Laws change. Each rule in the database knows the dates it was valid. Pick a past date and every answer changes to the law as it was then. | "Law as of" date at the top, and the Law over time page |
| 5 | **Proves its own quality** | A Proofs page runs all the tests live and shows the scores: classification accuracy, the number of questions, citation accuracy, and whether it correctly refuses off-topic questions. | Proofs page |

Also important, and required by the problem statement:
- **India and international law are never mixed.** They are kept in two separate databases and shown in separate panels.
- **It says "I don't know" instead of guessing**, and offers to hand the case to a human expert (an "IP facilitator").
- **It covers the other half of the problem too:** it checks foreign patents for copied Indian traditional knowledge (the "Biopiracy screen").
- **It is information, not legal advice.** This line appears on every page.

---

## 3. A tour of the screen

Top of every page, from left to right:

| Item | What it is | What it does |
|---|---|---|
| **Ayushkar** logo and name | The app name | Nothing to click |
| **Law as of [date]** | A date picker. It starts at today. | Changes the date for the whole app. Pick 1 June 2023 and every answer shows the law as it stood then. A yellow banner appears to remind you. Click **Today** to go back. |
| **What left your device (number)** | The privacy panel. The number counts messages sent to the server. | Opens a window listing every single message your browser sent to the server, word for word. A second tab shows the server's audit log. |
| **EN / हिं** | Language switch | Switches the menus, buttons and questions to Hindi. Legal text stays in English for now (full Hindi answers are planned through Bhashini, the government's language service). |
| **Tabs**: Product check, Ask the law, Claim check, Biopiracy screen, Law over time, Proofs | The six main screens | Each one is explained in section 4 |
| **Ask Ayushkar** (bottom-right button) | The chat assistant | Opens a chat panel on the right side of any page |
| **Footer** | Disclaimer and credits | "Information, not legal advice" plus team and problem statement details |

---

## 4. Every feature, one by one

For each feature: **what it is**, **why it matters**, **how to show it**, and **what to say**.

### 4.1 Product check (the main feature)

**What it is:** You type your product's ingredients. Ayushkar tells you what it is in law, asks a few questions, and then gives you a full "protection dossier": a report covering every legal area that applies.

**Why it matters:** This is the heart of the problem statement: "first classify the formulation, asking the minimum clarifying questions."

#### Step 1: Type the product

- **Ingredients box:** type one per line or separated by commas. You can use **any name**: Sanskrit (Haritaki), Hindi (Harad), English (Chebulic myrobalan) or the botanical name (Terminalia chebula). Small spelling mistakes are fine. Add parts if you know them, e.g. "Haritaki 1 part".
- **Dosage form:** churna (powder), vati (tablet), capsule, and so on. This matters, because the book formula is for a specific form.
- **Working name:** optional. It never leaves your device.
- **Try an example** buttons fill the box for you:

| Example button | What happens | Why it's a good demo |
|---|---|---|
| **Triphala churna** | **Classical candidate.** Matches "Triphala Churna, Ayurvedic Formulary of India, Part I". | Shows an exact match with the book named |
| **Triphala with Ashwagandha** | **Proprietary candidate.** Ashwagandha is highlighted as the ingredient that breaks the match. | Shows how one extra ingredient changes the category |
| **Triphala with curcumin 95%** | **Not covered by the index.** Curcumin 95% is an isolated chemical, not a book ingredient. | Shows a "new drug" style product |
| **Sitopaladi as a tablet** | **Proprietary candidate.** The ingredients match Sitopaladi, but the book gives it as a churna, not a tablet. | Shows that even the dosage form counts |

Click **Test against the First Schedule**. (The "First Schedule" is the list of official Ayurvedic books in the Drugs and Cosmetics Act.)

#### Step 2: The result (the big yellow box)

This is the one bright, loud part of the design, on purpose.

- **The big title** is the category:
  - **Classical candidate:** made exactly to a book formula. Section 3(a) of the Drugs and Cosmetics Act.
  - **Proprietary candidate:** only book ingredients, but not a book formula. Section 3(h)(i).
  - **Not covered by the index:** has an ingredient not found in the book formulas we have indexed. It is probably a new drug.
- **The ingredient chips** show how each thing you typed was understood. For example "Harad 1 part" becomes **Haritaki** *Terminalia chebula*.
  - Green chip: part of the matched book formula
  - Yellow outlined chip: an extra ingredient that is not in the nearest formula
  - Red dashed chip: not a book ingredient at all, or not recognised
- **What breaks the match** lists the exact reason, e.g. "Ashwagandha: not in Triphala Churna" or "dosage form: book gives churna, product is vati".
- **The small grey note** is honest about limits: the check covers ingredients, proportions and form (the law also covers the method of making it), and the index has 9 of the 150 planned records. "Not covered" means "not found in our records", never "definitely not classical".

**Say:** "Ayushkar applies the actual legal test. Section 3(a) says classical means made exactly to a book formula, so we compare against real formula records. Add one ingredient and the category changes, and it tells you exactly why."

#### Step 3: The questions

Under **Questions that can change the advice**, Ayushkar asks one question at a time:

| Question | Options |
|---|---|
| What do you want to do next? | Patent it / Get a manufacturing licence / Export it / Build a brand |
| How will it be sold? | As a medicine / As a food or supplement / As a cosmetic |
| How is it taken or applied? | By mouth / On the skin / By injection |
| Is it the whole herb preparation or a standardised extract? | Whole herb, traditional method / Standardised extract |
| Who is making it? | An Indian company or person / A foreign-controlled company |
| Where do the herbs come from? | Cultivated farms / Wild collection or traders |
| Are you a vaid or registered AYUSH practitioner making it for your own practice? | Yes / No |
| Which export market first? | United States / European Union |

The smart part: **it skips questions that would not change the answer.** The line above the questions shows the count, e.g. "2 asked. A fixed form would ask all 8."

How many questions each goal needs (from our own testing):

| Goal | Questions asked | Why |
|---|---|---|
| Patent it | **2** (goal + whole herb or extract) | Patent advice depends on the formula and on whether it's an extract. Selling method, sourcing etc. don't change it. |
| Build a brand | **2** (goal + how it's sold) | The trade mark class depends only on medicine, food or cosmetic |
| Export it | 6 | Needs the market and biodiversity facts |
| Get a manufacturing licence | 6 to 7 | Needs the category and all biodiversity facts |

"I don't know" is always allowed. The dossier will then show which parts depend on the missing answer.

**Say:** "A normal form asks everyone 8 questions. Ayushkar asks only the ones that can change the advice. For a patent question, that's 2."

#### Step 4: The protection dossier

After the last question the **Protection dossier** appears. It's a set of rows, one per legal area. The rows for **your goal** come first. The rest are under **Other regimes** (click to open).

Each row has:
- a **coloured bar on the left**: green = fine or low risk, yellow = be careful, red = blocked or hard, dashed grey = needs an answer
- a **short verdict** (e.g. "Patent unlikely: traditional knowledge")
- a plain explanation
- **next steps**: the actual form name and office, with a link (e.g. "Form 24-D (application); licence in Form 25-D, State Licensing Authority")
- **citations** on the right: click one to open the exact legal text (see 4.9)

The rows:

| Row | What it tells you |
|---|---|
| **Product category** | Classical / Proprietary / New drug / Phytopharmaceutical / Ayurveda Aahara (food) / Cosmetic, with the section of law |
| **Licence path** | Which licence, which form, which office (State licensing authority, CDSCO, FSSAI) |
| **Patent posture** | Whether a patent is possible. Classical: blocked by s.3(p) (traditional knowledge). New combination: risk under s.3(e) ("mere mixture"), with an **Evidence to prepare** box telling you to run a synergy study (a "Combination Index" study), based on the *Ajantha Pharma v. Allergan* case. It also shows the patent forms (Form 1, 2, 18) and that NBA approval is needed before grant. |
| **Prior art and TKDL** | How to check whether your idea is already known: the public TKDL search, the Indian patent search (class A61K 36/00), and a table of every name of every ingredient (Sanskrit, Hindi, English, botanical) to search with. The table is built on your device. |
| **Biodiversity access and benefit sharing** | Whether you must tell the State Biodiversity Board, get NBA approval, or are exempt (as a practitioner, or for cultivated herbs with a certificate of origin). Benefit-sharing rates are shown as ranges only. |
| **Brand: trade mark and GI** | Which trade mark class (5 for medicine, 3 for cosmetic, 29/30 for food), why a plain herb name will be refused, and a check against geographical indications |
| **Advertising and label claims** | What you can't claim (e.g. the DMR Act bans claims to treat diabetes, obesity, blood pressure) |
| **Export market** (only if exporting) | US (sell as a dietary supplement, no disease claims) or EU (traditional-use registration needs 30 years of use, 15 of them in the EU). Shown with a blue "International" tag, because it's international law, kept separate. |

#### Step 5: What would change this answer

A grey box lists what would flip the advice, e.g.:
- "If who makes it were **A foreign-controlled company**: proprietary medicine, NBA approval needed"
- "If one ingredient were outside the First Schedule formulae: new / non-classical drug"

The computer works this out by trying every other answer. None of it is typed in by hand.

**Say:** "It also tells you what would change the answer, so you know which facts really matter."

#### Step 6: The buttons at the bottom

- **Answer the remaining questions:** fill in the questions that were skipped, to complete the rows that were waiting on them
- **Prepare facilitator brief:** makes a one-page case summary for a human IP expert, with the facts, the category, the findings, the laws used and the open questions. **The formula itself is not included.** It has a **Print or save as PDF** button.
- **The server received only this:** click to see the exact data that was sent to the server. It contains no ingredient names, just the category result and your answers.

#### Try the date trick here

With a dossier on screen (goal: licence, sourcing: cultivated farms), change **Law as of** to **1 June 2023**. The biodiversity row changes from **"Exempt with certificate of origin"** to **"Prior intimation to SBB"**, because the exemption for cultivated medicinal plants only arrived with the 2023 amendment, in force from April 2024. Change it back with **Today**.

---

### 4.2 Ask Ayushkar (the chat assistant)

**What it is:** A chat panel that opens from the **Ask Ayushkar** button at the bottom-right of any page. On a laptop it sits at the side, so you can still see the page. On a phone it fills the screen.

**What's in the panel:**
- **Header:** "Ayushkar assistant", the law date, and an **India / International** switch
- **Messages:** your messages on the right (dark), Ayushkar's on the left (green edge for India, blue for International)
- Each answer has:
  - a label (India or International)
  - **"In short:"** a one-line plain-language summary. These lines were written by our team, not generated, and a small note says so.
  - a **confidence** bar (High / Medium / Low)
  - the **quoted law** underneath (the first one open, the others clickable)
  - **suggested next questions** as buttons
- The input box at the bottom, and a reminder that ingredient names are removed before sending

**Things to try:**

| Type or click | What happens |
|---|---|
| "Can I patent my classical churna?" | "In short: Traditional knowledge, and known uses of traditional herbs, cannot be patented in India." Quotes Patents Act s.3(p). |
| Click **What about internationally?** | Re-asks the same question under international law. The switch flips to International and the answer comes from international sources only. |
| "Can I patent my haritaki and amla churna?" | Your message shows "Sent as: Can I patent my [INGREDIENT 1] and [INGREDIENT 2] churna?". The names were removed **on your device** before sending. |
| "What changed recently?" | A list of legal changes up to the chosen date, newest first, with a button to open Law over time |
| "Is my formula classical?" | Sends you to Product check, because the formula should be tested on your device, not typed into chat |
| "What is the GST on churna?" | "I can't answer that… I won't guess." Offers **Prepare facilitator brief**. |
| "I want to talk to an expert" | Offers the facilitator brief |
| "Hi" or "What can you do?" | A short introduction and starter questions |

**Say:** "The assistant answers in plain language but always shows the actual law underneath. It remembers the conversation, keeps India and international law separate, and if something is outside its knowledge, it says so and offers a human expert."

---

### 4.3 Ask the law

**What it is:** A bigger, full-page version of question answering, with India and International **side by side**.

**How to use it:**
- Choose **India**, **International**, or **Both, side by side**
- Type a question or click a suggested one
- Click **Get cited answer**

**What you see:**
- Each panel (green top = India, blue top = International) shows:
  - a **confidence** bar and a reason, e.g. "2 of 4 question terms found in the top provision; 3 provision(s) cited"
  - the **quoted provisions**, with the most relevant sentence highlighted in yellow
- If your question mentions ingredient names, a line shows "Sent as: …" with them removed
- If a question clearly belongs to the other side (e.g. asking about the EU in the India panel), a blue hint says so, with a **Switch panel** link
- If it can't answer: **No answer given**, the reason, the closest provisions it found (not relied on), and **Prepare facilitator brief**

**Good demo:** choose **Both, side by side** and ask "Can I patent my harad and amla churna with 2 parts ashwagandha?". India cites Patents Act s.3(p), s.2(1)(j) and s.3(e). International cites TRIPS Article 27.1. They are never mixed, and the ingredient names are removed before sending.

---

### 4.4 Claim check

**What it is:** Paste advertising or label text. Ayushkar highlights the phrases that break advertising law.

**How to use it:** The box already contains a sample advert:
> "Our 100% natural Madhumeha Churna controls blood sugar and helps weight loss. Clinically proven, with no side effects. Trusted by vaidyas for generations."

Choose **Product sold as** (Medicine / Food or supplement / Cosmetic) and click **Check these claims**.

**What you see:**
- "6 phrase(s) to revise before publishing."
- The text with phrases highlighted:
  - **Red:** conditions listed in the DMR Act Schedule (the law bans ads claiming to treat them): "Madhumeha" and "blood sugar" (diabetes), "weight loss" (obesity)
  - **Yellow:** misleading claims: "100%", "Clinically proven", "no side effect"
- A list explaining each one, and the law (DMR Act s.3 and s.4)
- If you choose **Cosmetic** and the text says "cures", it warns that a cure claim would make the product count as a drug

**Say:** "Before you print a label or run an ad, Ayushkar catches claims the law does not allow."

---

### 4.5 Biopiracy screen

**What it is:** The other half of the problem statement: Indian traditional knowledge being patented abroad. You paste a foreign patent's claim text, and Ayushkar checks whether it copies a known formula or a known traditional use.

**The four example buttons:**

| Button | What it is | Result |
|---|---|---|
| **Turmeric for wound healing** | A real US patent from 1995 | "Documented traditional use: Haridra (turmeric) is claimed for wound healing". Then **What actually happened**: India's CSIR challenged it, and the patent office revoked it in 1997. |
| **Neem oil as a fungicide** | A real European patent | Flags neem's traditional antifungal use. It was revoked in 2000, and the revocation was upheld in 2005. |
| **Synthetic: bowel regularity** | A made-up test patent (clearly labelled) | **Strong overlap:** it names every ingredient of Triphala Churna |
| **Synthetic: stress-relief capsule** | A made-up test patent | Flags Ashwagandha's traditional use |

Click an example, then **Screen this filing**.

**What you see:** the herb names found (even botanical names like *Terminalia chebula*), the findings (**Strong overlap**, **Partial overlap**, **Documented traditional use**), the next step (a human reviewer, then a formal objection to the patent), and the relevant Indian law.

**Say:** "This protects Indian knowledge abroad. We replayed the real turmeric case: the screen flags it immediately. It's a screening tool for human reviewers, not an automatic judge."

---

### 4.6 Law over time

**What it is:** Shows how the law changed over time, and lets you jump to a past date.

**Parts of the page:**

1. **Jump to** buttons: "Mid-2023, before the BD Act amendment", "Jan 2025, before the ABS Regulation", "Today". They change the date for the whole app.
2. **Modelled transitions:** a timeline bar for each rule that changed:
   - **BD Act s.6** (patent approval from the biodiversity authority): before 2024, approval was needed before applying. Now it's needed before grant.
   - **BD Act s.7** (telling the State Biodiversity Board): new exemptions were added in 2024 for cultivated medicinal plants and registered AYUSH practitioners
   - **Benefit sharing:** the 2014 guidelines were replaced by the 2025 Regulation (under ₹5 crore turnover is now exempt)
   - The **dark green** bar is the version in force on the chosen date. The **yellow line** marks the chosen date. The legal text in force on that date is shown below each bar.
3. **Instruments on [date]:** every law and treaty with its status: **In force**, **Adopted, not in force** (e.g. the WIPO GRATK treaty), **Superseded**, or **Not yet made**. India and International are in separate columns.
4. **Change radar review queue:** when an official website changes, the change appears here showing the old text (red) and new text (green), each with a fingerprint (hash). **Nothing goes live until a person clicks Approve change.** Examples: the GRATK treaty going from 2 to 4 ratifications, and a note on India and the Hague designs system. In the prototype these "fetches" come from saved snapshots.

**Say:** "The law keeps changing. Every rule in Ayushkar knows the dates it was valid, so an older licence or filing gets the right answer. When an official page changes, a human must approve the update, so nothing changes silently."

---

### 4.7 Proofs

**What it is:** A page that runs our tests live and shows the results. This is our answer to "how do we know it works?"

Click **Run all checks now**. The table shows:

| Check | What it tests | Result |
|---|---|---|
| **Proof 1: Three-way classification** | 150 test products made by changing real formulas (remove, add or swap an ingredient, change the form, change a proportion, add a chemical), typed with mixed Sanskrit, Hindi, English and botanical names | 150 / 150 correct |
| **Proof 2: Fewest-questions triage** | Every possible user (3,456 combinations of answers) | Typically 3 questions, never more than 7. A fixed form asks 8. |
| **Early stopping never changes advice** | Would asking all 8 questions have given a different answer? | 0 cases differ |
| **Proof 3: As-of-date** | 10 checks that the right version of the law is picked for a date | 10 / 10 |
| **Answer accuracy** | 16 legal questions: is the right law cited first? | 15 / 16 first, 16 / 16 in the top 3 |
| **Citation correctness** | Is every quoted sentence really in the source text? | 32 / 32 |
| **Safe abstention** | Does it refuse off-topic questions and answer on-topic ones? | 6 / 6 refused, 0 wrongly refused |
| **Jurisdiction firewall** | Does India ever cite international law, or the other way round? | 0 times |
| **Formulation Vault canary test** | We plant a fake secret ingredient ("canary") and check it never leaves | 0 leaks, and the raw canary is blocked |

Below the table is a **bar chart** of how many questions each simulated user needed (hover over a bar for the exact number, or open **Table view**). Half of all users need only 2.

Open **Statute-lookup questions and what was cited** to see each test question and what was cited. The one miss is highlighted: we left it in rather than tweak the test to pass.

**Say:** "These numbers are computed live, right now, not typed in. The data is prototype-sized, so they show the method works, not final accuracy."

---

### 4.8 What left your device (Formulation Vault)

**What it is:** The privacy panel, from the button at the top.

**Tab 1, Sent from this device:** every message your browser sent, word for word, with time and size. After a product check you'll see messages to `/api/triage` and `/api/dossier` containing only things like `"match": "proprietary"` and your answers. **No ingredient names.** If something ever tried to send a secret ingredient, it would be **blocked** and shown in red.

**Tab 2, Server audit log:** what the server keeps: the time, which feature was used, a fingerprint (hash) of the message, and which laws were cited. **Never the content itself.**

**Say:** "A company's formula is its secret. The matching happens inside the browser, the server only ever sees the result, and you can check every byte that left."

---

### 4.9 Reading a citation box

Citation boxes appear everywhere. Click one to open it:

| Part | Meaning |
|---|---|
| **Name and section** (e.g. "Patents Act s.3(p)") | Which law and which section |
| **Quoted text** (serif font) | The legal text. Yellow highlight = the sentence that matched your question. |
| **Text:** Quoted / Prototype summary | "Quoted" = the law's own wording. "Prototype summary" = our summary, to be replaced by the exact official text when we load the full database. |
| **Valid:** from … to … | The dates this version of the law applies |
| **Status** | Shown if it's not simply in force, e.g. "Adopted, not in force" |
| **Source** | Link to the official source |
| **Hash** | A fingerprint of the text, so any change can be detected |
| Orange note "Open item in the claims register…" | We still need to check this against the official gazette. It's honest labelling. |

---

### 4.10 Hindi (हिं)

Click **हिं** at the top right. The menus, the product-check questions and answers, the category names, the buttons and the chat panel's labels switch to Hindi. Legal text and dossier explanations stay in English in this prototype. The plan is to translate them through **Bhashini** (the Government of India's language platform), keeping section numbers untranslated.

---

## 5. Demo video script (about 6 minutes)

Before recording: open the site, press **Run all checks now** on Proofs once to wake up the server (see section 10), then reload the Product check page.

| Time | Screen | Do this | Say this (roughly) |
|---|---|---|---|
| 0:00 to 0:30 | Product check (empty) | Show the page | "This is Ayushkar, for SIH26045. An Ayurvedic product has to deal with patents, licences, biodiversity rules, trade marks and advertising law all at once. Ayushkar first works out what the product is in law, then gives cited advice." |
| 0:30 to 1:15 | Product check | Click **Triphala churna**, then **Test against the First Schedule**. Point at the chips. | "It matches Triphala Churna in the Ayurvedic Formulary of India. That's a classical drug under Section 3(a). Names can be typed in any language." |
| 1:15 to 1:45 | Product check | Choose **Patent it**, then **Whole herb, traditional method**. Point at "2 asked. A fixed form would ask all 8." | "It asked only 2 questions, because nothing else changes the patent answer." |
| 1:45 to 2:15 | Dossier | Show the red **Patent unlikely** row and open the s.3(p) citation | "A classical formula is traditional knowledge, so Section 3(p) blocks a patent. Here's the exact text. Instead, it points to branding and a prior-art check." |
| 2:15 to 2:45 | Product check | Click **Start again**, then **Triphala with Ashwagandha**, test it, choose **Patent it** and **Whole herb** | "Add one ingredient and it becomes proprietary. It tells us exactly why: Ashwagandha. Now the patent risk is s.3(e), 'mere mixture', and it tells us what evidence to prepare: a synergy study." |
| 2:45 to 3:15 | Top bar | Open **What left your device** | "Notice what the server received: no ingredients, just 'proprietary' and our answers. The formula stayed on this computer." |
| 3:15 to 4:00 | Chat | Open **Ask Ayushkar**. Ask "Can I patent my classical churna?", then click **What about internationally?**, then ask "What is the GST on churna?" | "The assistant answers in plain words with the law quoted underneath. It keeps India and international law separate, and when a question is out of scope it says so and offers a human expert." |
| 4:00 to 4:30 | Law over time | Click **Mid-2023**. Point at the timeline, and at GRATK and the ABS Regulation 2025 showing "Not yet made". Click **Today**: GRATK now shows "Adopted, not in force". | "Every rule knows when it was valid. In mid-2023 the cultivated-herb exemption and the 2025 benefit-sharing rules didn't exist yet. Today the GRATK treaty is adopted but not in force, and we say exactly that." |
| 4:30 to 5:00 | Biopiracy screen | Click **Turmeric for wound healing**, then **Screen this filing** | "The other half of the problem: our knowledge being patented abroad. The real turmeric patent is flagged straight away." |
| 5:00 to 5:20 | Claim check | Click **Check these claims** | "Before an advert goes out, it catches banned claims like 'controls blood sugar'." |
| 5:20 to 6:00 | Proofs | Click **Run all checks now** | "Finally, the proof. 150 out of 150 classification tests, a median of 3 questions against 8, every quote verified, zero mixing of Indian and international law, zero leaks. Computed live. Ayushkar: information, not legal advice, but always cited, always dated." |

**Optional extras if you have time:**
- The date trick on a licence dossier (section 4.1, "Try the date trick here")
- **हिं** to show Hindi
- **Prepare facilitator brief**, then **Print or save as PDF**
- **Triphala with curcumin 95%** to show "Not covered by the index"

---

## 6. How it works behind the scenes

In simple terms, there are two halves:

```
YOUR BROWSER (the website)                       OUR SERVER (Python, FastAPI)
------------------------------                   ---------------------------------
- Reads your ingredient names                    - Picks the next question
- Matches them against book formulas     --->    - Builds the dossier from rule tables
- Removes ingredient names from text     only    - Searches the law database (India and
- Checks every message before sending    the       International kept as two separate
- Shows you what was sent                result    databases)
                                                 - Picks the right version of each law
                                                   for the chosen date
                                                 - Claim check, biopiracy screen,
                                                   change radar, audit log (hashes only)
```

**The data** (in the `data/` folder of the code):
- `ingredients.json`: about 60 ingredients with their Sanskrit, Hindi, English and botanical names, and known traditional uses
- `formulations.json`: 9 formulas from the Ayurvedic Formulary of India (Triphala, Trikatu, Sitopaladi, Talisadi, Hingvashtaka, Avipattikara, Balachaturbhadra, Dashamoola, Triphala Guggulu)
- `corpus.json`: 25 laws and treaties, 43 provisions, each with dates and status
- `screens.json`: the advertising-law word list, the biopiracy cases, and the change-radar items

**No AI model makes decisions.** The category, the questions and the dossier all come from fixed rules, so the same input always gives the same output and an expert can review every rule. Answers are quoted from the law, not written by a machine. This is on purpose: for legal information, being checkable matters more than sounding fluent. (A language model could later be added just for wording, and it would only see redacted facts.)

**How it picks the fewest questions:** it considers every possible combination of answers and looks at what advice each one would lead to. It asks the question that splits those possibilities most, and stops as soon as all remaining possibilities give the same advice.

**Built with:** React and Vite (website), Python and FastAPI (server), hosted on Vercel. The code is on GitHub.

---

## 7. Words you will hear (glossary)

| Term | Simple meaning |
|---|---|
| **AFI** | Ayurvedic Formulary of India: the official book of standard Ayurvedic formulas |
| **API** | Ayurvedic Pharmacopoeia of India: the official standards for Ayurvedic drugs |
| **First Schedule** | The list of official Ayurvedic, Siddha and Unani books in the Drugs and Cosmetics Act |
| **Classical medicine** (s.3(a)) | Made exactly to a formula in a First Schedule book |
| **Proprietary medicine** (s.3(h)(i)) | Uses only book ingredients, but in a combination not in the books (and not injected) |
| **Phytopharmaceutical** | A purified, standardised plant extract, approved like a new drug by CDSCO |
| **Ayurveda Aahara** | Ayurvedic food, regulated by FSSAI (the food regulator), not as medicine |
| **s.3(p), Patents Act** | Traditional knowledge cannot be patented |
| **s.3(e), Patents Act** | Simply mixing known things is not an invention unless it gives a real extra (synergistic) effect |
| **Synergy / Combination Index** | A lab test showing a mixture works better than its parts added together |
| **TKDL** | Traditional Knowledge Digital Library: India's database of traditional formulas. The full version is only open to patent offices. |
| **Prior art** | Anything already known before your invention |
| **NBA** | National Biodiversity Authority |
| **SBB** | State Biodiversity Board |
| **ABS** | Access and Benefit Sharing: rules for using India's plants and sharing profits with local communities |
| **Prior intimation** | Telling the State Biodiversity Board before using a biological resource commercially |
| **Certificate of origin** | Proof that herbs came from cultivation, which now gives an exemption |
| **GI** | Geographical Indication: a name tied to a place, like Darjeeling tea |
| **Trade mark class** | The category you register a brand in: 5 for medicines, 3 for cosmetics, 29/30 for food |
| **DMR Act** | Drugs and Magic Remedies Act: bans ads claiming to cure listed diseases |
| **CDSCO** | Central drug regulator |
| **FSSAI** | Food regulator |
| **TRIPS** | The WTO agreement on intellectual property |
| **CBD / Nagoya Protocol** | International treaties on biodiversity and benefit sharing |
| **GRATK** | New WIPO treaty (2024) requiring patent applicants to disclose where genetic resources and traditional knowledge came from. Adopted, but **not yet in force**. |
| **PCT / Madrid / Hague** | International systems to file patents, trade marks and designs in many countries at once |
| **IP facilitator** | A human expert who helps with IP filings |
| **Jurisdiction firewall** | Our rule that Indian and international law are never mixed in one answer |
| **Abstain** | When Ayushkar says "I don't know" instead of guessing |
| **Hash** | A digital fingerprint of text. If the text changes, the fingerprint changes. |
| **As-of date** | The date whose law you want to see |

---

## 8. What is real and what is prototype

Be open about this in the video if asked. Judges respect it.

| Real and working now | Prototype or planned |
|---|---|
| Formula matching against the law's actual test | Only 9 formula records (the plan is 100 to 150, then all of AFI and API). Records are marked "verify" until checked against the official formulary specification. |
| Fewest-questions logic, dossier rules, what-would-change | Rules should be reviewed by an Ayurveda regulatory or IP expert |
| Two separate law databases, cited answers, abstention | 43 provisions. Many are marked "Prototype summary" until the exact official text is loaded. Some dates are marked "verify". |
| As-of-date law, versioned rules, change radar with human approval | Radar "fetches" come from saved snapshots, not live websites yet |
| Formulation Vault, redaction, leak test, audit log | The audit log resets when the server restarts (no database yet) |
| Chat assistant with context | Rule-based, no AI model. Plain-language lines are written by the team. |
| Hindi menus and questions | Full Hindi answers and voice through Bhashini come later |
| Live tests on the Proofs page | Numbers are on prototype-sized data |

**Things we never claim** (following our planning document): "100% accurate", "zero hallucination", "guarantees compliance", "full TKDL access", exact benefit-sharing rupee amounts, or "GRATK compliant".

---

## 9. Questions judges may ask, with answers

**"How is this different from the other teams' chatbots?"**
Most use keywords or an AI guess to decide the category. We apply the Drugs and Cosmetics Act's own test against real formula records, ask only the questions that change the advice, keep the formula on the user's device, answer as of any date, and publish live test results.

**"Why no AI model?"**
For legal information, an answer must be traceable and repeatable. Our rules give the same output every time and an expert can check each one. An AI model can be added later just to make the wording friendlier, and it would only ever see redacted facts.

**"Can it search TKDL?"**
Not the full TKDL. That is only available to patent offices, by agreement. We give the official search routes (public TKDL, InPASS, class A61K 36/00) plus every name of each ingredient to search with.

**"How accurate is it?"**
On our current test sets: 150/150 classification tests, 15/16 top-cited answers (16/16 in the top 3), 32/32 quotes verified, 6/6 correct refusals, 0 cross-jurisdiction citations, 0 leaks. The data is prototype-sized, so we present these as proof that the method and the test harness work.

**"What happens when the law changes?"**
Each provision has start and end dates. The change radar spots changes on official pages and puts them in a review queue. A human must approve them before they go live.

**"Is the user's data safe?"**
The formula never leaves the browser. Free-text questions have ingredient names removed before sending, a guard blocks any message containing a formula term, and the server only logs fingerprints, never content.

**"How will it scale?"**
Index the top 150 AFI formulas first, then all of AFI and API, then other First Schedule books. India first, then international. Text first, then voice. Pilot with the AIIA IP cell, then nationwide.

**"Who will use it?"**
AYUSH startups and small companies, vaidyas, researchers, cultivators, and IP facilitators at AIIA. The Ministry of Ayush and the NBA can also use it to spot foreign patents on Indian knowledge.

---

## 10. Recording tips and troubleshooting

- **The first click may be slow (a few seconds).** The server "sleeps" when idle. Open the site and click something once before you start recording.
- **Use a laptop-sized window** (about 1280 to 1440 pixels wide). The chat then sits beside the page.
- **Reset between takes:** click **Start again** on Product check, and click **Today** if you changed the date. To clear the "What left your device" list and the chat, reload the page.
- **Zoom:** browser zoom at 110 to 125% makes text easier to read in the video.
- **If a screen shows an error box** ("The server could not complete this"), click **Try again**. It's usually the server waking up.
- **Mobile:** the site works on a phone too, which is worth one quick shot at the end.

---

*Ayushkar gives information, not legal advice. The licensing authority, patent office or NBA decides.*
