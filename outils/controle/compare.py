# Compare les captures EN LIGNE / PREVIEW et fabrique les images du rapport :
# côte à côte, zones changées entourées en rouge, pourcentage de pixels modifiés.
#   python3 outils/controle/compare.py <dossier-sortie>
import json,sys,os
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
D=sys.argv[1]; R=json.load(open(os.path.join(D,'resultats.json')))
paires={}
for e in R['ecrans']: paires.setdefault((e['vue'],e['nom']),{})[e['site']]=e['f']
out=[]
for (vue,nom),fs in sorted(paires.items()):
    if 'enligne' not in fs or 'preview' not in fs: out.append({'vue':vue,'nom':nom,'manque':True}); continue
    a=Image.open(os.path.join(D,fs['enligne'])).convert('RGB'); b=Image.open(os.path.join(D,fs['preview'])).convert('RGB')
    W=max(a.width,b.width); H=max(a.height,b.height)
    A=Image.new('RGB',(W,H),'white'); A.paste(a); B=Image.new('RGB',(W,H),'white'); B.paste(b)
    d=np.abs(np.asarray(A,np.int16)-np.asarray(B,np.int16)).max(2)>24
    # La zone au-delà de la page la plus courte n'est pas un « vide » du site : la page
    # s'arrête là. On ne l'entoure pas en rouge, on la hachure en gris (voir plus bas).
    hmin=min(a.height,b.height); d[hmin:]=False
    pct=round(100*d.mean(),2)
    m=Image.fromarray((d*255).astype('uint8')).filter(ImageFilter.MaxFilter(15))
    mk=np.asarray(m)>0
    Bm=B.copy(); dr=ImageDraw.Draw(Bm)
    # boîtes rouges autour des zones changées (par bandes de 40 px)
    if mk.any():
        rows=np.where(mk.any(1))[0]; start=rows[0]; prev=rows[0]
        for r in list(rows[1:])+[None]:
            if r is None or r-prev>40:
                cols=np.where(mk[start:prev+1].any(0))[0]
                dr.rectangle([cols[0]-3,start-3,cols[-1]+3,prev+3],outline=(230,30,40),width=4)
                if r is not None: start=r
            if r is not None: prev=r
    def hach(im,h0):
        if h0>=im.height: return
        dr2=ImageDraw.Draw(im); dr2.rectangle([0,h0,im.width,im.height],fill=(226,222,214))
        for x in range(-im.height,im.width,28): dr2.line([(x,im.height),(x+(im.height-h0),h0)],fill=(205,200,190),width=3)
        dr2.text((14,h0+12),'Fin de la page (page plus courte)',fill=(110,105,96))
    hach(A,a.height); hach(Bm,b.height)
    cap=min(H,2600); S=Image.new('RGB',(W*2+30,cap),'#e9e6df')
    S.paste(A.crop((0,0,W,cap)),(0,0)); S.paste(Bm.crop((0,0,W,cap)),(W+30,0))
    k=900/S.width if S.width>900 else 1
    S=S.resize((int(S.width*k),int(S.height*k)))
    f=f'cmp__{vue}__{nom}.jpg'; S.save(os.path.join(D,f),quality=78)
    out.append({'vue':vue,'nom':nom,'pct':pct,'img':f,'tailles':[a.size,b.size]})
json.dump({'comparaisons':out,'erreurs':R['erreurs']},open(os.path.join(D,'comparaison.json'),'w'),indent=1)
print(json.dumps([(o['vue'],o['nom'],o.get('pct')) for o in out],ensure_ascii=False))
