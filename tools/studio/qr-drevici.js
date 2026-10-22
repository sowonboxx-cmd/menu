// QR codes Drevici : plusieurs styles de modules, huître au centre. Correction d'erreur H (30 %).
// qrDrevici(texte, taille, {style, eye, color})
// style : losange | rond | goutte | liquide | barres | etoile | croix | pixel
// eye   : feuille | rond | carre
const OY_PATH = "M1819 2560 c-25 -4 -79 -23 -120 -41 -69 -31 -84 -34 -214 -39 -125 -6 -146 -9 -196 -33 -33 -16 -75 -47 -99 -75 -23 -26 -54 -60 -69 -77 -15 -16 -56 -45 -91 -64 -126 -67 -223 -191 -251 -320 -8 -37 -24 -66 -56 -104 -65 -76 -74 -98 -82 -211 -7 -92 -12 -108 -50 -183 -67 -130 -66 -245 4 -399 19 -42 40 -106 45 -143 16 -102 36 -151 90 -221 28 -36 80 -109 116 -162 106 -158 164 -195 312 -205 75 -5 95 -3 135 15 62 28 150 112 249 239 43 57 104 124 135 150 123 106 148 131 200 201 46 61 65 78 125 108 94 47 158 109 233 224 35 52 93 131 130 175 84 101 103 138 125 244 12 59 29 106 55 148 28 47 38 77 42 122 7 77 2 96 -45 158 -36 48 -40 60 -45 133 -14 173 -99 251 -297 271 -81 9 -105 16 -165 49 -77 42 -140 53 -216 40z m184 -104 c74 -39 91 -44 172 -51 106 -8 158 -28 202 -78 38 -43 53 -91 53 -168 0 -49 5 -62 45 -119 37 -52 45 -72 45 -107 0 -43 -23 -100 -62 -155 -10 -15 -27 -67 -38 -117 -23 -111 -32 -127 -115 -227 -36 -43 -89 -116 -116 -160 -63 -103 -127 -167 -204 -206 -91 -46 -110 -63 -166 -144 -37 -53 -78 -96 -141 -145 -96 -76 -98 -73 -18 46 48 71 92 115 218 217 80 65 206 202 273 298 57 81 163 271 184 330 40 113 38 267 -5 381 -59 159 -260 270 -490 272 -163 1 -440 -75 -578 -158 -165 -100 -252 -191 -365 -381 -124 -212 -176 -420 -164 -659 10 -176 33 -275 104 -443 20 -45 34 -85 31 -87 -5 -5 -108 128 -127 162 -6 12 -20 66 -31 119 -11 54 -34 126 -50 161 -36 76 -49 130 -50 204 0 46 8 72 46 150 41 84 47 104 53 189 8 103 22 139 71 185 39 37 54 65 70 135 27 117 90 197 212 268 54 31 98 67 144 119 96 106 118 116 294 123 135 6 150 9 220 39 150 66 173 66 283 7z m-28 -201 c230 -60 335 -188 335 -408 0 -96 -24 -170 -101 -307 -114 -204 -231 -346 -402 -484 -51 -41 -106 -89 -123 -107 -48 -52 -132 -181 -180 -277 -24 -48 -43 -80 -43 -72 -1 22 113 253 146 297 15 21 94 103 174 183 152 151 202 217 289 383 77 146 96 249 65 353 -29 99 -112 177 -224 210 -68 20 -273 14 -391 -11 -153 -33 -340 -152 -449 -287 -93 -114 -195 -342 -227 -506 -21 -112 -16 -323 12 -427 5 -18 4 -18 -6 -2 -6 10 -23 61 -37 115 -21 82 -25 120 -26 247 -1 232 22 333 119 528 160 318 335 458 684 547 175 44 283 51 385 25z m-67 -282 c94 -28 171 -114 186 -209 16 -93 -59 -300 -159 -438 -24 -34 -109 -127 -188 -208 -169 -171 -177 -181 -258 -319 -33 -57 -58 -93 -54 -79 14 52 64 148 119 228 141 207 173 345 124 538 -27 106 -58 142 -147 169 -77 23 -140 17 -222 -22 -188 -88 -293 -232 -360 -491 -48 -187 -38 -384 26 -516 l25 -51 -29 32 c-52 56 -92 246 -92 438 0 96 5 139 24 215 97 370 328 631 621 700 171 41 279 44 384 13z m-396 -365 c62 -18 93 -55 117 -135 25 -84 27 -173 5 -256 -19 -75 -41 -118 -114 -227 -75 -112 -100 -163 -144 -297 -38 -115 -69 -165 -122 -202 -70 -48 -146 -32 -214 46 -30 34 -32 38 -15 42 11 2 26 -5 35 -16 46 -57 125 -70 186 -32 48 29 80 90 124 232 21 67 50 154 65 192 58 150 6 270 -122 282 -131 13 -272 -124 -309 -298 -15 -72 -15 -196 1 -244 4 -12 0 -9 -9 6 -44 76 -45 292 -1 444 63 217 169 361 324 438 79 40 125 46 193 25z m-162 -433 c68 -35 78 -109 31 -227 -16 -40 -45 -126 -65 -191 -44 -142 -84 -197 -143 -197 -44 0 -96 49 -112 105 -20 67 -25 179 -12 247 17 87 42 138 93 194 69 76 146 101 208 69z m-281 -741 c70 -46 183 -31 247 33 10 10 29 18 43 19 14 0 43 4 64 8 25 4 37 3 37 -4 0 -18 -60 -68 -145 -120 -73 -46 -85 -50 -142 -50 -80 0 -98 8 -166 70 -60 55 -63 62 -46 107 l10 28 29 -32 c16 -17 47 -44 69 -59z";
function qrDrevici(text, size, opt = {}) {
  const qr = qrcode(0, 'H'); qr.addData(text); qr.make();
  const n = qr.getModuleCount(), q = 2, N = n + 2 * q, u = size / N, col = opt.color || '#000';
  const style = opt.style || 'losange', eyeSt = opt.eye || 'feuille';
  const logoMods = Math.round(n * 0.26) | 1, l0 = (n - logoMods) / 2;
  const inEye = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const inLogo = (r, c) => r >= l0 - .5 && r < l0 + logoMods + .5 && c >= l0 - .5 && c < l0 + logoMods + .5;
  const on = (r, c) => r >= 0 && c >= 0 && r < n && c < n && qr.isDark(r, c) && !inEye(r, c) && !inLogo(r, c);
  const X = c => (c + q) * u, Y = r => (r + q) * u;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!on(r, c)) continue;
    const x = X(c) + u / 2, y = Y(r) + u / 2;
    if (style === 'losange') { const s = u * .56; d += `M${x} ${y - s}L${x + s} ${y}L${x} ${y + s}L${x - s} ${y}Z`; }
    else if (style === 'rond') { const s = u * .45; d += `M${x - s} ${y}a${s} ${s} 0 1 0 ${2 * s} 0a${s} ${s} 0 1 0 ${-2 * s} 0Z`; }
    else if (style === 'pixel') { const s = u * .42; d += `M${x - s} ${y - s}h${2 * s}v${2 * s}h${-2 * s}Z`; }
    else if (style === 'etoile') { const a = u * .62, b = u * .14; d += `M${x} ${y - a}L${x + b} ${y - b}L${x + a} ${y}L${x + b} ${y + b}L${x} ${y + a}L${x - b} ${y + b}L${x - a} ${y}L${x - b} ${y - b}Z`; }
    else if (style === 'croix') { const a = u * .5, b = u * .18; d += `M${x - b} ${y - a}h${2 * b}v${a - b}h${a - b}v${2 * b}h${b - a}v${a - b}h${-2 * b}v${b - a}h${b - a}v${-2 * b}h${a - b}Z`; }
    else if (style === 'goutte') { // gouttes orientées vers le centre, comme des huîtres
      const s = u * .48, ang = Math.atan2(n / 2 - r, n / 2 - c) * 180 / Math.PI;
      d += `M${x} ${y}m0 0` ; // placeholder (dessiné plus bas en <use>)
      DROPS.push(`<path transform="translate(${x} ${y}) rotate(${ang + 45})" d="M${-s} 0A${s} ${s} 0 1 0 0 ${-s}H${-s}Z"/>`);
    }
    else if (style === 'liquide' || style === 'barres') {
      const R = u * .5, up = on(r - 1, c), dn = on(r + 1, c), lf = on(r, c - 1), rt = on(r, c + 1);
      if (style === 'barres') { // pilules verticales
        const w = u * .36, t = Y(r) + (up ? 0 : u * .12), b2 = Y(r + 1) - (dn ? 0 : u * .12), rr = up && dn ? 0 : w;
        d += `M${x - w} ${t + (up ? 0 : rr)}${up ? `V${t}` : `A${w} ${w} 0 0 1 ${x + w} ${t + rr}`}${up ? `H${x + w}` : ''}V${b2 - (dn ? 0 : rr)}${dn ? `V${b2}H${x - w}` : `A${w} ${w} 0 0 1 ${x - w} ${b2 - rr}`}Z`;
      } else { // liquide : carrés aux coins arrondis seulement là où rien ne touche
        const k = R * .9, x0 = X(c), y0 = Y(r), x1 = x0 + u, y1 = y0 + u;
        const tl = !up && !lf ? k : 0, tr = !up && !rt ? k : 0, br = !dn && !rt ? k : 0, bl = !dn && !lf ? k : 0;
        d += `M${x0 + tl} ${y0}H${x1 - tr}${tr ? `A${tr} ${tr} 0 0 1 ${x1} ${y0 + tr}` : ''}V${y1 - br}${br ? `A${br} ${br} 0 0 1 ${x1 - br} ${y1}` : ''}H${x0 + bl}${bl ? `A${bl} ${bl} 0 0 1 ${x0} ${y1 - bl}` : ''}V${y0 + tl}${tl ? `A${tl} ${tl} 0 0 1 ${x0 + tl} ${y0}` : ''}Z`;
      }
    }
  }
  const eye = (r0, c0, sharp) => {
    const x = X(c0), y = Y(r0), S = 7 * u, t = u;
    if (eyeSt === 'rond') return `<circle cx="${x + S / 2}" cy="${y + S / 2}" r="${S / 2 - t / 2}" fill="none" stroke="${col}" stroke-width="${t}"/><circle cx="${x + S / 2}" cy="${y + S / 2}" r="${1.55 * u}" fill="${col}"/>`;
    if (eyeSt === 'carre') return `<path fill="${col}" fill-rule="evenodd" d="M${x} ${y}h${S}v${S}h${-S}Z M${x + t} ${y + t}v${S - 2 * t}h${S - 2 * t}v${-(S - 2 * t)}Z"/><rect x="${x + 2 * u}" y="${y + 2 * u}" width="${3 * u}" height="${3 * u}" fill="${col}"/>`;
    const leaf = (x, y, S, R, k) => { const rr = [R, R, R, R]; rr[k] = 0;
      return `M${x + rr[0]} ${y}H${x + S - rr[1]}Q${x + S} ${y} ${x + S} ${y + rr[1]}V${y + S - rr[2]}Q${x + S} ${y + S} ${x + S - rr[2]} ${y + S}H${x + rr[3]}Q${x} ${y + S} ${x} ${y + S - rr[3]}V${y + rr[0]}Q${x} ${y} ${x + rr[0]} ${y}Z`; };
    return `<path fill="${col}" fill-rule="evenodd" d="${leaf(x, y, S, 2.6 * u, sharp)}${leaf(x + t, y + t, S - 2 * t, 1.56 * u, sharp)}"/><circle cx="${x + S / 2}" cy="${y + S / 2}" r="${1.55 * u}" fill="${col}"/>`;
  };
  const L = logoMods * u, lx = (l0 + q) * u, ly = lx;
  const logo = `<rect x="${lx}" y="${ly}" width="${L}" height="${L}" rx="${L * .2}" fill="${col}"/>
    <g transform="translate(${lx + L * .12} ${ly + L * .12}) scale(${L * .76 / 314}) translate(0 308) scale(.1 -.1)"><path fill="#fff" d="${OY_PATH}"/></g>`;
  const drops = DROPS.splice(0).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#fff"/><path fill="${col}" d="${d}"/><g fill="${col}">${drops}</g>${eye(0, 0, 2)}${eye(0, n - 7, 3)}${eye(n - 7, 0, 1)}${logo}</svg>`;
}
const DROPS = [];
