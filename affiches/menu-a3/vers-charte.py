# Copie les menus imprimables de Drevici Paris dans la charte (drevici-preview/charte/files/menus/).
# À relancer après chaque modification du menu (gen7.py / gen8.py puis node print7.js).
import shutil, os
from PIL import Image
H = os.path.dirname(os.path.abspath(__file__)); F = os.path.join(H, 'final')
D = os.path.join(H, '..', '..', 'drevici-preview', 'charte', 'files', 'menus'); os.makedirs(D, exist_ok=True)
P = 'DreviciOyster-Paris_Menu_'
def prev(src, dst, crop=0):
    im = Image.open(os.path.join(F, src)).convert('RGB'); w, h = im.size
    if crop: c = round(w * crop); im = im.crop((c, c, w - c, h - c))
    im.thumbnail((1000, 1400)); im.save(os.path.join(D, dst), quality=84, optimize=True)
for l in ('FR', 'EN'):
    s = l.lower()
    shutil.copy(os.path.join(F, f'carte-a4-{s}-fond-perdu.pdf'), os.path.join(D, f'{P}Carte-{l}_A4.pdf'))
    shutil.copy(os.path.join(F, f'carte-a3-{s}-fond-perdu.pdf'), os.path.join(D, f'{P}Carte-{l}_A3.pdf'))
    prev(f'carte-a4-{s}.png', f'{P}Carte-{l}.jpg')
for k, n in (('bateau', 'Bateau'), ('gentleman', 'Gentleman')):
    shutil.copy(os.path.join(F, f'couverture-{k}-menu.pdf'), os.path.join(D, f'{P}Couverture-{n}_A4.pdf'))
    prev(f'couverture-{k}-menu.png', f'{P}Couverture-{n}.jpg', crop=3/216)
print('ok', sorted(os.listdir(D)))
