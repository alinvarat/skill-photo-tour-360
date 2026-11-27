#!/usr/bin/env python3
"""Build a 2:1 equirectangular 'photo sphere' from flat photos of one place.
Each photo is reprojected (gnomonic) to the direction it faces; gaps are filled with a
soft blur of the neighbouring photos.  Usage: python3 -I collage.py SPEC.json PHOTOS_DIR OUT_DIR
SPEC: {"scene_id": [{"p": "p049.jpg", "u": 0.5, "v": 0.5, "hfov": 54}, ...], ...}
u: 0..1 around (0.5 = straight ahead on arrival), v: 0.5 = horizon; hfov in degrees (default by aspect: 69 landscape / 54 portrait).
Needs numpy, scipy and Pillow. About 13 s per place at 4096x2048."""
import sys, json, math, pathlib
import numpy as np
from PIL import Image, ImageFilter

W, H = 4096, 2048
spec = json.load(open(sys.argv[1])); src = pathlib.Path(sys.argv[2]); out = pathlib.Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
lon = (np.arange(W) + 0.5) / W * 2 * math.pi
lat = math.pi / 2 - (np.arange(H) + 0.5) / H * math.pi
LON, LAT = np.meshgrid(lon, lat)

def place(img, uc, vc, hfov):
    a = np.asarray(img, dtype=np.float32); ph, pw = a.shape[:2]
    f = (pw / 2) / math.tan(math.radians(hfov) / 2)
    th, ph0 = uc * 2 * math.pi, math.pi / 2 - vc * math.pi          # yaw, pitch of the photo centre
    # direction in the template's frame, then into the camera frame (yaw, then pitch)
    dl = LON - th
    x = np.cos(LAT) * np.sin(dl); y = np.sin(LAT); z = np.cos(LAT) * np.cos(dl)
    y2 = y * math.cos(ph0) - z * math.sin(ph0); z2 = y * math.sin(ph0) + z * math.cos(ph0)
    ok = z2 > 1e-3
    px = pw / 2 + f * x / np.where(ok, z2, 1); py = ph / 2 - f * y2 / np.where(ok, z2, 1)
    ok &= (px >= 0) & (px < pw - 1) & (py >= 0) & (py < ph - 1)
    xi = np.clip(px, 0, pw - 1.001); yi = np.clip(py, 0, ph - 1.001)
    x0 = xi.astype(int); y0 = yi.astype(int); fx = (xi - x0)[..., None]; fy = (yi - y0)[..., None]
    c = (a[y0, x0] * (1 - fx) * (1 - fy) + a[y0, x0 + 1] * fx * (1 - fy) + a[y0 + 1, x0] * (1 - fx) * fy + a[y0 + 1, x0 + 1] * fx * fy)
    # feather: distance to the photo edge, as a fraction of its half size
    e = np.minimum(np.minimum(xi, pw - 1 - xi) / (pw * 0.06), np.minimum(yi, ph - 1 - yi) / (ph * 0.06))
    m = np.where(ok, np.clip(e, 0, 1), 0).astype(np.float32)
    return c, m

for sid, items in spec.items():
    acc = np.zeros((H, W, 3), np.float32); wsum = np.zeros((H, W), np.float32)
    for it in items:
        img = Image.open(src / it["p"]).convert("RGB")
        if max(img.size) > 2048: img.thumbnail((2048, 2048), Image.LANCZOS)
        hf = it.get("hfov") or (69.0 if img.width >= img.height else 54.0)
        c, m = place(img, it["u"], it.get("v", 0.5), hf)
        m = m ** 1.5
        acc += c * m[..., None]; wsum += m
    sharp = acc / np.maximum(wsum, 1e-6)[..., None]; cover = np.clip(wsum, 0, 1)
    # background: normalised blur of the photos at low resolution, wrapping left/right
    from scipy.ndimage import gaussian_filter, zoom
    k = 8; sh, sw = H // k, W // k
    cs = sharp[::k, ::k] * cover[::k, ::k, None]; ms = cover[::k, ::k]
    def gb(a, s): return gaussian_filter(a, sigma=(s, s) + ((0,) if a.ndim == 3 else ()), mode=('nearest', 'wrap') + (('nearest',) if a.ndim == 3 else ()))
    near = gb(cs, 22) / np.maximum(gb(ms, 22), 1e-4)[..., None]; wn = np.clip(gb(ms, 22) * 6, 0, 1)[..., None]
    far = gb(cs, 70) / np.maximum(gb(ms, 70), 1e-4)[..., None]; wf = np.clip(gb(ms, 70) * 20, 0, 1)[..., None]
    mean = (cs.sum((0, 1)) / max(ms.sum(), 1))
    bgs = near * wn + (far * wf + mean * (1 - wf)) * (1 - wn)
    bgs = bgs * 0.6 + 16
    bg = zoom(bgs, (k, k, 1), order=1)[:H, :W]
    outimg = sharp * cover[..., None] + bg * (1 - cover[..., None])
    Image.fromarray(np.uint8(np.clip(outimg, 0, 255))).save(out / f"{sid}.jpg", quality=88)
    print("OK", sid)
