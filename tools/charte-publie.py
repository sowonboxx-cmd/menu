#!/usr/bin/env python3
"""Publie la charte de Drevici (drevici-preview/charte → drevici/charte) en changeant la version toute seule.
python3 tools/charte-publie.py "Ce qui a changé"
- Si rien n'a changé depuis la dernière publication : rien n'est publié.
- Sinon : version +0.1, date du jour (« 1er novembre 2026 »), ligne ajoutée dans « Versions »."""
import os, sys, json, hashlib, shutil, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, DST = os.path.join(ROOT, 'drevici-preview', 'charte'), os.path.join(ROOT, 'drevici', 'charte')
MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
def empreinte(dossier):
    h = hashlib.sha256()
    for base, _, fichiers in sorted(os.walk(dossier)):
        for f in sorted(fichiers):
            p = os.path.join(base, f); rel = os.path.relpath(p, dossier)
            data = open(p, 'rb').read()
            if rel == 'charte.json':
                d = json.loads(data); b = d['brand']
                for k in ('version', 'date', 'changes'): b.pop(k, None)
                data = json.dumps(d, sort_keys=True, ensure_ascii=False).encode()
            h.update(rel.encode() + b'\0' + data)
    return h.hexdigest()
if os.path.isdir(DST) and empreinte(SRC) == empreinte(DST):
    sys.exit('Rien à publier : la charte en ligne est déjà à jour.')
note = ' '.join(sys.argv[1:]).strip() or 'Mise à jour des fichiers.'
p = os.path.join(SRC, 'charte.json'); d = json.load(open(p)); b = d['brand']
maj, mi = (b.get('version') or '1.0').split('.')
b['version'] = f'{maj}.{int(mi) + 1}'
t = datetime.date.today()
b['date'] = f"{'1er' if t.day == 1 else t.day} {MOIS[t.month - 1]} {t.year}"
b.setdefault('changes', []).append({'version': b['version'], 'date': b['date'], 'text': note})
json.dump(d, open(p, 'w'), ensure_ascii=False, indent=2)
shutil.rmtree(DST, ignore_errors=True); shutil.copytree(SRC, DST)
print(f"Charte publiée : version {b['version']} du {b['date']}")
