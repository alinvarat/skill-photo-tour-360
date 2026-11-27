#!/usr/bin/env python3
"""Prepare equirectangular panoramas for the tour template.

Usage: python3 -I prep_panos.py SRC_DIR OUT_DIR
SRC_DIR holds the owner's 2:1 panoramas (jpg/png/webp; any size >= 4096x2048 is best).
Writes into OUT_DIR (the tour's pano/ folder), one set per photo, named by file stem:
  <id>.jpg      4096x2048 full image (quality 82)
  lo/<id>.jpg   1024x512 preview shown at once while the full image loads
  t-<id>.jpg    240x150 thumbnail for the dock
  grid/<id>.jpg 2048x1024 copy with a labelled u/v grid, for placing hotspots (do not publish)
"""
import sys, pathlib
from PIL import Image, ImageDraw

src, out = map(pathlib.Path, sys.argv[1:3])
for sub in ("", "lo", "grid"):
    (out / sub).mkdir(parents=True, exist_ok=True)
for f in sorted(src.iterdir()):
    if f.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
        continue
    im = Image.open(f).convert("RGB")
    w, h = im.size
    if abs(w / h - 2) > 0.02:
        print(f"SKIP {f.name}: {w}x{h} is not 2:1 equirectangular")
        continue
    stem = f.stem
    im.resize((4096, 2048), Image.LANCZOS).save(out / f"{stem}.jpg", quality=82, optimize=True, progressive=True)
    im.resize((1024, 512), Image.LANCZOS).save(out / "lo" / f"{stem}.jpg", quality=72, optimize=True)
    # thumbnail: the middle band around the horizon, 8:5
    band = im.crop((int(w * 0.375), int(h * 0.3), int(w * 0.625), int(h * 0.7))).resize((240, 150), Image.LANCZOS)
    band.save(out / f"t-{stem}.jpg", quality=80)
    g = im.resize((2048, 1024), Image.LANCZOS)
    d = ImageDraw.Draw(g)
    for i in range(1, 20):
        x, y = int(2048 * i / 20), int(1024 * i / 20)
        d.line([(x, 0), (x, 1024)], fill=(255, 0, 0) if i % 2 == 0 else (255, 160, 160), width=1)
        d.line([(0, y), (2048, y)], fill=(0, 90, 255) if i % 2 == 0 else (160, 190, 255), width=1)
        if i % 2 == 0:
            d.text((x + 3, 4), f"u{i/20:.2f}", fill=(255, 255, 0))
            d.text((4, y + 2), f"v{i/20:.2f}", fill=(255, 255, 0))
    g.save(out / "grid" / f"{stem}.jpg", quality=80)
    print(f"OK {stem}")
