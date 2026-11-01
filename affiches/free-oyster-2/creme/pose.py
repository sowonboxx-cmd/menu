# Pose le QR Studio (logo Drevici) sur les deux affiches crème de Will.
import cv2, numpy as np, cairosvg, io, zxingcpp
from PIL import Image
A = '/mnt/user-data/attachments/a3607c0f-5aa9-571e-9f02-923c61560471/'
def qr_png(svg, px, pad_mod):
    q = Image.open(io.BytesIO(cairosvg.svg2png(url=svg, output_width=px, background_color='white'))).convert('RGB')
    pad = int(px / 43 * pad_mod)
    c = Image.new('RGB', (px + 2 * pad, px + 2 * pad), 'white'); c.paste(q, (pad, pad)); return np.array(c)
def inset(q, d):
    out = []
    for i, p in enumerate(q):
        a, b = q[i - 1], q[(i + 1) % 4]
        u = (a - p) / np.linalg.norm(a - p); v = (b - p) / np.linalg.norm(b - p)
        out.append(p + (u + v) * d)
    return np.float32(out)
def poser(src, quad, svg, border, pad_mod, out, gloves=()):
    im = np.array(Image.open(src).convert('RGB')); H, W = im.shape[:2]
    quad = np.float32(quad); inner = inset(quad, border)
    q = qr_png(svg, 2400, pad_mod); s = q.shape[0]
    M = cv2.getPerspectiveTransform(np.float32([[0, 0], [s, 0], [s, s], [0, s]]), inner)
    warped = cv2.warpPerspective(q, M, (W, H), flags=cv2.INTER_AREA)
    mask = cv2.warpPerspective(np.full((s, s), 255, np.uint8), M, (W, H)) > 127
    res = im.copy()
    fond = cv2.fillPoly(np.zeros((H, W), np.uint8), [np.int32(inset(quad, border * .55))], 1).astype(bool)
    res[fond] = 255
    res[mask] = warped[mask]
    for (x0, y0, x1, y1) in gloves:   # les gants repassent devant la pancarte
        reg = im[y0:y1, x0:x1]; g = (reg.min(2) > 200) | (reg.max(2) < 70)
        sub = res[y0:y1, x0:x1]
        # on garde l'original seulement là où le gant déborde sur la pancarte (pixels du gant reliés au bas)
        from scipy import ndimage
        lab, n = ndimage.label(~(reg.min(2) > 235) | (reg.max(2) < 70))
        keep = np.isin(lab, np.unique(lab[-3:, :])) & (lab > 0)
        sub[keep] = reg[keep]
    Image.fromarray(res).save(out)
    for w in (500, 900, 1500):
        t = Image.fromarray(res); t.thumbnail((w, w * 2)); print(out, w, [r.text for r in zxingcpp.read_barcodes(t)])
# 1 · la mascotte qui pointe : QR droit, cadre noir de l'affiche gardé
poser(A + '19c574a3-image.png', [[2077, 2669], [4049, 2669], [4049, 4641], [2077, 4641]],
      '../QR-free-oyster_affiche-biot-1_logo-Drevici.svg', 34, 2, 'affiche-creme-pointe.png')
# 2 · la mascotte qui porte la pancarte : QR en perspective, modules carrés (les losanges ne se lisent plus une fois penchés)
poser(A + '2fbe0a8f-image.png', [[1357, 1850], [2710, 1642], [2967, 2938], [1572, 3115]],
      '../qr-pancarte.svg', 50, 2, 'affiche-creme-porteur.png',
      gloves=[(1480, 3048, 1800, 3260), (2640, 2930, 2910, 3180)])
