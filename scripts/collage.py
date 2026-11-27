#!/usr/bin/env python3
"""Build a 2:1 equirectangular 'photo sphere' from flat photos of one place.
Each photo is reprojected (gnomonic) to the direction it faces; gaps are filled with a
soft blur of the neighbouring photos.  Usage: python3 -I collage.py SPEC.json PHOTOS_DIR OUT_DIR
Needs numpy, scipy and Pillow. About 13 s per place at 4096x2048.
SPEC: {"scene_id": [{"p": "p049.jpg", "u": 0.5, "v": 0.5, "hfov": 54}, ...], ...}
u: 0..1 around (0.5 = straight ahead on arrival), v: 0.5 = horizon; hfov in degrees (default by aspect: 90 landscape / 70 portrait; wider than the real lens so each photo fills the phone screen top to bottom)."""
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
    e = np.minimum(np.minimum(xi, pw - 1 - xi) / (pw * 0.1), np.minimum(yi, ph - 1 - yi) / (ph * 0.1))
    m = np.where(ok, np.clip(e, 0, 1), 0).astype(np.float32)
    return c, m

for sid, items in spec.items():
    acc = np.zeros((H, W, 3), np.float32); wsum = np.zeros((H, W), np.float32)
    for it in items:
        img = Image.open(src / it["p"]).convert("RGB")
        if max(img.size) > 2048: img.thumbnail((2048, 2048), Image.LANCZOS)
        hf = it.get("hfov") or (90.0 if img.width >= img.height else 70.0)
        c, m = place(img, it["u"], it.get("v", 0.5), hf)
        m = m ** 1.5
        acc += c * m[..., None]; wsum += m
    sharp = acc / np.maximum(wsum, 1e-6)[..., None]; cover = np.clip(wsum, 0, 1)
    # background: push-pull fill. Average the photos into ever smaller images (weighted by coverage),
    # then fill each gap from the next coarser level, so the fill continues the colours at each photo edge.
    from scipy.ndimage import gaussian_filter, zoom
    k = 8; c0 = (sharp * cover[..., None])[::k, ::k].astype(np.float32); w0 = cover[::k, ::k].astype(np.float32)
    def down(c, w):
        h2, w2 = c.shape[0] // 2, c.shape[1] // 2
        cs = c[:h2 * 2, :w2 * 2].reshape(h2, 2, w2, 2, 3).sum((1, 3)); ws = w[:h2 * 2, :w2 * 2].reshape(h2, 2, w2, 2).sum((1, 3))
        return cs, ws          # premultiplied sums
    def fill(c, w):            # c premultiplied by w
        if min(w.shape) <= 2:
            m = c.sum((0, 1)) / max(w.sum(), 1e-6); return np.broadcast_to(m, c.shape).copy()
        cs, ws = down(c, w); coarse = fill(cs, ws)
        up = zoom(coarse, (c.shape[0] / coarse.shape[0], c.shape[1] / coarse.shape[1], 1), order=1)
        up = gaussian_filter(up, sigma=(1, 1, 0), mode=('nearest', 'wrap', 'nearest'))
        a = np.clip(w, 0, 1)[..., None]
        return (c / np.maximum(w, 1e-6)[..., None]) * a + up * (1 - a)
    bgs = fill(c0, w0)
    bgs = gaussian_filter(bgs, sigma=(6, 6, 0), mode=('nearest', 'wrap', 'nearest'))
    bgs = bgs * 0.9 + 6                                       # a touch darker, so the photos stay the focus
    bg = zoom(bgs, (H / bgs.shape[0], W / bgs.shape[1], 1), order=1)[:H, :W]
    outimg = sharp * cover[..., None] + bg * (1 - cover[..., None])
    Image.fromarray(np.uint8(np.clip(outimg, 0, 255))).save(out / f"{sid}.jpg", quality=88)
    print("OK", sid)
