# Menu A4 FR : encart A « La carte en images » avec 4 photos différentes
import re
FR=open("print/menu-a4.html").read()
RESA=re.compile(r'<div class="resa bleu">.*?<img src="\.\./qr\.svg"></div>', re.S)
CSS=open("gen4.py").read().split('CSS = """')[1].split('"""')[0]
POS={1:"70% 55%",2:"center 80%",3:"70% 45%",4:"65% 50%",5:"60% 55%",6:"62% 50%",7:"58% 45%"}
for i in range(1,8):
    b=(f'<div class="vid"><div class="ph" style="background-image:url(../photos/p{i}.jpg);background-position:{POS[i]}"></div><div class="sh"></div>'
       f'<div class="in"><div class="t"><div class="k">La carte en images</div><div class="h">Voyez avant<br>de choisir</div>'
       f'<div class="o">Chaque plat en photo et en vidéo, sur notre carte en ligne.</div><div class="play"><i></i>Scannez</div></div>'
       f'<img class="qr" src="../qr-a4-fr.svg"></div></div>')
    open(f"print/menu-a4-photo-{i}.html","w").write(RESA.sub(b,FR).replace("</style>",CSS+".vid .sh{background:linear-gradient(100deg,rgba(13,37,92,.93) 0%,rgba(13,37,92,.72) 38%,rgba(13,37,92,.08) 72%,rgba(13,37,92,0) 100%)!important}.vid img.qr{width:26mm;height:26mm}</style>"))
print("ok")
