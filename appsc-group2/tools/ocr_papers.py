#!/usr/bin/env python3
"""OCR the scanned APPSC papers to text files (English only; Telugu half is noise)."""
import subprocess, sys, os, pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "pyq_txt")
os.makedirs(OUT, exist_ok=True)

papers = sys.argv[1:] or ["2024-prelims", "2019-prelims", "2025-mains-p1", "2025-mains-p2"]
for name in papers:
    doc = pymupdf.open(os.path.join(HERE, "pyq_src", name + ".pdf"))
    parts = []
    for i in range(doc.page_count):
        pix = doc[i].get_pixmap(dpi=250)
        png = "/tmp/claude-0/_ocr_page.png"
        pix.save(png)
        txt = subprocess.run(
            ["tesseract", png, "stdout", "-l", "eng", "--psm", "6"],
            capture_output=True, text=True).stdout
        parts.append("\n<<<PAGE %d>>>\n" % (i + 1) + txt)
        if (i + 1) % 10 == 0:
            print("  %s: %d/%d" % (name, i + 1, doc.page_count), flush=True)
    with open(os.path.join(OUT, name + ".txt"), "w", encoding="utf-8") as f:
        f.write("".join(parts))
    print("DONE %s -> %d pages" % (name, doc.page_count), flush=True)
