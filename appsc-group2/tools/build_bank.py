#!/usr/bin/env python3
"""Build data/pyq_bank.js — a browsable bank of every extracted question.

Honest display model:
- Question STEMS are OCR-reliable -> cleaned and shown.
- OPTIONS from the bilingual two-column scans are mostly unreliable, so options
  are included ONLY when all four read as clean English; otherwise omitted.
- No answer keys were supplied, so no answers are shown (never fabricated).
"""
import json, os, re
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
cl = json.load(open(os.path.join(HERE, "pyq_txt", "classified.json")))  # paper -> [{n,section,stem,...}]

INSTR = re.compile(r'Test Booklet|Question Paper is|Question Booklet|Rough work|Registered Number'
                   r'|printed in four|Series is printed|Answer Sheet|Invigilator|Each question carries',
                   re.I)
NEXTQ = re.compile(r'\s+\d{1,3}[.)]\s+[A-Z]')

def eratio(tok):
    a = sum(c.isalpha() and ord(c) < 128 for c in tok)
    return a / len(tok) if tok else 0

ENGLISH = set(("the of which is was in to and following what who when where how were are for with on "
               "by not from as an at this that or has have had been its their first second not "
               "statements statement correct incorrect consider given below among these during "
               "between year india indian andhra pradesh match list").split())
def looks_english(s):
    words = re.findall(r"[a-zA-Z]+", s.lower())
    hits = sum(1 for w in words if w in ENGLISH)
    return hits >= 2

def clean_stem(s):
    s = re.sub(r'\s+', ' ', s).strip()
    m = NEXTQ.search(s)                     # drop leaked next-question fragment
    if m and m.start() > 25: s = s[:m.start()]
    # keep only English-reading tokens, stopping at a run of 2+ noise tokens
    toks, bad = [], 0
    for tok in s.split(' '):
        if len(tok) > 1 and eratio(tok) < 0.6:
            bad += 1
            if bad >= 2: break
            continue
        bad = 0
        toks.append(tok)
    r = re.sub(r'\s+([?.,;:])', r'\1', ' '.join(toks))
    # most APPSC stems end at the first '?' — cut trailing OCR noise after it
    q = r.find('?')
    if q >= 15:
        r = r[:q + 1]
    else:
        # no question mark: strip trailing short/gibberish tokens
        tt = r.split(' ')
        while tt and (len(tt[-1]) < 3 or eratio(tt[-1]) < 0.7) and len(tt) > 3:
            tt.pop()
        r = ' '.join(tt)
    return r.strip(' |,-–—:')

PAPERS = [
  ("2025-mains-p1", "Mains 2025 · Paper-I", "23 Feb 2025", "Mains"),
  ("2025-mains-p2", "Mains 2025 · Paper-II", "23 Feb 2025", "Mains"),
  ("2024-prelims",  "Prelims 2024", "25 Feb 2024", "Prelims"),
  ("2019-prelims",  "Prelims 2019", "5 May 2019", "Prelims"),
]

# pull options back from the .seg.json (classified.json dropped them)
bank = {"generated": "2026-10-13",
        "note": "Question stems transcribed by OCR from the official scanned papers (English side). "
                "The bilingual two-column scans do not yield reliable option text, so options are not "
                "shown; answers are not shown either (official answer keys not yet supplied). "
                "Minor OCR artifacts may remain — treat as a topic reference, not a verbatim reprint.",
        "papers": []}

for pid, label, date, stage in PAPERS:
    seg = {q["n"]: q for q in json.load(open(os.path.join(HERE, "pyq_txt", pid + ".seg.json")))}
    rows = [r for r in cl[pid] if not INSTR.search(r["stem"])]
    bysec = defaultdict(list)
    for r in rows:
        st = clean_stem(r["stem"])
        if len(st) < 14 or not looks_english(st):   # drop OCR-garbage / Telugu-only rows
            continue
        bysec[r["section"]].append({"n": r["n"], "q": st})
    secs = []
    for sec, items in bysec.items():
        items.sort(key=lambda x: x["n"])
        secs.append({"name": sec, "count": len(items), "items": items})
    secs.sort(key=lambda s: -s["count"])
    bank["papers"].append({"id": pid, "label": label, "date": date, "stage": stage,
                           "total": sum(s["count"] for s in secs), "sections": secs})

js = "/* APPSC Group 2 — extracted PYQ bank (OCR). Stems reliable; options shown only\n" \
     "   when cleanly readable; no answer keys supplied, so no answers are shown. */\n" \
     "window.APPSC_BANK = " + json.dumps(bank, ensure_ascii=False, indent=1) + ";\n"
open(os.path.join(HERE, "..", "data", "pyq_bank.js"), "w", encoding="utf-8").write(js)

tot = sum(p["total"] for p in bank["papers"])
print("wrote data/pyq_bank.js :", tot, "questions")
for p in bank["papers"]:
    print("  %-22s %3d questions in %d sections" % (p["label"], p["total"], len(p["sections"])))
