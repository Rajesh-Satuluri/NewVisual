#!/usr/bin/env python3
"""Column-aware OCR: these papers are two-column bilingual scans (English LEFT,
Telugu RIGHT). The earlier flat OCR read across both columns and interleaved the
languages, garbling every stem. Here we crop the LEFT portion of each page and
OCR only that, so the English question text stays intact.

Output: pyq_txt/<pid>.left.txt  with <<<PAGE n>>> markers.
"""
import os, subprocess, pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "pyq_src")
OUT = os.path.join(HERE, "pyq_txt")
TMP = "/tmp/claude-0/ocrcols"
os.makedirs(TMP, exist_ok=True)

PAPERS = ["2025-mains-p1", "2025-mains-p2", "2024-prelims", "2019-prelims"]

# fraction of page width to keep from the left edge (English column + a margin).
# Question stems sit in the left column; 0.56 keeps the stem and its (1)-(4)
# option labels without bleeding into the Telugu column.
LEFT_FRAC = 0.52
DPI = 300

def ocr_png(png):
    r = subprocess.run(["tesseract", png, "stdout", "-l", "eng", "--psm", "6"],
                       capture_output=True, text=True)
    return r.stdout

for pid in PAPERS:
    pdf = os.path.join(SRC, pid + ".pdf")
    doc = pymupdf.open(pdf)
    out_lines = []
    for i in range(len(doc)):
        page = doc[i]
        rect = page.rect
        clip = pymupdf.Rect(rect.x0, rect.y0, rect.x0 + rect.width * LEFT_FRAC, rect.y1)
        pix = page.get_pixmap(dpi=DPI, clip=clip)
        png = os.path.join(TMP, "%s_%03d.png" % (pid, i))
        pix.save(png)
        txt = ocr_png(png)
        out_lines.append("<<<PAGE %d>>>" % (i + 1))
        out_lines.append(txt)
        os.remove(png)
        if (i + 1) % 10 == 0:
            print("  %s page %d/%d" % (pid, i + 1, len(doc)), flush=True)
    open(os.path.join(OUT, pid + ".left.txt"), "w", encoding="utf-8").write("\n".join(out_lines))
    print("DONE", pid, len(doc), "pages", flush=True)
print("ALL DONE", flush=True)
