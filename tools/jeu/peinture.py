"""Post-traitement « peinture » des huîtres rendues en SVG (assets/<style>-<piece>.png, RGBA).
aquarelle : lavis à plat, bords de pigment plus foncés, granulation, grain du papier, bords qui bavent
huile     : filtre de Kuwahara (touches de peinture) + empâtement orienté (coups de pinceau éclairés)
Usage : python3 peinture.py   (traite toutes les pièces, écrit assets/<style>-<piece>-p.png)"""
import cv2, numpy as np, pathlib
A = pathlib.Path(__file__).resolve().parent / 'assets'
rng = np.random.default_rng(3)

def noise(h, w, s, oct=3):
    n = np.zeros((h, w), np.float32)
    for o in range(oct):
        k = s / 2 ** o
        g = rng.random((int(h / k) + 2, int(w / k) + 2)).astype(np.float32)
        n += cv2.resize(g, (w, h), interpolation=cv2.INTER_CUBIC)[:h, :w] / 2 ** o
    return (n - n.min()) / (np.ptp(n) + 1e-6)

def roughen_alpha(a, amp, s):
    h, w = a.shape
    dx = (noise(h, w, s) - .5) * amp; dy = (noise(h, w, s) - .5) * amp
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    return cv2.remap(a, xx + dx, yy + dy, cv2.INTER_LINEAR)

def aquarelle(rgb, a):
    h, w = a.shape
    base = cv2.pyrMeanShiftFiltering(rgb, 9, 22, maxLevel=2)          # aplats de lavis
    base = cv2.edgePreservingFilter(base, flags=1, sigma_s=30, sigma_r=.25)
    g = cv2.cvtColor(base, cv2.COLOR_BGR2GRAY).astype(np.float32)
    # bords de pigment : là où la couleur change, le pigment s'accumule (plus foncé)
    e = cv2.morphologyEx(g, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8))
    e = cv2.GaussianBlur(np.clip(e / 40, 0, 1), (0, 0), 1.2)
    out = base.astype(np.float32) * (1 - .32 * e[..., None])
    # blooms : variations douces de densité
    bl = noise(h, w, 90, 4)
    out *= (.9 + .2 * bl[..., None])
    # granulation (plus visible dans les zones foncées)
    gr = noise(h, w, 3, 2)
    dark = 1 - g / 255
    out *= (1 - .18 * gr[..., None] * (.4 + dark[..., None]))
    # papier
    pap = noise(h, w, 6, 2)
    out = out * (.94 + .07 * pap[..., None])
    # les hautes lumières restent « papier »
    lum = cv2.cvtColor(np.clip(out, 0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
    out = np.where((lum > 225)[..., None], out * .3 + 252 * .7, out)
    a2 = roughen_alpha(a, 7, 40)
    a2 = cv2.GaussianBlur(a2, (0, 0), .8)
    return np.clip(out, 0, 255).astype(np.uint8), a2

def kuwahara(img, r):
    img = img.astype(np.float32); k = (r + 1, r + 1)
    means, vars_ = [], []
    for dy in (0, r):
        for dx in (0, r):
            M = cv2.blur(img, k); M2 = cv2.blur(img * img, k)
            sh = np.float32([[1, 0, dx - r / 2], [0, 1, dy - r / 2]])
            M = cv2.warpAffine(M, sh, (img.shape[1], img.shape[0]), borderMode=cv2.BORDER_REFLECT)
            M2 = cv2.warpAffine(M2, sh, (img.shape[1], img.shape[0]), borderMode=cv2.BORDER_REFLECT)
            means.append(M); vars_.append((M2 - M * M).sum(2))
    idx = np.argmin(np.stack(vars_), 0)
    return np.choose(idx[..., None], np.stack(means)).astype(np.float32)

def huile(rgb, a):
    h, w = a.shape
    p = kuwahara(rgb, 6)
    g = cv2.GaussianBlur(cv2.cvtColor(p.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 4)
    gx, gy = cv2.Sobel(g, cv2.CV_32F, 1, 0), cv2.Sobel(g, cv2.CV_32F, 0, 1)
    # direction des touches : le long des contours (perpendiculaire au gradient), lissée
    J11, J22, J12 = [cv2.GaussianBlur(v, (0, 0), 8) for v in (gx * gx, gy * gy, gx * gy)]
    ang = .5 * np.arctan2(2 * J12, J11 - J22) + np.pi / 2
    vx, vy = np.cos(ang), np.sin(ang)
    # convolution intégrale de bruit le long de ces directions = coups de pinceau
    n = rng.random((h, w)).astype(np.float32); acc = n.copy()
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    for sgn in (1, -1):
        px, py = xx.copy(), yy.copy()
        for _ in range(9):
            ix, iy = np.clip(px, 0, w - 1).astype(int), np.clip(py, 0, h - 1).astype(int)
            px += sgn * vx[iy, ix] * 1.4; py += sgn * vy[iy, ix] * 1.4
            acc += cv2.remap(n, px, py, cv2.INTER_LINEAR)
    acc = (acc - acc.mean()) / (acc.std() + 1e-6)
    # empâtement : relief éclairé du haut à gauche
    hx, hy = cv2.Sobel(acc, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(acc, cv2.CV_32F, 0, 1, ksize=3)
    shade = np.clip(1 + .045 * (-hx - hy), .8, 1.2)
    out = p * shade[..., None]
    a2 = roughen_alpha(a, 4, 25)
    return np.clip(out, 0, 255).astype(np.uint8), a2

if __name__ == '__main__':
    for st, fn in [('aquarelle', aquarelle), ('huile', huile)]:
        for pc in ['fermee', 'ouverte', 'couteau']:
            im = cv2.imread(str(A / f'{st}-{pc}.png'), cv2.IMREAD_UNCHANGED)
            a = im[..., 3].astype(np.float32)
            # fond neutre sous la transparence pour que les filtres ne tirent pas vers le noir
            rgb = (im[..., :3].astype(np.float32) * (a[..., None] / 255) + 244 * (1 - a[..., None] / 255)).astype(np.uint8)
            out, a2 = fn(rgb, a)
            cv2.imwrite(str(A / f'{st}-{pc}-p.png'), np.dstack([out, np.clip(a2, 0, 255).astype(np.uint8)]))
        # ouverte + perle : la perle reste nette, posée sur la peinture
        o = cv2.imread(str(A / f'{st}-ouverte-p.png'), cv2.IMREAD_UNCHANGED).astype(np.float32)
        pe = cv2.imread(str(A / f'{st}-perleseule.png'), cv2.IMREAD_UNCHANGED).astype(np.float32)
        a = pe[..., 3:] / 255
        o[..., :3] = o[..., :3] * (1 - a) + pe[..., :3] * a; o[..., 3:] = np.maximum(o[..., 3:], pe[..., 3:])
        cv2.imwrite(str(A / f'{st}-perle-p.png'), o.astype(np.uint8))
    print('ok')
