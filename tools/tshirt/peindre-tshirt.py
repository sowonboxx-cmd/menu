"""Photo du T-shirt Drevici → version peinte (huile, aquarelle, pastel), écusson gardé net. Sorties : tshirt-<style>.png (fond transparent)."""
import sys, cv2, numpy as np
sys.path.insert(0, '/home/claude/menu/tools/jeu')
import peinture as P
rng = np.random.default_rng(5)
im = cv2.imread('src/tshirt-detoure.png', cv2.IMREAD_UNCHANGED)
k = 900 / im.shape[1]; im = cv2.resize(im, None, fx=k, fy=k, interpolation=cv2.INTER_AREA)
a = im[..., 3].astype(np.float32); h, w = a.shape
# nettoyage du bord bas gauche (reste du canapé rouge)
hsv = cv2.cvtColor(im[..., :3], cv2.COLOR_BGR2HSV)
redm = (((hsv[..., 0] < 12) | (hsv[..., 0] > 160)) & (hsv[..., 1] > 110) & (hsv[..., 2] > 95)).astype(np.uint8)
a[cv2.dilate(redm, np.ones((5, 5), np.uint8)) > 0] = 0
a = cv2.GaussianBlur(cv2.erode(a, np.ones((3, 3), np.uint8)), (3, 3), 0)
# écusson : zone claire, ronde
g = cv2.cvtColor(im[..., :3], cv2.COLOR_BGR2GRAY)
bright = ((g > 150) & (a > 200)).astype(np.uint8)
n, lab, st, cen = cv2.connectedComponentsWithStats(cv2.morphologyEx(bright, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)))
i = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]); cx, cy = cen[i]; r = max(st[i, cv2.CC_STAT_WIDTH], st[i, cv2.CC_STAT_HEIGHT]) / 2 + 3
logo = np.zeros((h, w), np.float32); cv2.circle(logo, (int(cx), int(cy)), int(r), 1, -1); logo = cv2.GaussianBlur(logo, (0, 0), 1.5)
# T-shirt un peu éclairci pour que les plis se lisent en peinture
labc = cv2.cvtColor(im[..., :3], cv2.COLOR_BGR2LAB).astype(np.float32); labc[..., 0] = np.clip(labc[..., 0] * 1.25 + 12, 0, 255)
light = cv2.cvtColor(labc.astype(np.uint8), cv2.COLOR_LAB2BGR)
base = (light.astype(np.float32) * (a[..., None] / 255) + 244 * (1 - a[..., None] / 255)).astype(np.uint8)
orig = im[..., :3].astype(np.float32)

def finish(name, painted, al, logo_style):
    out = painted.astype(np.float32)
    L = logo_style(orig)
    out = out * (1 - logo[..., None]) + L * logo[..., None]
    cv2.imwrite(name, np.dstack([np.clip(out, 0, 255).astype(np.uint8), np.clip(al, 0, 255).astype(np.uint8)]))

soft = lambda r: (lambda o: P.kuwahara(o.astype(np.uint8), r))
# 1 · Huile : touches de pinceau douces
p = P.kuwahara(base, 4)
gg = cv2.GaussianBlur(cv2.cvtColor(p.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 6)
gx, gy = cv2.Sobel(gg, cv2.CV_32F, 1, 0), cv2.Sobel(gg, cv2.CV_32F, 0, 1)
J11, J22, J12 = [cv2.GaussianBlur(v, (0, 0), 14) for v in (gx * gx, gy * gy, gx * gy)]
ang = .5 * np.arctan2(2 * J12, J11 - J22) + np.pi / 2; vx, vy = np.cos(ang), np.sin(ang)
nz = rng.random((h, w)).astype(np.float32); acc = nz.copy(); yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
for sg in (1, -1):
    px, py = xx.copy(), yy.copy()
    for _ in range(7):
        ix, iy = np.clip(px, 0, w - 1).astype(int), np.clip(py, 0, h - 1).astype(int)
        px += sg * vx[iy, ix] * 1.3; py += sg * vy[iy, ix] * 1.3; acc += cv2.remap(nz, px, py, cv2.INTER_LINEAR)
acc = (acc - acc.mean()) / (acc.std() + 1e-6)
sh = np.clip(1 + .028 * (-cv2.Sobel(acc, cv2.CV_32F, 1, 0) - cv2.Sobel(acc, cv2.CV_32F, 0, 1)), .88, 1.12)
finish('tshirt-huile.png', p * sh[..., None], P.roughen_alpha(a, 3, 30), soft(2))
# 2 · Aquarelle : lavis, bords de pigment, papier, blancs qui respirent
o, al = P.aquarelle(base, a)
o = o.astype(np.float32); bl = P.noise(h, w, 70, 4)[..., None]
o = o * (.86 + .26 * bl) + 18 * (1 - bl)
finish('tshirt-aquarelle.png', o, al, lambda x: cv2.edgePreservingFilter(x.astype(np.uint8), flags=1, sigma_s=8, sigma_r=.2).astype(np.float32) * .97 + 6)
# 3 · Pastel : couleurs adoucies, hachures de craie, grain du papier
p = P.kuwahara(base, 3).astype(np.float32)
p = p * .82 + 255 * .18
hz = cv2.filter2D(rng.random((h, w)).astype(np.float32), -1, np.eye(15, dtype=np.float32) / 15)   # hachures à 45°
hz = (hz - hz.mean()) / (hz.std() + 1e-6)
grain = P.noise(h, w, 2.5, 2)
p = p * (1 + .07 * hz[..., None]) * (.93 + .1 * grain[..., None])
ed = cv2.Canny(cv2.GaussianBlur(base, (5, 5), 0), 30, 80).astype(np.float32) / 255
p = p * (1 - .25 * cv2.GaussianBlur(ed, (3, 3), 0)[..., None])
finish('tshirt-pastel.png', p, P.roughen_alpha(a, 4, 20), lambda x: (P.kuwahara(x.astype(np.uint8), 2) * .9 + 255 * .1))
print('ok', int(cx), int(cy), int(r))
