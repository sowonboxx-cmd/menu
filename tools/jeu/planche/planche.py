"""Planche client : tous les écrans du jeu Free Oyster en une image (mode test, rien n'est enregistré)."""
import asyncio
from playwright.async_api import async_playwright
D = '/home/claude/menu/tools/jeu/planche/'
U = 'http://localhost:8765/free-oyster.html?test='
HIDE = "()=>{const t=[...document.body.children].find(e=>/Mode test/.test(e.textContent)&&e.style.position==='fixed'); if(t) t.remove();}"
async def to_open(pg, club=True):
    await pg.click('#s-home .cart'); await pg.wait_for_timeout(300)
    if club: await pg.click('.cv2')
    await pg.click('#fgo'); await pg.wait_for_timeout(400)
    await pg.click('[data-pick] >> nth=2'); await pg.wait_for_timeout(500)
async def slide(pg, until=70, release=True):
    kn = await pg.query_selector('#knob'); bb = await kn.bounding_box(); x, y = bb['x'] + 28, bb['y'] + 28
    await pg.mouse.move(x, y); await pg.mouse.down()
    for i in range(1, until): await pg.mouse.move(x + i * 5, y); await pg.wait_for_timeout(10)
    if release: await pg.mouse.up()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        async def page(mode):
            pg = await b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
            await pg.goto(U + mode, wait_until='networkidle'); await pg.evaluate('document.fonts.ready'); await pg.evaluate(HIDE); await pg.wait_for_timeout(300)
            return pg
        shots = []
        pg = await page('gagne'); await pg.screenshot(path=D + '1.png'); shots.append(('1', 'Le scan', 'Le poster renvoie ici. Les lots, un seul bouton, le règlement.'))
        await pg.click('#s-home .cart'); await pg.wait_for_timeout(2900); await pg.click('.cv2'); await pg.wait_for_timeout(200)
        for n, v in (('first', 'Claire'), ('last', 'Martin'), ('email', 'claire@exemple.fr'), ('phone', '06 12 34 56 78')): await pg.fill(f'[name={n}]', v)
        await pg.screenshot(path=D + '2.png'); shots.append(('2', 'L\'inscription', 'Nom, prénom, email, téléphone. Case du club facultative : carte et coupe offerte.'))
        await pg.click('#fgo'); await pg.wait_for_timeout(700); await pg.screenshot(path=D + '3.png'); shots.append(('3', 'Le choix', 'Trois huîtres qui respirent. On en touche une.'))
        await pg.click('[data-pick] >> nth=2'); await pg.wait_for_timeout(500)
        await slide(pg, 42, release=False); await pg.wait_for_timeout(120); await pg.screenshot(path=D + '4.png'); shots.append(('4', 'L\'ouverture', 'On glisse le couteau avec le pouce : l\'huître tremble, le téléphone vibre.'))
        await pg.close()
        for k, mode, t, d in (('5', 'gagne', 'Gagné · l\'huître', 'La perle scintille. Code à montrer au comptoir, valable 7 jours.'),
                              ('6', 'plateau', 'Gagné · le plateau', 'Le plateau de 6 huîtres, même ticket.'),
                              ('7', 'tshirt', 'Gagné · le T-shirt', 'Le T-shirt Drevici, même ticket.'),
                              ('8', 'perdu', 'Perdu', 'Une coupe vous attend (membres du club), faire jouer un ami pour rejouer, Instagram.')):
            pg = await page(mode); await to_open(pg, True); await slide(pg); await pg.wait_for_timeout(2300); await pg.screenshot(path=D + k + '.png'); shots.append((k, t, d)); await pg.close()
        # écran ordinateur
        pg = await b.new_page(viewport={'width': 1280, 'height': 920}); await pg.goto(U + 'gagne', wait_until='networkidle'); await pg.evaluate(HIDE); await pg.wait_for_timeout(300)
        await pg.screenshot(path=D + 'desk.png'); await pg.close()
        cards = ''.join(f'<figure><div class="ph"><img src="{k}.png"></div><figcaption><b><i>{k}</i>{t}</b><span>{d}</span></figcaption></figure>' for k, t, d in shots)
        html = f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Playfair+Display:ital,wght@0,800;1,800&family=Inter:wght@400;500;700&display=swap">
<style>*{{box-sizing:border-box;margin:0}}body{{background:#f4e6d1;font-family:Inter;width:2040px;padding:56px 60px 50px;color:#1a2540}}
.hd{{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:38px}}.hd h1{{font:64px/1 Anton;letter-spacing:.01em}}.hd p{{font:500 18px/1.5 Inter;color:#4a4740;max-width:900px;margin-top:10px}}
.br{{text-align:right}}.br b{{display:block;font:800 34px/1 'Playfair Display';color:#0d255c}}.br i{{font:italic 800 18px 'Playfair Display';color:#0d255c}}.br i em{{color:#8a1b1b}}
.grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:38px 34px}}
.ph{{background:#111;border-radius:46px;padding:11px;box-shadow:0 30px 50px -30px rgba(26,37,64,.55)}}.ph img{{width:100%;display:block;border-radius:36px}}
figcaption{{margin-top:14px}}figcaption b{{display:flex;align-items:center;gap:10px;font:700 19px Inter}}figcaption i{{font:normal 14px/26px Anton;width:28px;height:28px;border-radius:50%;background:#1a2540;color:#f4e6d1;text-align:center}}
figcaption span{{display:block;font:15px/1.45 Inter;color:#5a564e;margin-top:5px}}
.desk{{margin-top:48px;display:flex;gap:34px;align-items:center;background:#fff;border-radius:24px;padding:26px}}.desk img{{width:900px;border-radius:12px;display:block}}.desk h3{{font:700 22px Inter;margin-bottom:8px}}.desk p{{font:16px/1.55 Inter;color:#5a564e}}
.ft{{margin-top:34px;font:14px Inter;color:#7a7368;display:flex;justify-content:space-between}}</style></head><body>
<div class="hd"><div><h1>FREE OYSTER · OUVRE L'HUÎTRE</h1><p>Le jeu derrière les posters « FREE OYSTER ». Une partie par personne, une partie bonus si un ami joue avec son lien. Chances : 1 huître offerte sur 10, 1 plateau de 6 huîtres sur 50, 1 T-shirt sur 100.</p></div>
<div class="br"><b>DREVICI OYSTER</b><i>8 Rue Biot, 75017 <em>Paris</em></i></div></div>
<div class="grid">{cards}</div>
<div class="desk"><img src="desk.png"><div><h3>Sur ordinateur</h3><p>Le même jeu, centré dans un cadre bleu marine aux couleurs de Drevici.</p><p style="margin-top:14px">Chaque joueur entre dans la base clients, avec le poster scanné. Les membres du club reçoivent leur carte par email. Les codes gagnants se valident en un clic dans l'espace restaurateur.</p></div></div>
<div class="ft"><span>Jeu gratuit, sans obligation d'achat · règlement en ligne</span><span>Site et jeu : Beltab</span></div></body></html>'''
        open(D + 'planche.html', 'w').write(html)
        pg = await b.new_page(viewport={'width': 2160, 'height': 1200}, device_scale_factor=1)
        await pg.goto('file://' + D + 'planche.html', wait_until='networkidle'); await pg.evaluate('document.fonts.ready'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=D + 'Free-Oyster-ecrans.png', full_page=True); await b.close()
asyncio.run(main())
