"""Huîtres « aquarelle cristallisée » pour le jeu, d'après l'aquarelle fournie par Will.
- huitre-ouverte.png : l'huître de l'image, doigts effacés (retouche + même effet cristallisé)
- huitre-fermee.png  : même silhouette, valve du dessus peinte puis cristallisée
Usage : python3 assets/extrait-huitre.py assets"""
import cv2, numpy as np, sys
from scipy.spatial import cKDTree
D = sys.argv[1] if len(sys.argv) > 1 else 'assets'
rng = np.random.default_rng(7)
src = cv2.imread(f'{D}/src-huitre-aquarelle.png')[480:1000, 600:1220].copy()
hh, ww = src.shape[:2]
hsv = cv2.cvtColor(src, cv2.COLOR_BGR2HSV); H, Sa, V = [hsv[..., i].astype(int) for i in range(3)]
yy, xx = np.mgrid[0:hh, 0:ww]
outline = np.array([(275,65),(300,48),(345,44),(380,60),(440,68),(500,78),(545,103),(575,140),(582,190),(572,240),(548,290),(522,322),(505,352),(486,392),(462,428),(420,446),(360,446),(300,436),(240,414),(176,380),(118,336),(78,292),(60,244),(74,200),(96,152),(112,106),(160,94),(220,88)], np.int32)
shell = np.zeros((hh, ww), np.uint8); cv2.fillPoly(shell, [outline], 255)
blue = (H > 95) & (H < 130) & (Sa > 40)
skin = (H < 24) & (Sa > 38) & (V > 95)
zone = ((yy > 335) | (xx < 125) | ((yy > 300) & (xx < 290)))
repl = (zone & skin) | (blue & (shell > 0))
repl = cv2.dilate(repl.astype(np.uint8) * 255, np.ones((7, 7), np.uint8)) & shell

def crystallize(img, mask, n, seed):
    """Effet « cristallisé » de l'aquarelle : chaque cellule prend la couleur moyenne de sa zone."""
    r = np.random.default_rng(seed)
    pts = np.column_stack([r.uniform(0, ww, n), r.uniform(0, hh, n)])
    ys, xs = np.nonzero(mask)
    d, idx = cKDTree(pts).query(np.column_stack([xs, ys]), k=2)
    lab = idx[:, 0]
    sums = np.zeros((n, 3)); cnt = np.bincount(lab, minlength=n)[:, None] + 1e-6
    for c in range(3): sums[:, c] = np.bincount(lab, weights=img[ys, xs, c], minlength=n)
    out = img.astype(np.float32).copy(); out[ys, xs] = (sums / cnt)[lab]
    edge = (d[:, 1] - d[:, 0]) < 1.3
    out[ys[edge], xs[edge]] = np.clip(out[ys[edge], xs[edge]] * 1.12 + 22, 0, 255)
    return out

def finish(img, mask, name):
    a = cv2.erode(mask, np.ones((3, 3), np.uint8))
    ring = cv2.subtract(a, cv2.erode(a, np.ones((4, 4), np.uint8)))
    img = img.copy(); img[ring > 0] = img[ring > 0] * .35
    a = cv2.GaussianBlur(a, (3, 3), 0)
    x, y, w, h = cv2.boundingRect(mask)
    cv2.imwrite(f'{D}/{name}', np.dstack([np.clip(img, 0, 255).astype(np.uint8), a])[y:y + h, x:x + w])

# --- ouverte : retouche des doigts, crust plus sombre dans la zone retouchée, puis cristallisation légère de cette zone
fill = cv2.inpaint(src, repl, 25, cv2.INPAINT_TELEA).astype(np.float32)
crust = cv2.GaussianBlur((rng.random((hh, ww)) * 255).astype(np.uint8), (0, 0), 6).astype(np.float32) / 255
dark = np.dstack([np.full((hh, ww), v) for v in (92, 98, 104)]) * (.65 + .9 * crust[..., None])
dist = cv2.distanceTransform(shell, cv2.DIST_L2, 5)
w = np.clip(1 - (dist - 14) / 40, 0, 1)[..., None] * (repl[..., None] > 0)  # croûte près du bord
fill = fill * (1 - w) + dark * w
cr = crystallize(fill, repl > 0, 9000, 3)
op = np.where(repl[..., None] > 0, cr, src.astype(np.float32))
finish(op, shell, 'huitre-ouverte.png')

# --- fermée : silhouette festonnée, peinture lisse (lamelles de croissance), puis cristallisation
cm = np.zeros((hh, ww), np.uint8)
ctr = outline.mean(0)
t = np.linspace(0, 1, len(outline), endpoint=False)
dense = []
for i in range(len(outline)):
    a, b = outline[i], outline[(i + 1) % len(outline)]
    for u in np.linspace(0, 1, 6, endpoint=False): dense.append(a + (b - a) * u)
dense = np.array(dense)
v = dense - ctr; n = np.linalg.norm(v, axis=1, keepdims=True)
k = np.arange(len(dense))[:, None]
dense = ctr + v * (1 + .025 * np.sin(k * .9) + .018 * np.sin(k * 2.3 + 1) + rng.normal(0, .006, (len(dense), 1)))
cv2.fillPoly(cm, [dense.astype(np.int32)], 255)
dist = cv2.distanceTransform(cm, cv2.DIST_L2, 5)
hx, hy = 70, 300
wob = cv2.GaussianBlur(rng.normal(0, 1, (hh, ww)).astype(np.float32), (0, 0), 14) * 140
r = np.hypot((xx - hx) / 1.25, (yy - hy)) + wob
bands = np.clip(np.sin(r / 15.0) * 1.6, -1, 1) * .5 + .5
blot = cv2.GaussianBlur(rng.random((hh, ww)).astype(np.float32), (0, 0), 16); blot = (blot - blot.min()) / (np.ptp(blot) + 1e-6)
blot2 = cv2.GaussianBlur(rng.random((hh, ww)).astype(np.float32), (0, 0), 7); blot2 = (blot2 - blot2.min()) / (np.ptp(blot2) + 1e-6)
light = np.clip(1.3 - np.hypot(xx - 360, yy - 150) / 420, .7, 1.15)[..., None]
warm = np.array([150, 178, 205], np.float32); grey = np.array([178, 182, 184], np.float32)
brown = np.array([78, 92, 110], np.float32); blueg = np.array([196, 186, 170], np.float32)
col = warm * blot[..., None] + grey * (1 - blot[..., None])
col = col * .8 + blueg * .2 * blot2[..., None]
paint = col * (.84 + .2 * bands[..., None]) * light
edge = np.clip(1 - dist / 38, 0, 1)[..., None]
paint = paint * (1 - .7 * edge) + brown * (.9 + .6 * blot2[..., None]) * edge * .7
hi = (bands > .95) & (blot2 > .7) & (dist > 30)
paint[hi] = paint[hi] * .4 + 250 * .6
cl = crystallize(paint, cm > 0, 3800, 9)
finish(cl, cm, 'huitre-fermee.png')
print('ok')
