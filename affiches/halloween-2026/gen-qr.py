# QR de l'affiche Trick or Huître : points en losange, yeux arrondis, logo Drevici au centre sur fond bleu.
# python3 gen-qr.py <url> <part du logo> <sortie.svg> [logo inline: 1]
import sys, segno, base64, io
from PIL import Image
url, frac, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
inline = len(sys.argv) > 4
q = segno.make(url, error='h', boost_error=False)
m = [[bool(v) for v in row] for row in q.matrix]; n = len(m)
fin = lambda r, c: (r < 8 and c < 8) or (r < 8 and c >= n - 8) or (r >= n - 8 and c < 8)
L = int(round(n * frac)); L += (n - L) % 2; a = (n - L) // 2
parts = []
for r in range(n):
    for c in range(n):
        if fin(r, c) or not m[r][c]: continue
        if a <= r < a + L and a <= c < a + L: continue
        x, y = c + .5, r + .5
        parts.append(f'M{x} {y-.5}L{x+.5} {y}L{x} {y+.5}L{x-.5} {y}Z')
def rr(x0, y0, s, R, sharp):
    c = [R] * 4; c[sharp] = .4; tl, tr, br, bl = c
    return (f'M{x0+tl} {y0}H{x0+s-tr}A{tr} {tr} 0 0 1 {x0+s} {y0+tr}V{y0+s-br}A{br} {br} 0 0 1 {x0+s-br} {y0+s}'
            f'H{x0+bl}A{bl} {bl} 0 0 1 {x0} {y0+s-bl}V{y0+tl}A{tl} {tl} 0 0 1 {x0+tl} {y0}Z')
eyes = ''.join(rr(x, y, 7, 2.6, k) + rr(x + 1, y + 1, 5, 1.9, k) for x, y, k in [(0, 0, 3), (n - 7, 0, 2), (0, n - 7, 1)])
dots = ''.join(f'<circle cx="{x+3.5}" cy="{y+3.5}" r="1.55"/>' for x, y in [(0, 0), (n - 7, 0), (0, n - 7)])
href = 'logo.png'
if inline:
    im = Image.open('logo.png').convert('RGB').resize((1600, 1600), Image.LANCZOS); b = io.BytesIO(); im.save(b, 'PNG')
    href = 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()
x0, s = a + .25, L - .5
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 {n+2} {n+2}"{" width=\"1000\" height=\"1000\"" if inline else ""}>'
       f'<rect x="-1" y="-1" width="{n+2}" height="{n+2}" fill="#fff"/>'
       f'<path fill="#0c0a12" fill-rule="evenodd" d="{"".join(parts)}{eyes}"/><g fill="#0c0a12">{dots}</g>'
       f'<clipPath id="lc"><rect x="{x0}" y="{x0}" width="{s}" height="{s}" rx="{s*.18:.2f}"/></clipPath>'
       f'<rect x="{x0}" y="{x0}" width="{s}" height="{s}" rx="{s*.18:.2f}" fill="#253968"/>'
       f'<image clip-path="url(#lc)" href="{href}" x="{x0}" y="{x0}" width="{s}" height="{s}"/></svg>')
open(out, 'w').write(svg)
print(n, 'modules, logo', L, 'modules')
