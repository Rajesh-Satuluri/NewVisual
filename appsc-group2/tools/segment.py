#!/usr/bin/env python3
"""Segment OCR'd bilingual APPSC papers into numbered questions with English stems.

Robust method: scan for each EXPECTED question number 1..N in document order.
For number n, among the forward candidate lines "n." / "n)", pick the first whose
following block carries >=2 option markers (1)(2)(3)(4) — this rejects the
instruction block (no 4-options) and OCR-noise numbers (years, page nos).
"""
import re, json, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
NQ = {"2024-prelims": 150, "2019-prelims": 150, "2025-mains-p1": 150, "2025-mains-p2": 150}

def english_ratio(s):
    letters = sum(c.isalpha() and ord(c) < 128 for c in s)
    nonsp = sum(not c.isspace() for c in s)
    return letters / nonsp if nonsp else 0

OPT = re.compile(r'\(?([1-4])[).]')

def count_opts(block):
    seen = set()
    for m in OPT.finditer(block):
        seen.add(m.group(1))
    return len(seen)

def find_anchors(txt, nq):
    """Collect every line-start numbered marker (1..nq+10), then take the
    longest strictly-increasing-by-value subsequence in document order. The
    real exam 1..150 is by far the longest such run, so instruction numbers
    (1..~16) and OCR-noise numbers fall away."""
    marks = []  # (pos, num)
    for m in re.finditer(r'(?m)^\s*(\d{1,3})[).]\s+(\S.*)', txt):
        num = int(m.group(1))
        if 1 <= num <= nq + 5:
            marks.append((m.start(), num))
    # LIS by value over position order
    n = len(marks)
    if not n:
        return {}
    dp = [1] * n
    prev = [-1] * n
    for i in range(n):
        for j in range(i):
            if marks[j][1] < marks[i][1] and dp[j] + 1 > dp[i]:
                dp[i] = dp[j] + 1; prev[i] = j
    end = max(range(n), key=lambda i: dp[i])
    seq = []
    while end != -1:
        seq.append(end); end = prev[end]
    seq.reverse()
    return {marks[i][1]: marks[i][0] for i in seq}

def clean(block, n):
    lines = []
    for l in block.splitlines():
        s = l.strip()
        if not s: continue
        if re.search(r'testbook|Google Play|GET IT ON|<<<PAGE|GS/2G|^Page \d+|^\d{8}$', s, re.I):
            continue
        if english_ratio(s) >= 0.55 or re.match(r'^\(?[1-4][).]', s):
            lines.append(s)
    joined = " ".join(lines)
    joined = re.sub(r'^\s*%d[).]\s*' % n, '', joined)
    joined = re.sub(r'\s+', ' ', joined)
    # split stem vs options
    parts = re.split(r'\(([1-4])\)\s*', joined)
    stem, opts = joined, {}
    if len(parts) >= 3:
        stem = parts[0]
        for i in range(1, len(parts) - 1, 2):
            opts[parts[i]] = parts[i + 1].strip()
    return stem.strip(), opts

def segment(name):
    txt = open(os.path.join(HERE, "pyq_txt", name + ".txt"), encoding="utf-8").read()
    nq = NQ[name]
    anchors = find_anchors(txt, nq)
    ordered = sorted(anchors.items())
    INSTR = re.compile(r'check the (Test Booklet|Question Paper)|Booklet contains|Question Paper contains'
                       r'|Use Blue or Black|DO NOT|OMR Answer Sheet|Invigilator|Series', re.I)
    qs = []
    for i, (n, start) in enumerate(ordered):
        end = ordered[i + 1][1] if i + 1 < len(ordered) else min(start + 1400, len(txt))
        stem, opts = clean(txt[start:end], n)
        if INSTR.search(stem) and len(opts) < 2:   # drop instruction rows
            continue
        qs.append({"n": n, "stem": stem, "opts": opts})
    return qs, nq

if __name__ == "__main__":
    name = sys.argv[1]
    qs, nq = segment(name)
    found = {q["n"] for q in qs}
    missing = [i for i in range(1, nq + 1) if i not in found]
    print("PAPER %s : %d/%d questions. missing=%d %s" %
          (name, len(qs), nq, len(missing), missing[:30]))
    json.dump(qs, open(os.path.join(HERE, "pyq_txt", name + ".seg.json"), "w"), ensure_ascii=False, indent=1)
    for q in qs[:2] + qs[-1:]:
        print(" Q%d: %s" % (q["n"], q["stem"][:140]))
