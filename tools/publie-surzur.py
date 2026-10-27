#!/usr/bin/env python3
"""Fabrique le site de Drevici Surzur (drevici-surzur/) à partir du site de Paris déjà publié (drevici/).
Lancé automatiquement à la fin de publie-drevici.py : Paris et Surzur restent toujours sur la même version.

Surzur a SES données : carte « drevici-surzur », réservations / clients / stats « drevici-surzur ».
Seul le club est commun aux deux établissements (une seule carte de membre) : CLUB_SLUG reste « drevici-paris ».
Garde-fou final : le script s'arrête si un réglage de Paris traîne encore dans un fichier de Surzur."""
import os, re, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, DST = os.path.join(ROOT, 'drevici'), os.path.join(ROOT, 'drevici-surzur')
HOST = 'https://drevici-surzur.beltab.app/'
SLUG = 'drevici-surzur'
FILES = ['index.html', 'book.html', 'resa.html', 'admin.html', 'gestion.html', 'floorplan.js', 'confidentialite.html']
DIRS = ['club', 'seo', 'media']

def sub(t, old, new, f, count=1):
    n = t.count(old)
    if n == 0: sys.exit(f'⚠ Surzur {f} : motif introuvable → {old[:80]}')
    if count and n != count: sys.exit(f'⚠ Surzur {f} : {n} occurrences (attendu {count}) → {old[:80]}')
    return t.replace(old, new)

os.makedirs(DST, exist_ok=True)
for f in FILES: shutil.copy2(os.path.join(SRC, f), os.path.join(DST, f))
for f in ('apple-touch-icon.png', 'icon-512.png'): shutil.copy2(os.path.join(SRC, f), os.path.join(DST, f))
for d in DIRS: shutil.copytree(os.path.join(SRC, d), os.path.join(DST, d), dirs_exist_ok=True)
os.makedirs(os.path.join(DST, 'studio'), exist_ok=True)
shutil.copy2(os.path.join(SRC, 'studio', 'index.html'), os.path.join(DST, 'studio', 'index.html'))
for x in ('qr-drevici.js', 'huitre-qr.svg'): shutil.copy2(os.path.join(SRC, 'studio', x), os.path.join(DST, 'studio', x))

P = {
 'index.html': [
   ("const CLIENT_SLUG_RACINE = 'drevici';", f"const CLIENT_SLUG_RACINE = '{SLUG}';", 1),
   ("const PROD_BASE = 'https://drevici.beltab.app/';", f"const PROD_BASE = '{HOST}';", 1),
 ],
 'book.html': [
   ("const CLIENT_SLUG = 'drevici-paris';", f"const CLIENT_SLUG = '{SLUG}';", 1),
   ("const WRITE_SLUG = 'drevici-paris';", f"const WRITE_SLUG = '{SLUG}';", 1),
   ("const MENU_CLIENT_SLUG = 'drevici';", f"const MENU_CLIENT_SLUG = '{SLUG}';", 1),
   ("const LOCATION_NAME = 'Paris';", "const LOCATION_NAME = 'Surzur';", 1),
 ],
 'admin.html': [
   ("const SLUG=QS.get('slug')||'drevici';", f"const SLUG=QS.get('slug')||'{SLUG}';", 1),
   ("const RESA_SLUG='drevici-paris', STATS_SLUG='drevici';", f"const RESA_SLUG='{SLUG}', STATS_SLUG='{SLUG}';", 1),
   ("const CL_SLUG='drevici-paris';", f"const CL_SLUG='{SLUG}';", 1),
   ("https://drevici.beltab.app/", HOST, 0),
 ],
 'studio/index.html': [
   ("const MENU_SLUG='drevici';", f"const MENU_SLUG='{SLUG}';", 1),
   ("const RESA_SLUG='drevici-paris';", f"const RESA_SLUG='{SLUG}';", 1),
   ("ADDRESS='8 rue Biot, 75017 Paris'", "ADDRESS='Pentes, 56450 Surzur'", 1),
   ("https://drevici.beltab.app/", HOST, 0),
   ("const QR_SITE='https://drevici.beltab.app';", "const QR_SITE='" + HOST.rstrip('/') + "';", 1),
 ],
}
for f, pairs in P.items():
    p = os.path.join(DST, f); t = open(p, encoding='utf-8').read()
    for a, b, c in pairs: t = sub(t, a, b, f, c)
    open(p, 'w', encoding='utf-8').write(t)

# Garde-fou : aucun réglage de Paris ne doit rester (sauf le club, commun, et des commentaires).
ALLOWED = {('index.html', "const CLUB_SLUG = 'drevici-paris';"),
           ('studio/index.html', "const JEU_SLUG='drevici-paris';")}   # le jeu Free Oyster est celui de Paris (club commun)
bad = []
for f in FILES + ['studio/index.html']:
    for i, line in enumerate(open(os.path.join(DST, f), encoding='utf-8'), 1):
        code = line.split('//')[0] if f.endswith(('.js', '.html')) else line
        for m in ("'drevici-paris'", "'drevici'", "drevici.beltab.app", "'drevici-test'", "drevici-preview.beltab.app"):
            if m in code and not any(f == af and a in line for af, a in ALLOWED):
                if m == "'drevici'" and ("?'drevici':'neutre'" in code or "SLUG!=='drevici'" in code): continue
                bad.append(f'{f}:{i}: {line.strip()[:110]}')
if bad: sys.exit('⚠ Surzur : réglages de Paris encore présents :\n' + '\n'.join(bad))
print('OK : drevici-surzur/ fabriqué à partir de drevici/.')
