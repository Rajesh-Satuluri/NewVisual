#!/usr/bin/env python3
"""Parse the Pinnacle "SSC General Studies 6500+ TCS MCQs" PDF into the data files
that the GS Airflow lab consumes.

The PDF is laid out consistently:
  * 3 columns  (x0 ~ 20 / 220 / 400 on a 596pt-wide page); reading order is
    column left->right, then top->bottom, then left->right within a line.
  * Topic hierarchy is encoded in font size, all Times-Bold:
        16pt -> Subject      14pt -> Section      12pt -> Sub-topic (leaf)
  * Question / options / solution body is 9pt Roboto.
  * Every question carries an exam line like  "SSC CGL 03/12/2022 (3rd Shift)".

Only History (pages 2-79) is validated and shipped today. The other subjects use
the same template, so add them to SUBJECTS and validate the counts before shipping.

Usage:
    python parse_pinnacle.py "/path/to/Pinnacle.pdf" [subject]
    # writes ../data/<subject>.js  (default subject: history)

Requires: pdfminer.six   (pip install pdfminer.six)
"""
import re, json, sys, os, collections
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextContainer, LTChar

# subject -> (first_page, last_page) 1-indexed as in the PDF
SUBJECTS = {
    "history":   (2, 79),
    # "polity":    (80, 127),   # add + validate
    # "geography": (128, 205),
    # "economics": (206, 249),
    # "physics":   (250, 271),
    # "chemistry": (272, 312),
    # "biology":   (313, 362),
}
TITLE = {"history": "History"}

LIG = {"ﬁ":"fi","ﬂ":"fl","ﬀ":"ff","ﬃ":"ffi","ﬄ":"ffl","’":"'","‘":"'","“":'"',"”":'"',"–":"-","—":"-"}
def clean(s):
    for k, v in LIG.items(): s = s.replace(k, v)
    return re.sub(r"\s+", " ", s).strip()
def column(x0): return 0 if x0 < 195 else 1 if x0 < 390 else 2

EXAM_KEYS = ("SSC", "Matric", "Havaldar", "Delhi Police", "Police", "Constable")
date_re = re.compile(r"\b\d{1,2}/\d{1,2}/(\d{4})\b")
exam_line_re = re.compile(r"^(.*?)\s*(\d{1,2}/\d{1,2}/\d{4})\s*(\(.*?\))?\s*$")
q_start_re = re.compile(r"^Q\.?\s*(\d+)\s*\.")
sol_start_re = re.compile(r"^Sol\.?\s*(\d+)\s*\.?\s*\(?([a-dA-D])?\)?")
opt_re = re.compile(r"\(([a-d])\)")
def is_exam_line(t): return bool(date_re.search(t)) and any(k in t for k in EXAM_KEYS)
def norm_exam(e):
    if not e: return None
    e = re.sub(r"[\s,]*\b(19|20)\d{2}\b.*$", "", e)
    e = re.sub(r"Tier[\s-]*(2|II)", "Tier II", e, flags=re.I)
    return re.sub(r"\s+", " ", e).strip(" ,-") or None


def extract_lines(pdf, first, last):
    lines = []
    for pi in range(first - 1, last):
        for page in extract_pages(pdf, page_numbers=[pi]):
            rows = []
            for el in page:
                if not isinstance(el, LTTextContainer): continue
                for ln in el:
                    chars = [c for c in ln if isinstance(c, LTChar)]
                    if not chars: continue
                    sz = sum(c.size for c in chars) / len(chars)
                    rows.append((column(ln.x0), -round(ln.y0), round(ln.x0), round(sz, 1),
                                 chars[0].fontname, ln.get_text().strip()))
            rows.sort(key=lambda r: (r[0], r[1], r[2]))
            merged = []
            for col, ny, x0, sz, fn, txt in rows:
                if not txt: continue
                if merged and merged[-1][0] == col and merged[-1][1] == ny and abs(merged[-1][3] - sz) < 0.6:
                    merged[-1][5] += " " + txt
                else:
                    merged.append([col, ny, x0, sz, fn, txt])
            for col, ny, x0, sz, fn, txt in merged:
                bold = "Bold" in fn
                if "Roboto" in fn: lines.append(("body", txt))
                elif bold and sz >= 15.0: lines.append(("subject", txt))
                elif bold and sz >= 13.0: lines.append(("section", txt))
                elif bold and sz >= 11.5: lines.append(("subtopic", txt))
    return lines


def build(lines):
    state = {"section": None, "subtopic": None}
    questions, buf, cur = [], [], [None]

    def flush():
        if not buf or cur[0] is None: buf.clear(); return
        exam = year = shift = ans = None
        stem, opts, sol = [], {}, []
        mode = "stem"
        for raw in buf:
            t = clean(raw)
            if not t: continue
            ms = sol_start_re.match(t)
            if ms:
                mode = "sol"; ans = (ms.group(2) or "").lower() or None
                rest = t[ms.end():].strip(" .)")
                if rest: sol.append(rest)
                continue
            if mode != "sol" and is_exam_line(t):
                m = exam_line_re.match(t)
                if m:
                    exam = norm_exam(clean(m.group(1))); year = int(date_re.search(t).group(1))
                    shift = (m.group(3) or "").strip("()") or None
                mode = "opts"; continue
            if mode == "sol": sol.append(t); continue
            if opt_re.search(t) and mode in ("opts", "stem"):
                mode = "opts"
                p = re.split(r"\(([a-d])\)", t); j = 1
                while j < len(p) - 1:
                    v = clean(p[j + 1])
                    if v: opts[p[j]] = v
                    j += 2
                continue
            if mode == "stem": stem.append(t)
            elif opts:
                last = sorted(opts)[-1]; opts[last] = (opts[last] + " " + t).strip()
        q = {"n": cur[0], "section": state["section"], "subtopic": state["subtopic"],
             "stem": clean(" ".join(stem)), "options": opts, "answer": ans,
             "solution": clean(" ".join(sol)), "exam": exam, "year": year, "shift": shift}
        if q["stem"]: questions.append(q)
        buf.clear()

    for kind, txt in lines:
        if kind == "subject": flush()
        elif kind == "section": flush(); state["section"] = clean(txt); state["subtopic"] = None
        elif kind == "subtopic": flush(); state["subtopic"] = clean(txt)
        else:
            m = q_start_re.match(clean(txt))
            if m: flush(); cur[0] = int(m.group(1)); buf.append(clean(txt)[m.end():].strip())
            else: buf.append(txt)
    flush()

    # merge orphan stubs (fragment with no options) into the next question
    out, i = [], 0
    while i < len(questions):
        q = questions[i]; nxt = questions[i + 1] if i + 1 < len(questions) else None
        if (len(q["options"]) < 4 or not q["answer"]) and nxt and nxt["subtopic"] == q["subtopic"] \
           and (nxt["stem"][:1].islower() or len(q["stem"]) < 25) and len(nxt["options"]) >= 3:
            nxt["stem"] = clean(q["stem"] + " " + nxt["stem"])
            if not nxt["exam"] and q["exam"]:
                nxt["exam"], nxt["year"], nxt["shift"] = q["exam"], q["year"], q["shift"]
            i += 1; continue
        out.append(q); i += 1
    return out


def main():
    pdf = sys.argv[1] if len(sys.argv) > 1 else "SSC General Studies 6500+ TCS MCQs -- Pinnacle -- ( WeLib.org ).pdf"
    subj = (sys.argv[2] if len(sys.argv) > 2 else "history").lower()
    if subj not in SUBJECTS: sys.exit(f"unknown subject {subj}; known: {list(SUBJECTS)}")
    first, last = SUBJECTS[subj]
    qs = build(extract_lines(pdf, first, last))

    sec_order, sub = [], collections.OrderedDict()
    for q in qs:
        s = q["section"] or "Miscellaneous"; st = q["subtopic"] or "General"
        if s not in sub: sub[s] = collections.OrderedDict(); sec_order.append(s)
        sub[s][st] = sub[s].get(st, 0) + 1
    sections = [{"name": s, "subtopics": [{"name": st, "count": c} for st, c in sub[s].items()]} for s in sec_order]
    questions = [{"id": i, "n": q["n"], "sec": q["section"] or "Miscellaneous", "st": q["subtopic"] or "General",
                  "q": q["stem"], "o": q["options"], "a": q["answer"], "s": q["solution"],
                  "ex": q["exam"], "y": q["year"], "sh": q["shift"]} for i, q in enumerate(qs)]
    data = {"subject": TITLE.get(subj, subj.title()), "source": "Pinnacle SSC GS 6500+ TCS MCQs",
            "sections": sections, "questions": questions}

    out_path = os.path.join(os.path.dirname(__file__), "..", "data", subj + ".js")
    var = "GS_" + subj.upper()
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("window.%s = " % var)
        json.dump(data, f, ensure_ascii=False, separators=(",", ":")); f.write(";\n")
    print(f"{subj}: {len(questions)} questions, {len(sections)} sections -> {os.path.relpath(out_path)}")
    print("  with 4 options:", sum(1 for q in questions if len(q["o"]) == 4),
          " with answer:", sum(1 for q in questions if q["a"]))


if __name__ == "__main__":
    main()
