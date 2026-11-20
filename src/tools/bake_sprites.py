"""Pre-cut every sprite at build time, so the game never reads canvas pixels while it runs.

Some browsers (Edge on Xbox among them) return blank or altered pixel data from canvas reads, which made every
character invisible. This script does the same cutting the game used to do in the browser (engine.js cleanCell and
loadAtlas), once, in Python:
  - remove the background flood-filled in from the edges (white, or the slate grey behind the portraits)
  - keep only the largest connected silhouette, clear a 2-pixel border
  - scale each frame so the idle pose is the Ranger's set height, feet at (64, 102) in a 128 x 112 cell
Outputs (src/baked/): <id>-sheet.png (frames 128 x 112, same rows/columns as the source), <id>-approved.png (120 x 160
portraits) and sprite-meta.json (hand / head positions used by the intro, and the select-screen mugshot crop).

usage: python3 -I src/tools/bake_sprites.py
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
PACKED, OUT = ROOT / 'packed', ROOT / 'baked'
FOUR = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]])
RANGERS = ['atp', 'ribosome', 'rougher', 'golgi', 'cytoplasm', 'membrane', 'mito', 'nucleus', 'smoother', 'lysosome', 'dna', 'rna', 'mitosis', 'crispr']
ATLASES = {**{r: (4, 4, 74) for r in RANGERS}, 'bacteria': (4, 3, 48), 'retrovirus': (4, 3, 46), 'mutant': (4, 3, 50),
           'radical': (4, 3, 40), 'miniphage': (4, 3, 46), 'phage': (4, 2, 104)}


def clean(cell, slate=False):
    """engine.js cleanCell: returns (RGBA array with the background cleared, bounds [minX, minY, maxX, maxY])."""
    p = np.array(cell.convert('RGBA')).astype(np.int32); h, w = p.shape[:2]
    r, g, b, a = p[..., 0], p[..., 1], p[..., 2], p[..., 3]
    mn, mx = np.minimum(np.minimum(r, g), b), np.maximum(np.maximum(r, g), b)
    if slate: bg = (a < 150) | ((r >= 45) & (r < 95) & (g >= 60) & (g < 118) & (b >= 90) & (b < 160) & (b - g > 18) & (g - r > 4))
    else: bg = (a < 150) | ((mn > 195) & (mx - mn < 28))
    lab, n = ndimage.label(bg, structure=FOUR)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    a = a.copy(); a[np.isin(lab, list(edge))] = 0
    solid = a >= 150; lab2, n2 = ndimage.label(solid, structure=FOUR)
    keep = np.zeros_like(solid)
    if n2:
        sizes = ndimage.sum(solid, lab2, range(1, n2 + 1)); keep = lab2 == (1 + int(np.argmax(sizes)))
    keep[:2, :] = keep[-2:, :] = False; keep[:, :2] = keep[:, -2:] = False
    a[~keep] = 0; p[..., 3] = a
    ys, xs = np.nonzero(keep)
    bounds = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())] if len(xs) else [w, h, 0, 0]
    return p.astype(np.uint8), bounds


def place(arr, size, dest, x, y, w, h):
    """drawImage(src, x, y, w, h) with high-quality smoothing, done with premultiplied alpha."""
    img = Image.fromarray(arr, 'RGBA').convert('RGBa')
    W, H = max(1, round(w)), max(1, round(h))
    scaled = img.resize((W, H), Image.LANCZOS).convert('RGBA')
    X, Y = round(x), round(y); cx, cy = max(0, -X), max(0, -Y)  # crop whatever falls off the top/left edge
    scaled = scaled.crop((cx, cy, min(W, dest.width - X), min(H, dest.height - Y)))
    if scaled.width > 0 and scaled.height > 0: dest.alpha_composite(scaled, (X + cx, Y + cy))


def hand(frame):  # intro.js introHand: the right-most opaque pixel in rows 30..74
    a = np.array(frame)[..., 3]; best, bx = [10, -50], -1
    for y in range(30, 75):
        xs = np.nonzero(a[y] > 60)[0]
        if len(xs) and xs.max() > bx: bx = int(xs.max()); best = [bx - 64, y - 102]
    return best


def top(frame):  # intro.js introTop: the first opaque pixel scanning from the top
    a = np.array(frame)[..., 3]; ys, xs = np.nonzero(a > 60)
    if not len(ys): return [-10, -98]
    i = np.lexsort((xs, ys))[0]; return [int(xs[i]) - 64, int(ys[i]) - 102 + 4]


def main():
    OUT.mkdir(exist_ok=True); meta = {'hand': {}, 'top': {}, 'mug': {}}
    for aid, (cols, rows, height) in ATLASES.items():
        src = Image.open(PACKED / f'{aid}-sheet.png').convert('RGBA'); sw, sh = src.width // cols, src.height // rows
        cells = [clean(src.crop(((i % cols) * sw, (i // cols) * sh, (i % cols) * sw + sw, (i // cols) * sh + sh))) for i in range(cols * rows)]
        b0 = cells[0][1]; scale = height / max(1, b0[3] - b0[1] + 1)
        sheet = Image.new('RGBA', (128 * cols, 112 * rows), (0, 0, 0, 0))
        for i, (arr, bounds) in enumerate(cells):
            frame = Image.new('RGBA', (128, 112), (0, 0, 0, 0)); base = bounds[3] + 1
            place(arr, None, frame, 64 - sw * scale / 2, 102 - base * scale, sw * scale, sh * scale)
            sheet.paste(frame, ((i % cols) * 128, (i // cols) * 112))
            meta['hand'][f'{aid}{i}'] = hand(frame); meta['top'][f'{aid}{i}'] = top(frame)
        sheet.save(OUT / f'{aid}-sheet.png', optimize=True)
    for rid in RANGERS:
        src = Image.open(PACKED / f'{rid}-approved.png').convert('RGBA'); arr, (x, y, right, bottom) = clean(src, slate=True)
        out = Image.new('RGBA', (120, 160), (0, 0, 0, 0)); scale = 145 / max(1, bottom - y)
        place(arr, None, out, 60 - (x + right) * scale / 2, 8 - y * scale, src.width * scale, src.height * scale)
        out.save(OUT / f'{rid}-approved.png', optimize=True)
        a = np.array(out)[..., 3]; rows_ = np.nonzero((a > 40).any(1))[0]; t = int(rows_[0]) if len(rows_) else 160
        ys, xs = np.nonzero(a[t:t + 18] > 40); meta['mug'][rid] = [float(xs.mean()) if len(xs) else 60.0, t]
    (OUT / 'sprite-meta.json').write_text(json.dumps(meta, separators=(',', ':')))
    print('baked', len(ATLASES), 'sheets and', len(RANGERS), 'portraits ->', OUT)


if __name__ == '__main__':
    main()
