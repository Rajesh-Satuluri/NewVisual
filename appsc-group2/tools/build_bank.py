#!/usr/bin/env python3
"""Build data/pyq_bank.js from the clean column-aware parse (pyq_txt/questions.json).

Each item: {n, q (stem), o (4 options, only when cleanly recovered)}.
Answers are never shown (no official keys supplied). Stems come from the English
column of the scans; options are included only when all four read as clean English.
"""
import json, os
from collections import OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
Q = json.load(open(os.path.join(HERE, "pyq_txt", "questions.json")))

PAPERS = [
    ("2025-mains-p1", "Mains 2025 · Paper-I", "23 Feb 2025", "Mains"),
    ("2025-mains-p2", "Mains 2025 · Paper-II", "23 Feb 2025", "Mains"),
    ("2024-prelims",  "Prelims 2024", "25 Feb 2024", "Prelims"),
    ("2019-prelims",  "Prelims 2019", "5 May 2019", "Prelims"),
]

bank = {
    "generated": "2026-10-14",
    "note": "Question text transcribed by column-aware OCR from the official scanned "
            "papers (English side). Options are shown only where all four read as clean "
            "English; where the bilingual scan did not yield reliable options they are "
            "omitted. Answers are not shown (official answer keys not yet supplied). "
            "Minor OCR artefacts may remain — a topic reference, not a verbatim reprint.",
    "papers": [],
}

withopt = 0
for pid, label, date, stage in PAPERS:
    bysec = OrderedDict()
    for r in Q[pid]:
        stem = r["stem"].strip()
        if len(stem) < 12:
            continue
        item = {"n": r["n"], "q": stem}
        if r.get("options") and len(r["options"]) == 4:
            item["o"] = r["options"]
            withopt += 1
        bysec.setdefault(r["section"], []).append(item)
    secs = []
    for name, items in bysec.items():
        items.sort(key=lambda x: x["n"])
        secs.append({"name": name, "count": len(items), "items": items})
    secs.sort(key=lambda s: -s["count"])
    bank["papers"].append({"id": pid, "label": label, "date": date, "stage": stage,
                           "total": sum(s["count"] for s in secs), "sections": secs})

js = ("/* APPSC Group 2 — extracted PYQ bank (column-aware OCR). Stems reliable;\n"
      "   options shown only when all four read cleanly; no answer keys supplied. */\n"
      "window.APPSC_BANK = " + json.dumps(bank, ensure_ascii=False, indent=1) + ";\n")
open(os.path.join(HERE, "..", "data", "pyq_bank.js"), "w", encoding="utf-8").write(js)

tot = sum(p["total"] for p in bank["papers"])
print("wrote data/pyq_bank.js :", tot, "questions,", withopt, "with options")
for p in bank["papers"]:
    print("  %-22s %3d questions in %d sections" % (p["label"], p["total"], len(p["sections"])))
