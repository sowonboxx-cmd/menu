"""Mockup du T-shirt (tshirt-mockup.png) → 4 rendus peints, logo gardé lisible. Sorties : peint-<A..D>.png"""
import sys, cv2, numpy as np
from scipy.spatial import cKDTree
sys.path.insert(0, '/home/claude/menu/tools/jeu'); import peinture as P
rng = np.random.default_rng(11)
im = cv2.imread('tshirt-mockup.png', cv2.IMREAD_UNCHANGED); h, w = im.shape[:2]
a = im[..., 3].astype(np.float32); A = a / 255
rgb = im[..., :3].astype(np.float32)
# logo (zone claire ronde)
g = rgb.mean(2); L = ((g > 120) & (a > 200)).astype(np.uint8)
n, lab, st, cen = cv2.connectedComponentsWithStats(cv2.morphologyEx(L, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8)))
i = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]); cx, cy = cen[i]; r = max(st[i, 2], st[i, 3]) / 2 + 4
logo = np.zeros((h, w), np.float32); cv2.circle(logo, (int(cx), int(cy)), int(r), 1, -1); logo = cv2.GaussianBlur(logo, (0, 0), 1.2)[..., None]
# T-shirt sans le logo (pour peindre le tissu sans halo autour du logo)
disc = np.zeros((h, w), np.uint8); cv2.circle(disc, (int(cx), int(cy)), int(r) + 6, 255, -1)
rgb_nl = cv2.inpaint(np.clip(rgb, 0, 255).astype(np.uint8), disc, 9, cv2.INPAINT_TELEA).astype(np.float32)
# lumière de peintre : on accentue les plis et on ajoute un éclairage doux venant du haut à gauche
lum = cv2.cvtColor(np.clip(rgb_nl, 0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
fold = lum / (cv2.GaussianBlur(lum, (0, 0), 30) + 1e-3)
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
light = 1.12 - .32 * np.clip((xx / w * .6 + yy / h * .8), 0, 1.4)
dist = cv2.distanceTransform((A > .5).astype(np.uint8), cv2.DIST_L2, 5); edge = np.clip(1 - dist / 40, 0, 1)
base = rgb_nl * ((1 + (fold - 1) * 3.2) * light)[..., None] * (1 - .25 * edge[..., None])
base = np.clip(base, 0, 255)
def flat(x): return (x * A[..., None] + 244 * (1 - A[..., None])).astype(np.uint8)
def out(name, painted, al, logo_img):
    o = painted.astype(np.float32) * (1 - logo) + logo_img.astype(np.float32) * logo
    cv2.imwrite(name, np.dstack([np.clip(o, 0, 255).astype(np.uint8), np.clip(al, 0, 255).astype(np.uint8)]))
logo_soft = cv2.edgePreservingFilter(np.clip(rgb, 0, 255).astype(np.uint8), flags=1, sigma_s=8, sigma_r=.2)

# A · Couteau (comme le plateau) : touches en facettes, arêtes claires
B = flat(base); n = 42000
pts = np.column_stack([rng.uniform(0, w, n), rng.uniform(0, h, n)]); ys, xs = np.nonzero(A > .02)
d, idx = cKDTree(pts).query(np.column_stack([xs, ys]), k=2); lb = idx[:, 0]
sums = np.zeros((n, 3)); cnt = np.bincount(lb, minlength=n)[:, None] + 1e-6
for c in range(3): sums[:, c] = np.bincount(lb, weights=B[ys, xs, c], minlength=n)
oA = B.astype(np.float32).copy(); oA[ys, xs] = (sums / cnt)[lb]
e = (d[:, 1] - d[:, 0]) < 1.2; oA[ys[e], xs[e]] = np.clip(oA[ys[e], xs[e]] * 1.18 + 22, 0, 255)
oA = cv2.GaussianBlur(oA, (3, 3), 0) * .75 + B.astype(np.float32) * .25
out('peint-A.png', oA, P.roughen_alpha(a, 7, 30), logo_soft)

# B · Huile lisse (comme l'huître signée) : grands coups de pinceau le long des plis, reflets gris-bleu
k = P.kuwahara(flat(base), 7)
gg = cv2.GaussianBlur(cv2.cvtColor(k.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 8)
gx, gy = cv2.Sobel(gg, cv2.CV_32F, 1, 0), cv2.Sobel(gg, cv2.CV_32F, 0, 1)
J11, J22, J12 = [cv2.GaussianBlur(v, (0, 0), 18) for v in (gx * gx, gy * gy, gx * gy)]
ang = .5 * np.arctan2(2 * J12, J11 - J22) + np.pi / 2; vx, vy = np.cos(ang), np.sin(ang)
acc = k.copy(); px, py = xx.copy(), yy.copy(); cnt = 1
for sg in (1, -1):
    px, py = xx.copy(), yy.copy()
    for _ in range(10):
        ix, iy = np.clip(px, 0, w - 1).astype(int), np.clip(py, 0, h - 1).astype(int)
        px += sg * vx[iy, ix] * 1.6; py += sg * vy[iy, ix] * 1.6
        acc += cv2.remap(k, px, py, cv2.INTER_LINEAR); cnt += 1
oB = acc / cnt
hi = np.clip((fold - 1.02) * 6, 0, 1)[..., None] * (1 - edge[..., None])
oB = oB * (1 - .5 * hi) + np.array([205, 190, 175], np.float32) * .5 * hi   # reflets gris-bleu (BGR)
nz = P.noise(h, w, 3, 2)[..., None]; oB = oB * (.96 + .08 * nz)
out('peint-B.png', oB, P.roughen_alpha(a, 4, 40), logo_soft)

# C · Aquarelle
oC, alC = P.aquarelle(flat(base), a)
oC = oC.astype(np.float32); bl = P.noise(h, w, 70, 4)[..., None]; oC = oC * (.78 + .42 * bl) + 30 * (1 - bl) ** 2
wm = (np.abs(P.noise(h, w, 45, 3) - .5) < .025).astype(np.float32); wm = cv2.GaussianBlur(wm, (0, 0), 1.2)[..., None]
oC = oC * (1 - .14 * wm)   # auréoles de l'eau
oC = oC * (1 - .3 * edge[..., None]) + 255 * .3 * edge[..., None] * P.noise(h, w, 8, 2)[..., None]   # bord qui s'éclaircit
out('peint-C.png', oC, alC, cv2.edgePreservingFilter(np.clip(rgb, 0, 255).astype(np.uint8), flags=1, sigma_s=8, sigma_r=.2))

# D · Gouache : aplats doux, bords crayonnés
oD = cv2.pyrMeanShiftFiltering(flat(base), 12, 26, maxLevel=2).astype(np.float32)
oD = cv2.GaussianBlur(oD, (0, 0), 1.2)
br = cv2.filter2D(rng.random((h, w)).astype(np.float32), -1, np.ones((1, 21), np.float32) / 21)
br = cv2.filter2D(br, -1, np.ones((3, 1), np.float32) / 3); br = (br - br.mean()) / (br.std() + 1e-6)
oD = oD * (1 + .05 * br[..., None])
ed = cv2.Canny(cv2.GaussianBlur(flat(base), (7, 7), 0), 18, 50).astype(np.float32) / 255
oD = oD * (1 - .35 * cv2.GaussianBlur(ed, (3, 3), 0)[..., None]) * (.95 + .1 * P.noise(h, w, 2, 2)[..., None])
ring = cv2.subtract(cv2.dilate((A > .5).astype(np.uint8), np.ones((3, 3))), (A > .5).astype(np.uint8))
out('peint-D.png', oD, P.roughen_alpha(a, 3, 25), logo_soft)
print('ok')
