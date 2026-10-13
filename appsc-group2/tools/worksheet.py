#!/usr/bin/env python3
"""Print a compact classification worksheet: n | section(by range) | english stem."""
import json, re, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))

# section-by-question-range, from each paper's own printed declaration
RANGES = {
 "2024-prelims": [(1,30,"A:IndianHistory"),(31,60,"B:Geography"),(61,90,"C:IndianSociety"),
                  (91,120,"D:CurrentAffairs"),(121,150,"E:MentalAbility")],
 "2019-prelims": [(1,50,"A:GS+MentalAbility"),(51,100,"B:APHistory+Constitution"),
                  (101,150,"C:Planning+Economy")],
 "2025-mains-p1":[(1,75,"A:APSocCultHistory"),(76,150,"B:IndianConstitution")],
 "2025-mains-p2":[(1,75,"A:Indian+APEconomy"),(76,150,"B:ScienceTech")],
}

def sec(name, n):
    for a,b,s in RANGES[name]:
        if a<=n<=b: return s
    return "?"

def eng(s):
    # keep ascii english-ish fragment: cut at first long telugu run
    s=re.sub(r'\s+',' ',s)
    # drop non-ascii-heavy tail: keep up to where 6+ consecutive non-ascii/odd appear
    out=[]
    for tok in s.split(' '):
        asc=sum(c.isalpha() and ord(c)<128 for c in tok)
        if tok and asc/max(len(tok),1) < 0.4 and len(tok)>1:
            break
        out.append(tok)
    r=' '.join(out)
    return r[:180]

name=sys.argv[1]
qs=json.load(open(os.path.join(HERE,"pyq_txt",name+".seg.json")))
for q in qs:
    print("%3d | %-26s | %s" % (q["n"], sec(name,q["n"]), eng(q["stem"])))
