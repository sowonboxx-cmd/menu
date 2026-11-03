# Eunoé · menu midi : 5 thèmes × 3 formats (Google Business 1080×1796, post 1080×1440, story 1080×1920)
import os
os.makedirs('out',exist_ok=True)
def P(n): vb,d=open(n+'.path').read().split('\n',1); return vb,d
DVB,DD=P('dessin'); LVB,LD=P('logo')
def dessin(cls=''): return f'<svg class="dessin {cls}" viewBox="{DVB}"><path fill="currentColor" fill-rule="evenodd" d="{DD}"/></svg>'
def logo(cls=''): return f'<svg class="logo {cls}" viewBox="{LVB}"><path fill="currentColor" fill-rule="evenodd" d="{LD}"/></svg>'
VAGUE='<svg class="vague" viewBox="0 0 1000 120" preserveAspectRatio="none"><path d="M0,40 C260,8 520,6 780,48 S960,118 1000,112" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>'
def ondes(n=9):  # le motif du « O » du logo, en grand
    out=''
    for i in range(n):
        y=100+i*(800/n); a=18+ (i%3)*10
        out+=f'<path d="M-50,{y:.0f} C150,{y-a:.0f} 300,{y+a:.0f} 500,{y:.0f} S800,{y-a:.0f} 1050,{y+a/2:.0f}" fill="none" stroke="currentColor" stroke-width="5"/>'
    return f'<svg class="ondes" viewBox="0 0 1000 1000"><defs><clipPath id="cc"><circle cx="500" cy="500" r="470"/></clipPath></defs><circle cx="500" cy="500" r="470" fill="none" stroke="currentColor" stroke-width="9"/><g clip-path="url(#cc)">{out}</g></svg>'

FORMULES=[('Entrée et plat <small>ou</small> plat et dessert','23 €'),('Entrée, plat et dessert','27 €'),('<u>Menu découverte</u> en 5 temps*','37 €')]
CARTE=[('entrées','8 €',[('Boudin noir maison','chutney de coing, sauce matelote'),('Tofu de haricot blanc maison','bouillon de champignons et seiche grillée')]),
       ('plats','16 €',[('Truite de mer de Normandie','sauce crémeuse au raifort et aux herbes, légumes de saison'),('Poitrine de bœuf confite','purée de céleri rave et panais, jus de viande, condiment ail noir')]),
       ('desserts','8 €',[('Ganache au chocolat noir','gruée de cacao, crème montée, huile de basilic'),('Mousse de cèpe','châtaigne, biscuit à l\'origan et glace au shiso vert')])]
FONTS='<link href="https://fonts.googleapis.com/css2?family=Gloock&family=Archivo:wght@500;600;700&family=Didact+Gothic&family=Cormorant+Garamond:ital,wght@1,500&display=swap" rel="stylesheet">'
FMT={'google':(1080,1796),'post':(1080,1440),'story':(1080,1920)}
# thèmes : fond, encre, accent (prix / filets), papier secondaire
TH={
 'a-papier': dict(bg='#e8ecef',ink='#1d1d22',acc='#1d1d22',soft='#9aa3ab',name='Papier'),
 'b-nuit':   dict(bg='#1b2130',ink='#efe9df',acc='#d9b98a',soft='#5d6680',name='Nuit'),
 'c-sable':  dict(bg='#f1e8da',ink='#2a2420',acc='#b4583a',soft='#c9b79c',name='Sable'),
 'd-ocean':  dict(bg='#dfe7ea',ink='#173244',acc='#2f6f86',soft='#9fb9c3',name='Océan'),
 'e-blanc':  dict(bg='#fbfaf7',ink='#202020',acc='#202020',soft='#d6d2c8',name='Blanc'),
}
def page(theme,fmt):
    W,H=FMT[fmt]; t=TH[theme]
    # échelle de texte et marges selon le format
    k={'google':1.0,'post':0.88,'story':1.0}[fmt]; m={'google':1.0,'post':0.8,'story':1.0}[fmt]
    top={'google':70,'post':56,'story':190}[fmt]; bot={'google':60,'post':46,'story':200}[fmt]
    css=f"""*{{box-sizing:border-box;margin:0;padding:0}}html,body{{width:{W}px;height:{H}px;overflow:hidden}}
:root{{--bg:{t['bg']};--ink:{t['ink']};--acc:{t['acc']};--soft:{t['soft']};--k:{k};--m:{m}}}
body{{background:var(--bg);color:var(--ink);font-family:'Didact Gothic',sans-serif;-webkit-font-smoothing:antialiased}}
.p{{position:relative;width:{W}px;height:{H}px;padding:{top}px 96px {bot}px;display:flex;flex-direction:column;overflow:hidden}}
.hd{{position:relative;z-index:2}}
h1{{font-family:Gloock,serif;font-weight:400;font-size:calc(118px*var(--k));line-height:.95;letter-spacing:-.01em}}
.jours{{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:500;font-size:calc(31px*var(--k));margin:calc(8px*var(--k)) 0 calc(22px*var(--k))}}
.f{{font-family:Archivo,sans-serif;font-weight:600;text-transform:uppercase;font-size:calc(25px*var(--k));letter-spacing:.02em;line-height:1.75;max-width:590px}}
.f div{{display:flex;gap:14px;align-items:baseline}}.f i{{flex:1;border-bottom:1.5px dotted var(--soft);transform:translateY(-6px);min-width:20px}}
.f b{{font-weight:700;color:var(--acc)}}.f small{{font-size:.8em;text-transform:none;font-weight:500}}.f u{{text-underline-offset:5px;text-decoration-thickness:2px}}
.note{{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:calc(22px*var(--k));opacity:.8;margin-top:2px}}
.dessin{{position:absolute;color:var(--ink);z-index:1}}
.vague{{position:absolute;color:var(--ink);opacity:.9}}
.mid{{flex:1;display:flex;flex-direction:column;justify-content:space-evenly;text-align:center;position:relative;z-index:2;padding:calc(10px*var(--k)) 0}}
.beurre{{font-size:calc(31px*var(--m))}}.beurre b,.sec h2 span{{font-family:Archivo,sans-serif;font-weight:700;color:var(--acc)}}
.sec h2{{font-family:Gloock,serif;font-weight:400;font-size:calc(58px*var(--m));margin-bottom:calc(14px*var(--m))}}
.sec h2 span{{font-size:.72em;margin-left:.15em}}
.d{{margin:0 auto calc(22px*var(--m));max-width:860px}}.d:last-child{{margin-bottom:0}}
.d b{{display:block;font-weight:400;font-size:calc(35px*var(--m));letter-spacing:.01em}}
.d span{{display:block;font-size:calc(26px*var(--m));opacity:.75;margin-top:3px;line-height:1.35}}
.ft{{position:relative;z-index:2;display:flex;justify-content:center}}
.logo{{height:calc(120px*var(--k));width:auto;color:var(--ink)}}
.side{{position:absolute;z-index:1}}
.vt{{position:absolute;writing-mode:vertical-rl;transform:rotate(180deg);font-family:Archivo,sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:.42em;font-size:15px;color:var(--soft)}}
.ondes{{position:absolute;color:var(--soft)}}
"""
    # décor propre à chaque thème (« les petits effets sur le côté »)
    dW={'google':370,'post':320,'story':370}[fmt]
    deco=''
    if theme=='a-papier':
        css+=f".dessin{{width:{dW}px;right:40px;top:{top-20}px}}.vague{{left:0;top:{top-30}px;width:620px;height:70px}}"
        deco=VAGUE+f'<div class="vt" style="left:34px;bottom:{bot+20}px">Menu midi · du mardi au vendredi</div><div style="position:absolute;left:52px;top:{top+260}px;bottom:{bot+330}px;border-left:1.5px solid var(--soft)"></div>'
    elif theme=='b-nuit':
        css+=f".dessin{{width:{dW}px;right:30px;top:{top-10}px}}.ondes{{width:520px;right:-300px;top:{int(H*.52)}px;opacity:.55}}"
        deco=ondes()+f'<div class="vt" style="left:36px;top:{top+40}px;color:var(--acc)">Eunoé · restaurant</div>'
    elif theme=='c-sable':
        css+=f".dessin{{width:{int(dW*1.05)}px;right:46px;top:{top-6}px;color:var(--acc)}}.p::before{{content:'';position:absolute;inset:26px;border:1.5px solid var(--soft);border-radius:4px;pointer-events:none}}.p::after{{content:'';position:absolute;inset:36px;border:1px solid var(--soft);opacity:.6;border-radius:2px;pointer-events:none}}"
    elif theme=='d-ocean':
        css+=f".dessin{{width:{dW}px;right:44px;top:{top-10}px}}.ondes{{width:640px;left:-430px;top:{int(H*.40)}px;opacity:.7}}.ondes2{{width:300px;right:-170px;bottom:{bot+140}px;top:auto;opacity:.5}}"
        deco=ondes()+ondes().replace('class="ondes"','class="ondes ondes2"')
    elif theme=='e-blanc':
        css+=f".dessin{{width:{dW-40}px;right:70px;top:{top}px}}.vague{{right:0;bottom:{bot+150}px;width:560px;height:60px;transform:scaleX(-1);color:var(--soft)}}.vague2{{left:0;top:{int(H*.42)}px;width:300px;height:50px;color:var(--soft)}}"
        deco=VAGUE+VAGUE.replace('class="vague"','class="vague vague2"')+f'<div class="vt" style="right:30px;top:{int(H*.40)}px;transform:none">Eunoé</div>'+dessin('bigd')
        css+=f".bigd{{width:{int(W*.95)}px;right:{-int(W*.38)}px;bottom:{-int(W*.12)}px;top:auto;opacity:.07;z-index:0}}"
    f=''.join(f'<div><span>{a}</span><i></i><b>{p}</b></div>' for a,p in FORMULES)
    sec=''.join(f'<div class="sec"><h2>{n} <span>_ {p}</span></h2>'+''.join(f'<div class="d"><b>{a}</b><span>{b}</span></div>' for a,b in ds)+'</div>' for n,p,ds in CARTE)
    html=f"""<!doctype html><html lang="fr"><head><meta charset="utf-8">{FONTS}<style>{css}</style></head><body><div class="p">{deco}{dessin()}
<div class="hd"><h1>menu midi</h1><div class="jours">du mardi au vendredi (hors jours fériés)</div><div class="f">{f}</div><div class="note">* disponible à la commande entre 12 h et 13 h 30</div></div>
<div class="mid"><div class="beurre">Beurre Kawaii au Kombu-cha fumé <b>_ 3 €</b></div>{sec}</div>
<div class="ft">{logo()}</div></div></body></html>"""
    open(f'out/{theme}_{fmt}.html','w').write(html)
for th in TH:
    for fm in FMT: page(th,fm)
print('ok')
