#!/usr/bin/env python3
"""Publie la préview Drevici (drevici-preview/) vers le site en ligne (drevici/).
À lancer UNIQUEMENT quand Will a dit « publie ».
Copie les fichiers du site, puis remplace les réglages « copie de test » par ceux du vrai restaurant.
Ne touche pas aux fichiers propres au site en ligne (reservations.html = ancien admin, calendar.html, fidelite.html, qrc/qrf, edito.json, menu.json, cabine/)."""
import shutil, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, DST = os.path.join(ROOT, 'drevici-preview'), os.path.join(ROOT, 'drevici')
FILES = ['index.html', 'resa.html', 'admin.html', 'gestion.html', 'floorplan.js']
DIRS = ['club', 'seo', 'media', 'charte']

def sub(text, old, new, path):
    if old not in text: sys.exit(f'⚠ {path} : motif introuvable → {old[:70]}')
    return text.replace(old, new)

# L'ancien tableau des réservations (drevici/admin.html, propre au site en ligne) libère /admin
# pour le nouvel espace restaurateur : il est gardé sous /reservations.
old = os.path.join(DST, 'admin.html')
if os.path.exists(old) and 'Espace restaurateur' not in open(old, encoding='utf-8').read() and not os.path.exists(os.path.join(DST, 'reservations.html')):
    os.rename(old, os.path.join(DST, 'reservations.html'))
for f in FILES: shutil.copy2(os.path.join(SRC, f), os.path.join(DST, f))
for d in DIRS:
    if os.path.isdir(os.path.join(SRC, d)): shutil.copytree(os.path.join(SRC, d), os.path.join(DST, d), dirs_exist_ok=True)

P = {
 'index.html': [
   ("const CLIENT_SLUG_RACINE = 'drevici-preview';", "const CLIENT_SLUG_RACINE = 'drevici';"),
   ("const CLUB_ON = /preview|localhost|127\\.0\\.0\\.1|file:/.test(location.href);", "const CLUB_ON = true;"),
   ("const CLUB_SLUG = 'drevici-test';", "const CLUB_SLUG = 'drevici-paris';"),
 ],
 'resa.html': [
   ("const WRITE_SLUG = 'drevici-test';", "const WRITE_SLUG = 'drevici-paris';"),
 ],
 'admin.html': [
   ("const SLUG=QS.get('slug')||'drevici-test';", "const SLUG=QS.get('slug')||'drevici';"),
   ("const SITE_URL='https://drevici-preview.beltab.app/';", "const SITE_URL='https://drevici.beltab.app/';"),
   ("const CL_SLUG=SLUG;", "const CL_SLUG='drevici-paris';"),
   (" · <span class=\"pill-test\">Copie de test</span>", ""),
 ],
}
for f, pairs in P.items():
    p = os.path.join(DST, f); t = open(p, encoding='utf-8').read()
    for a, b in pairs: t = sub(t, a, b, f)
    open(p, 'w', encoding='utf-8').write(t)
# garde-fou : plus aucune trace des réglages de test dans le site en ligne
for f in FILES:
    t = open(os.path.join(DST, f), encoding='utf-8').read()
    bad = [m for m in ("'drevici-test'", "drevici-preview.beltab.app") if m in t]
    if bad: sys.exit(f'⚠ {f} contient encore {bad}')
print('OK : préview copiée dans drevici/ avec les réglages du vrai restaurant.')
