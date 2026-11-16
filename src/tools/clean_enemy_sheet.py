"""Clean a generated 4x3 enemy sprite sheet into a transparent, game-ready sheet.

usage: python3 clean_enemy_sheet.py INPUT.png OUTPUT.png [--cols 4 --rows 3 --cell 160]

Generated sheets are not reliably transparent or grid-aligned, so this works on the whole sheet:
- Opaque white or checkerboard backgrounds are removed, including pockets enclosed by the sprite.
- Faint haze (low alpha) is dropped, and washed-out fringe pixels along the edge are trimmed.
- Each creature is found as a large connected shape and assigned to the grid cell its center falls in,
  even if it spills over a cell line. Small detached effects (spit blobs, ground streaks) are dropped;
  the game draws its own projectiles and shadows.
- Every creature is centered in its output cell, feet on a shared baseline, at one shared scale.
"""
import argparse
from collections import deque
import numpy as np
from PIL import Image

def components(mask):
    h, w = mask.shape; lab = np.zeros((h, w), np.int32); info = [None]; n = 0
    for sy, sx in zip(*np.nonzero(mask)):
        if lab[sy, sx]: continue
        n += 1; lab[sy, sx] = n; q = deque([(sy, sx)]); pts = []
        while q:
            y, x = q.popleft(); pts.append((y, x))
            for ny, nx in ((y-1, x), (y+1, x), (y, x-1), (y, x+1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = n; q.append((ny, nx))
        ys = np.array([p[0] for p in pts]); xs = np.array([p[1] for p in pts])
        info.append({'id': n, 'size': len(pts), 'cy': ys.mean(), 'cx': xs.mean(), 'box': (xs.min(), ys.min(), xs.max(), ys.max())})
    return lab, info

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--cols', type=int, default=4); ap.add_argument('--rows', type=int, default=3); ap.add_argument('--cell', type=int, default=160)
    a = ap.parse_args()
    im = np.array(Image.open(a.src).convert('RGBA')); H, W, _ = im.shape
    rgb = im[..., :3].astype(int); alpha = im[..., 3].astype(int)
    lo, hi = rgb.min(-1), rgb.max(-1)
    pale = (lo > 200) & (hi - lo < 30)
    washed = (lo > 180) & (hi - lo < 80)
    solid = alpha >= 150
    # Opaque sheets (no real transparency): flood the pale background in from the edges, then remove
    # enclosed pockets that show the neutral checkerboard. Warm pale areas (eyes, glowing cores) stay.
    opaque = (alpha > 250).mean() > .9
    drop = np.zeros((H, W), bool)
    if opaque:
        lab, info = components(pale)
        edge_ids = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        drop |= np.isin(lab, list(edge_ids))
        tone = rgb.mean(-1)
        neutral = (lo > 235) & (hi - lo < 14) & ~drop
        lab, info = components(neutral)
        for c in info[1:]:
            if c['size'] < 40: continue
            m = lab == c['id']; px = rgb[m]
            # checkerboard is neutral grey/white; eyes and glowing cores are warm (blue lower than red)
            if (px[:, 2] - px[:, 0]).mean() > -4: drop |= m
    keep = solid & ~drop
    # trim washed fringe that touches the background
    for _ in range(3 if opaque else 2):
        edge = keep & (np.roll(~keep, 1, 0) | np.roll(~keep, -1, 0) | np.roll(~keep, 1, 1) | np.roll(~keep, -1, 1))
        keep &= ~(edge & (washed if opaque else pale))
    lab, info = components(keep)
    cw, ch = W / a.cols, H / a.rows
    cells = {}
    for c in info[1:]:
        col, row = int(c['cx'] // cw), int(c['cy'] // ch)
        cells.setdefault((row, col), []).append(c)
    picked = {}
    for key, comps in cells.items():
        big = max(comps, key=lambda c: c['size'])
        picked[key] = [c for c in comps if c['size'] >= big['size'] * .35]
    missing = [(r, c) for r in range(a.rows) for c in range(a.cols) if (r, c) not in picked]
    if missing: raise SystemExit(f'no creature found in cells {missing}')
    crops = {}
    for key, comps in picked.items():
        ids = [c['id'] for c in comps]
        x0 = min(c['box'][0] for c in comps); y0 = min(c['box'][1] for c in comps)
        x1 = max(c['box'][2] for c in comps); y1 = max(c['box'][3] for c in comps)
        part = im[y0:y1+1, x0:x1+1].copy(); part[..., 3] = np.where(np.isin(lab[y0:y1+1, x0:x1+1], ids), 255, 0)
        crops[key] = part
    span = max(max(p.shape[0], p.shape[1]) for p in crops.values())
    scale = a.cell * .92 / span
    sheet = Image.new('RGBA', (a.cell * a.cols, a.cell * a.rows), (0, 0, 0, 0))
    for (r, c), part in crops.items():
        img = Image.fromarray(part); tw, th = max(1, round(img.width * scale)), max(1, round(img.height * scale))
        img = img.resize((tw, th), Image.LANCZOS); arr = np.array(img); arr[..., 3] = np.where(arr[..., 3] > 110, 255, 0)
        sheet.alpha_composite(Image.fromarray(arr), (c * a.cell + (a.cell - tw) // 2, r * a.cell + int(a.cell * .96) - th))
    sheet.save(a.dst, optimize=True)
    print(a.dst, sheet.size, 'scale %.3f' % scale)

if __name__ == '__main__':
    main()
