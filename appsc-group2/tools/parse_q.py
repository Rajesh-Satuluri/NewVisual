#!/usr/bin/env python3
"""Parse clean (column-aware) OCR into structured questions: {n, section, stem, options}.

Layouts:
  Prelims (2024, 2019): side-by-side columns, English LEFT -> pyq_txt/<pid>.left.txt
  Mains  (p1, p2):      single column, English block THEN Telugu block -> <pid>.full.txt

For each question we keep the English text up to the Telugu repeat as the stem,
and best-effort recover the four options. Options are emitted ONLY when a clean
set of four readable English options is recovered; otherwise options=[] (honest:
the bilingual scans do not always yield reliable option text). Output: questions.json
"""
import os, re, json

HERE = os.path.dirname(os.path.abspath(__file__))
TXT = os.path.join(HERE, "pyq_txt")

PAPERS = [
    ("2025-mains-p1", "full", "Mains"),
    ("2025-mains-p2", "full", "Mains"),
    ("2024-prelims",  "left", "Prelims"),
    ("2019-prelims",  "left", "Prelims"),
]
RANGES = {
    "2024-prelims": [(1,30,"Indian History"),(31,60,"Geography"),(61,90,"Indian Society"),
                     (91,120,"Current Affairs"),(121,150,"Mental Ability")],
    "2019-prelims": [(1,50,"General Studies & Mental Ability"),
                     (51,100,"AP History, Culture & Constitution"),
                     (101,150,"Planning & Economy")],
    "2025-mains-p1":[(1,75,"AP Social & Cultural History"),(76,150,"Indian Constitution")],
    "2025-mains-p2":[(1,75,"Indian & AP Economy"),(76,150,"Science, Tech & Environment")],
}
def section_of(pid, n):
    for a,b,s in RANGES[pid]:
        if a<=n<=b: return s
    return "Unknown"

def ascii_ratio(s):
    letters = [c for c in s if c.isalpha()]
    return sum(ord(c)<128 for c in letters)/len(letters) if letters else 0.0

INSTR = re.compile(r'Test Booklet|Question Paper is set|Answer Sheet|Invigilator|OMR|Ball point'
                   r'|Series is printed|Rough work|Registered Number|answer choices|G\.O\. Ms'
                   r'|Examination Hall|Each question carries|GET IT ?ON|Google Play|testbook'
                   r'|is set in English|valuation purpose|www\.|^Page \d|^Codes', re.I)
# a parsed "question" that is really an instruction / booklet-structure header
DROP = re.compile(r'contains 150 questions|Section [A-E] ?\(|attempts? to use any means'
                  r'|liable for prosecution|cheat/cop|Question Paper contains', re.I)

def tidy(s):
    s = s.replace('’',"'").replace('‘',"'").replace('“','"').replace('”','"')
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def clean_stem(s):
    s = tidy(s)
    # drop leaked next-question marker and right-column bleed: " | 7." / " 7." near end
    s = re.sub(r'\s*\|\s*\d{1,3}\.?\s*$', '', s)
    s = re.sub(r'\s+\d{1,3}\.\s*$', '', s)
    # strip stray right-column question-numbers that bleed mid/end ("belong to 38.")
    s = re.sub(r'\s+\d{1,3}\.(?=\s|$)', ' ', s)
    s = s.replace('|', ' ')
    s = re.sub(r'\s+', ' ', s).strip(' .|,-–—')
    # APPSC stems almost always end at the first '?' — cut trailing bleed after it
    q = s.find('?')
    if q >= 20:
        s = s[:q+1]
    return s.strip()

VOWEL = re.compile(r'[aeiouAEIOU]')
def is_garbage_tok(t):
    core = t.strip(".,;:'\"()-/")
    if not core: return False
    if re.search(r'[A-Za-z]\d|\d[A-Za-z]', core): return True      # H48B, G684o5
    if len(core) >= 4 and not VOWEL.search(core): return True       # consonant blob
    if len(core) >= 4 and core.isupper(): return True               # GSSOS, DO/ND (OCR'd Telugu)
    if len(core) >= 5 and sum(c.isupper() for c in core[1:]) >= 2 and not core.isupper():
        return True                                                 # mIxEdCaSe garbage
    return False

def trim_english(txt):
    """Keep leading tokens until a romanized-Telugu/garbage token begins."""
    toks = txt.split()
    out = []
    for t in toks:
        if is_garbage_tok(t):
            break
        out.append(t)
    return " ".join(out).strip(' ."|_-')

def looks_wordlike(s):
    words = [w for w in re.findall(r"[A-Za-z]+", s) if len(w) >= 2 and VOWEL.search(w)]
    return len(words) >= 1

OPTSPLIT = re.compile(r'(?<![A-Za-z0-9])\(?([1-4])\)\s+')
def extract_options(eng_text):
    """Find (1)..(4)/1)..4) markers in order and split text between them.
    Returns a list of 4 clean English options, or [] if not cleanly recovered."""
    marks = [(m.start(), int(m.group(1)), m.end()) for m in OPTSPLIT.finditer(eng_text)]
    # want the first ascending 1,2,3,4 run
    seq = []
    expect = 1
    for pos, num, end in marks:
        if num == expect:
            seq.append((pos, end)); expect += 1
            if expect == 5: break
    if len(seq) != 4:
        return []
    opts = []
    for i,(pos,end) in enumerate(seq):
        stop = seq[i+1][0] if i+1 < len(seq) else len(eng_text)
        txt = eng_text[end:stop]
        # 4th option runs to end -> cut trailing next-question / column bleed
        txt = re.sub(r'\s*\|.*$', '', txt)
        txt = re.sub(r'\s+\d{1,3}\.\s+\S.*$', '', txt)   # " 6. Which one of..."
        txt = re.split(r'[^\x00-\x7f]', txt)[0]           # cut at first non-ASCII (Telugu)
        txt = re.split(r'\s+\d{3,}', txt)[0]              # cut at first 3+ digit run (808, page no)
        txt = trim_english(tidy(txt))
        txt = re.sub(r'[\s0-9,~._|:\-]+$', '', txt)      # trailing page/next-q bleed
        if not txt or ascii_ratio(txt) < 0.85 or not looks_wordlike(txt):
            return []
        opts.append(txt)
    return opts

def is_qnum(line):
    m = re.match(r'^(\d{1,3})[.)]\s+(\S.*)$', line)
    if not m: return None
    n = int(m.group(1))
    return (n, m.group(2).strip()) if 1 <= n <= 150 else None

def is_optline(line, fmt):
    pat = r'^\(?([1-4])\)\s+' if fmt == "full" else r'^\(([1-4])\)\s+'
    return re.match(pat, line) is not None

def lis_keep(vals):
    N = len(vals)
    if not N: return []
    best=[1]*N; prev=[-1]*N
    for i in range(N):
        for j in range(i):
            if vals[j] < vals[i] and best[j]+1 > best[i]:
                best[i]=best[j]+1; prev[i]=j
    e=max(range(N), key=lambda i: best[i]); keep=[]
    while e!=-1: keep.append(e); e=prev[e]
    return sorted(keep)

def parse(pid, fmt):
    raw = open(os.path.join(TXT, pid + "." + fmt + ".txt"), encoding="utf-8").read()
    clean = []
    for ln in raw.splitlines():
        s = ln.strip()
        if not s or s.startswith("<<<PAGE") or INSTR.search(s): continue
        if not re.match(r'^\(?\d', s) and ascii_ratio(s) < 0.6: continue
        clean.append(s)
    # qnum anchors that are not option lines
    anchors = [(i, is_qnum(s)[0]) for i,s in enumerate(clean)
               if is_qnum(s) and not is_optline(s, fmt)]
    keep = lis_keep([n for _,n in anchors])
    kept = [anchors[k] for k in keep]

    out=[]
    for qi,(idx,n) in enumerate(kept):
        end = kept[qi+1][0] if qi+1 < len(kept) else len(clean)
        block = clean[idx:end]
        # English portion = lines until the Telugu repeat begins
        eng_lines=[]
        _, first = is_qnum(block[0]); eng_lines.append(first)
        for s in block[1:]:
            if ascii_ratio(s) < 0.5:          # Telugu repeat starts -> stop
                break
            eng_lines.append(s)
        joined = tidy(" ".join(eng_lines))
        # stem = text before first option marker
        m = OPTSPLIT.search(joined)
        stem_src = joined[:m.start()] if m else joined
        stem = clean_stem(stem_src)
        options = extract_options(joined)
        # drop instruction/header leaks and Telugu-dominant or too-short stems
        if DROP.search(stem) or len(stem) < 12 or ascii_ratio(stem) < 0.75:
            continue
        out.append({"n": n, "section": section_of(pid, n), "stem": stem, "options": options})
    return out

data={}
for pid, fmt, stage in PAPERS:
    qs = parse(pid, fmt)
    data[pid]=qs
    good = sum(1 for q in qs if q["options"])
    print("%-16s %3d questions, %3d with clean options" % (pid, len(qs), good))
json.dump(data, open(os.path.join(TXT,"questions.json"),"w"), ensure_ascii=False, indent=1)
print("wrote pyq_txt/questions.json")
