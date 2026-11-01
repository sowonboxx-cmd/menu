# Remplace le QR dessiné sur la pancarte du « porteur » par un vrai QR (perspective), puis détoure le fond blanc.
# python3 warp.py <qr.svg> <sortie.png>
import sys, cv2, numpy as np, cairosvg, io
from PIL import Image, ImageFilter
from scipy import ndimage
QR, OUT = sys.argv[1], sys.argv[2]
K = 4
src = Image.open('source.png').convert('RGB'); W, H = src.size
big = np.array(src.resize((W * K, H * K), Image.LANCZOS))
outer = np.float32([[142, 115], [786, 12], [890, 612], [250, 688]])
def inset(q, d):
    out = []
    for i, p in enumerate(q):
        a, b = q[i - 1], q[(i + 1) % 4]
        u = (a - p) / np.linalg.norm(a - p); v = (b - p) / np.linalg.norm(b - p)
        out.append(p + (u + v) * d)
    return np.float32(out)
inner = inset(outer, 16) * K
png = cairosvg.svg2png(url=QR, output_width=2000, background_color='white')
qr = Image.open(io.BytesIO(png)).convert('RGB')
pad = int(2000 / 43 * 3)
qr2 = Image.new('RGB', (2000 + 2 * pad, 2000 + 2 * pad), 'white'); qr2.paste(qr, (pad, pad))
q = np.array(qr2); s = q.shape[0]
M = cv2.getPerspectiveTransform(np.float32([[0, 0], [s, 0], [s, s], [0, s]]), inner)
warped = cv2.warpPerspective(q, M, (W * K, H * K), flags=cv2.INTER_AREA)
mask = cv2.warpPerspective(np.full((s, s), 255, np.uint8), M, (W * K, H * K)) > 127
out = big.copy()
blanc = cv2.fillPoly(np.zeros(out.shape[:2], np.uint8), [np.int32(inset(outer, 13) * K)], 1).astype(bool)
out[blanc] = 255
out[mask] = warped[mask]
for (x0, y0, x1, y1) in [(222, 652, 338, 735), (742, 603, 852, 690)]:   # les gants repassent devant
    out[y0 * K:y1 * K, x0 * K:x1 * K] = big[y0 * K:y1 * K, x0 * K:x1 * K]
# détourage : le blanc relié au bord devient transparent (la pancarte, les gants et le nœud restent : ils sont cernés de noir)
white = (out.min(2) > 232)
lab, n = ndimage.label(white)
bord = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bg = np.isin(lab, list(bord))
# grands blancs enfermés (entre les bras, entre les jambes) : transparents aussi, sauf l'intérieur de la pancarte
sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
pts = outer * K
for i, sz in enumerate(sizes, 1):
    if sz > 250000 and i not in bord:
        ys, xs = np.nonzero(lab == i)
        if cv2.pointPolygonTest(pts.reshape(-1, 1, 2), (float(xs.mean()), float(ys.mean())), False) < 0:
            bg |= lab == i
alpha = Image.fromarray(np.where(bg, 0, 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))
im = Image.fromarray(out).convert('RGBA'); im.putalpha(alpha); im = im.crop(im.getbbox())
im.save(OUT)
import zxingcpp
print(OUT, im.size, [r.text for r in zxingcpp.read_barcodes(Image.fromarray(out).resize((W * 2, H * 2)))])
