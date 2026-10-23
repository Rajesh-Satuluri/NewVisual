#!/usr/bin/env python3
"""Aggregate classified.json -> ../data/pyq.js (window.APPSC_PYQ).

Honest data model:
- `declared` counts are EXACT, taken from each paper's own printed section header.
- `captured` counts are what OCR+segmentation recovered (capture rate shown), so
  within-section sub-theme figures are OBSERVED proportions, not official splits.
"""
import json, os, re
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
cl = json.load(open(os.path.join(HERE, "pyq_txt", "classified.json")))

INSTR = re.compile(r'Test Booklet|Question Paper is|Question Booklet|Rough work|Registered Number'
                   r'|printed in four|Series is printed|Answer Sheet|Invigilator|Each question carries',
                   re.I)

def clean_stem(s):
    """Keep the leading English clause; stop at the first Telugu/OCR-noise token."""
    s = re.sub(r'\s+', ' ', s).strip()
    out = []
    for tok in s.split(' '):
        asc = sum(c.isalpha() and ord(c) < 128 for c in tok)
        if tok and len(tok) > 1 and asc / len(tok) < 0.5:
            break
        out.append(tok)
    r = ' '.join(out).strip(' |,-')
    return r[:120]

# drop instruction rows that leaked into segmentation
for key in list(cl):
    cl[key] = [r for r in cl[key] if not INSTR.search(r["stem"])]

PAPERS = {
 "2024-prelims": {"label":"Prelims 2024","stage":"Prelims","date":"25 Feb 2024","total":150,
    "declared":[("Indian History",30),("Geography",30),("Indian Society",30),
                ("Current Affairs",30),("Mental Ability",30)]},
 "2019-prelims": {"label":"Prelims 2019","stage":"Prelims","date":"5 May 2019","total":150,
    "declared":[("General Studies",None),("Mental Ability",None),("AP History & Culture",None),
                ("Indian Constitution",None),("Planning & Economy",50)],
    "declared_groups":[("Section A · GS + Mental Ability",50),
                       ("Section B · AP History + Constitution",50),
                       ("Section C · Planning & Economy",50)]},
 "2025-mains-p1": {"label":"Mains 2025 · Paper-I","stage":"Mains","date":"23 Feb 2025","total":150,
    "declared":[("AP Social & Cultural History",75),("Indian Constitution (all Const. sections)",75)],
    "sideA":["AP Social & Cultural History","Colonial & Nationalist Andhra","Andhra Movement & State Formation"],
    "sideB":["Nature & Features of the Constitution","Rights, Duties & Principles","Union & State Government",
             "Constitutional Dynamics","Constitutional & Local Bodies"]},
 "2025-mains-p2": {"label":"Mains 2025 · Paper-II","stage":"Mains","date":"23 Feb 2025","total":150,
    "declared":[("Indian & AP Economy",75),("Science & Technology",75)],
    "sideA":["Structure, National Income & Planning","Money, Banking & Public Finance",
             "Agriculture, Industry & Services","Development & Social Sector","Andhra Pradesh Economy"],
    "sideB":["S&T Policy & Space","Energy & Strategic Technology","ICT & Emerging Technology",
             "Life Sciences & Health","Environment & Disaster"]},
}

out = {"generated":"2026-10-13","note":"declared = exact (from each paper's printed section header); "
       "captured = recovered by OCR+segmentation; sub-theme figures are observed proportions, not official splits.",
       "papers":[]}

for key, meta in PAPERS.items():
    rows = cl[key]
    captured = len(rows)
    secCount = Counter(r["section"] for r in rows)
    paper = {"id":key,"label":meta["label"],"stage":meta["stage"],"date":meta["date"],
             "total":meta["total"],"captured":captured,
             "captureRate":round(captured/meta["total"],2)}
    # section-level observed
    secs = []
    for name, cnt in secCount.most_common():
        exs = []
        for r in rows:
            if r["section"]==name:
                c = clean_stem(r["stem"])
                if len(c) > 18 and c not in [e["stem"] for e in exs]:
                    exs.append({"stem":c})
            if len(exs)>=3: break
        secs.append({"name":name,"captured":cnt,"examples":exs})
    paper["sections"] = secs
    # mains: group into the two declared halves
    if meta["stage"]=="Mains":
        halves=[]
        for half,label,decl in [("sideA",meta["declared"][0][0],75),("sideB",meta["declared"][1][0],75)]:
            names=meta[half]
            tot=sum(secCount.get(n,0) for n in names)
            subs=[{"name":n,"captured":secCount.get(n,0)} for n in names if secCount.get(n,0)]
            subs.sort(key=lambda x:-x["captured"])
            halves.append({"half":label,"declared":decl,"captured":tot,"subthemes":subs})
        paper["halves"]=halves
    if "declared_groups" in meta:
        paper["declaredGroups"]=[{"name":n,"declared":d} for n,d in meta["declared_groups"]]
    out["papers"].append(paper)

# cross-paper aggregate: top syllabus areas by captured count
agg = Counter()
for key in PAPERS:
    for r in cl[key]:
        agg[(cl[key][0]["block"] if False else r["section"])] += 1
out["topAreas"] = [{"area":a,"count":c} for a,c in agg.most_common()]

js = "/* APPSC Group 2 — previous-year-question frequency analysis.\n" \
     "   Built from 4 official papers (2019 & 2024 Prelims, 2025 Mains I & II) via OCR.\n" \
     "   declared = exact section counts from each paper's header; captured = OCR-recovered. */\n" \
     "window.APPSC_PYQ = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n"
open(os.path.join(HERE,"..","data","pyq.js"),"w",encoding="utf-8").write(js)
print("wrote data/pyq.js :", len(out["papers"]), "papers,", sum(p["captured"] for p in out["papers"]), "questions captured")
for p in out["papers"]:
    print(" ", p["label"], "cap", p["captured"], "/", p["total"])
