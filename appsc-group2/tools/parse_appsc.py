#!/usr/bin/env python3
"""parse_appsc.py — APPSC Group 2 PYQ ingestion (Phase: PYQ).

Turns an APPSC Group 2 question-paper PDF (+ optional answer key) into the
`pyq` structure the lab consumes, and merges it into ../data/syllabus.js so the
Practice tab (coverage / heatmap / quiz) unlocks automatically.

This is the sibling of gs-visualizer/tools/parse_pinnacle.py. APPSC papers are
plainer than the Pinnacle bank (flat numbered Q&A, four options, a separate key),
so this parser is lighter — but PDF layouts vary by year/vendor, so treat the
regexes as a starting point and tune `--debug` output against your actual file.

Dependencies (isolated venv recommended — the system crypto stack can be broken):
    python3 -m venv pdfvenv && ./pdfvenv/bin/pip install pdfminer.six
Usage:
    ./pdfvenv/bin/python parse_appsc.py PAPER.pdf \
        --exam "Group 2 Mains" --year 2025 \
        [--key KEY.pdf|--key-inline "1-a,2-c,3-b,..."] \
        [--stage Mains] [--write] [--debug]

Without --write it prints a summary + a JSON preview and writes nothing.
With --write it updates ../data/syllabus.js in place (a .bak is kept).

Mapping: each question is matched to a syllabus leaf topic by keyword overlap
against the syllabus tree. Low-confidence matches go to an `_unmapped` list in
the preview for manual placement — never silently misfiled.
"""
import argparse
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, "..", "data", "syllabus.js"))

# ---- stopwords for keyword mapping ----
STOP = set("the a an of in to and or for with on at by is are was were which who "
           "what when where how from as into about during between among following "
           "statement statements correct incorrect consider given below above "
           "year years first second third among these this that".split())


def extract_text(pdf_path):
    """Return the full text of the PDF using pdfminer.six."""
    try:
        from pdfminer.high_level import extract_text as _t
    except Exception:
        sys.exit("pdfminer.six not installed. See the header for the venv setup.")
    return _t(pdf_path)


# ---- answer-key parsing ----------------------------------------------------
def parse_key_inline(s):
    out = {}
    for tok in re.split(r"[,\s]+", s.strip()):
        m = re.match(r"(\d+)\s*[-:.]\s*([a-dA-D1-4])", tok)
        if m:
            out[int(m.group(1))] = norm_opt(m.group(2))
    return out


def parse_key_pdf(path):
    txt = extract_text(path)
    out = {}
    for m in re.finditer(r"(\d{1,3})\s*[-.):]\s*([A-Da-d1-4])\b", txt):
        out[int(m.group(1))] = norm_opt(m.group(2))
    return out


def norm_opt(ch):
    ch = ch.strip().lower()
    return {"1": "a", "2": "b", "3": "c", "4": "d"}.get(ch, ch)


# ---- question segmentation -------------------------------------------------
# Matches "1." / "1)" / "Q.1" / "Q 1)" at a line start.
Q_RE = re.compile(r"(?m)^\s*(?:Q\.?\s*)?(\d{1,3})[.)]\s+(.*)")
# Option markers: (A)/(1)/A)/1. — capture label + text up to the next marker.
OPT_RE = re.compile(r"(?:\(?([A-Da-d1-4])\)|\b([A-Da-d1-4])[.)])\s+")


def segment_questions(txt):
    """Yield dicts {n, q, o:{a..d}} from the paper text. Best-effort."""
    lines = [l.rstrip() for l in txt.splitlines()]
    # find question start indices
    starts = []
    for i, l in enumerate(lines):
        m = Q_RE.match(l)
        if m:
            starts.append((i, int(m.group(1)), m.group(2)))
    out = []
    for idx, (i, n, head) in enumerate(starts):
        end = starts[idx + 1][0] if idx + 1 < len(starts) else len(lines)
        block = head + "\n" + "\n".join(lines[i + 1:end])
        q, opts = split_options(block)
        if q:
            out.append({"n": n, "q": q.strip(), "o": opts})
    return out


def split_options(block):
    """Split a question block into stem + {a,b,c,d}. Returns (stem, opts)."""
    # Normalise whitespace but keep option boundaries detectable.
    parts = re.split(r"\n(?=\(?[A-Da-d1-4][).]\s)", block)
    stem = parts[0]
    opts = {}
    for p in parts[1:]:
        m = re.match(r"\(?([A-Da-d1-4])[).]\s*(.*)", p, re.S)
        if m:
            opts[norm_opt(m.group(1))] = " ".join(m.group(2).split())
    # keep only a..d
    opts = {k: v for k, v in opts.items() if k in ("a", "b", "c", "d")}
    return (" ".join(stem.split()), opts)


# ---- syllabus loading / keyword mapping ------------------------------------
def load_syllabus():
    with open(DATA, encoding="utf-8") as f:
        raw = f.read()
    m = re.search(r"window\.APPSC_G2\s*=\s*(\{.*\});\s*$", raw, re.S)
    if not m:
        sys.exit("Could not find `window.APPSC_G2 = {...};` in %s" % DATA)
    return raw, m.start(1), m.end(1), json.loads(m.group(1))


def tokens(s):
    return [w for w in re.findall(r"[a-z]+", s.lower()) if w not in STOP and len(w) > 2]


def build_topic_index(data, stage_filter=None):
    """Return list of (block_i, sec_i, top_i, topic_name, token_set)."""
    idx = []
    for bi, blk in enumerate(data["syllabus"]):
        if stage_filter and blk["stage"] != stage_filter:
            continue
        for si, sec in enumerate(blk["sections"]):
            base = set(tokens(sec["name"]))
            for ti, t in enumerate(sec["topics"]):
                idx.append((bi, si, ti, t["name"], base | set(tokens(t["name"]))))
    return idx


def best_match(qtext, idx):
    qt = set(tokens(qtext))
    best, score = None, 0
    for entry in idx:
        s = len(qt & entry[4])
        if s > score:
            score, best = s, entry
    return best, score


# ---- main ------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="APPSC Group 2 PYQ parser")
    ap.add_argument("pdf")
    ap.add_argument("--exam", required=True, help='e.g. "Group 2 Mains"')
    ap.add_argument("--year", type=int, required=True)
    ap.add_argument("--stage", choices=["Prelims", "Mains"], help="restrict mapping to one stage")
    ap.add_argument("--key", help="answer-key PDF")
    ap.add_argument("--key-inline", help='"1-a,2-c,3-b,..."')
    ap.add_argument("--min-score", type=int, default=1, help="min keyword overlap to auto-map")
    ap.add_argument("--write", action="store_true", help="merge into ../data/syllabus.js")
    ap.add_argument("--debug", action="store_true")
    args = ap.parse_args()

    txt = extract_text(args.pdf)
    qs = segment_questions(txt)
    key = {}
    if args.key_inline:
        key = parse_key_inline(args.key_inline)
    elif args.key:
        key = parse_key_pdf(args.key)

    if args.debug:
        print("Extracted %d question blocks (first 2):" % len(qs))
        for q in qs[:2]:
            print(json.dumps(q, ensure_ascii=False, indent=2)[:600])
        print("Answer key entries:", len(key))

    raw, a, b, data = load_syllabus()
    idx = build_topic_index(data, args.stage)

    mapped = 0
    unmapped = []
    # ensure pyq slots exist
    for q in qs:
        q["a"] = key.get(q["n"])
        q["ex"] = args.exam
        q["y"] = args.year
        entry, score = best_match(q["q"], idx)
        if entry and score >= args.min_score:
            bi, si, ti, _name, _tok = entry
            t = data["syllabus"][bi]["sections"][si]["topics"][ti]
            pyq = t.setdefault("pyq", {"count": 0, "years": {}, "exams": {}, "items": []})
            item = {"q": q["q"], "o": q["o"], "a": q["a"], "s": "", "ex": q["ex"], "y": q["y"]}
            pyq["items"].append(item)
            pyq["count"] = len(pyq["items"])
            pyq["years"][str(q["y"])] = pyq["years"].get(str(q["y"]), 0) + 1
            pyq["exams"][q["ex"]] = pyq["exams"].get(q["ex"], 0) + 1
            mapped += 1
        else:
            unmapped.append({"n": q["n"], "q": q["q"][:90], "best": entry[3] if entry else None, "score": score})

    print("\n=== APPSC parse summary ===")
    print("questions parsed : %d" % len(qs))
    print("with 4 options   : %d" % sum(1 for q in qs if len(q["o"]) == 4))
    print("with answer key  : %d" % sum(1 for q in qs if q.get("a")))
    print("auto-mapped      : %d" % mapped)
    print("unmapped         : %d  (listed below for manual placement)" % len(unmapped))
    for u in unmapped[:20]:
        print("  Q%-3s score=%s  %s" % (u["n"], u["score"], u["q"]))

    if not args.write:
        print("\n(dry run — pass --write to merge into %s)" % os.path.relpath(DATA))
        return

    new_json = json.dumps(data, ensure_ascii=False, indent=2)
    with open(DATA + ".bak", "w", encoding="utf-8") as f:
        f.write(raw)
    with open(DATA, "w", encoding="utf-8") as f:
        f.write(raw[:a] + new_json + raw[b:])
    print("\nWrote %s (backup at %s.bak). Reload the lab — Practice is now unlocked."
          % (os.path.relpath(DATA), os.path.relpath(DATA)))


if __name__ == "__main__":
    main()
