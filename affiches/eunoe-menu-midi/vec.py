import cv2,numpy as np,potrace
w=cv2.imread('flat.jpg');g=cv2.cvtColor(w,cv2.COLOR_BGR2GRAY).astype(np.float32)
bg=cv2.GaussianBlur(cv2.dilate(g,np.ones((15,15),np.uint8)),(0,0),25)
n=np.clip(g/bg,0,1)
def binar(x0,y0,x1,y1,S=4,thr=0.80,kill=None,minarea=60):
    a=n[y0:y1,x0:x1]
    a=cv2.resize(a,(a.shape[1]*S,a.shape[0]*S),interpolation=cv2.INTER_CUBIC)
    a=cv2.GaussianBlur(a,(0,0),S*0.35)
    b=(a<thr).astype(np.uint8)
    if kill: 
        for (kx0,ky0,kx1,ky1) in kill: b[ky0*S:ky1*S,kx0*S:kx1*S]=0
    k,lab,st,_=cv2.connectedComponentsWithStats(b,8)
    keep=np.zeros(k,bool); keep[1:]=st[1:,cv2.CC_STAT_AREA]>=minarea*S*S/4
    return keep[lab].astype(np.uint8),S
def svg(b,S,name,color='#000'):
    bm=potrace.Bitmap(~b.astype(bool)); path=bm.trace(turdsize=8,alphamax=1.0,opticurve=True,opttolerance=0.3)
    h,wd=b.shape; ds=[]
    for c in path:
        st=c.start_point; d=f"M{st.x:.1f},{st.y:.1f}"
        for seg in c.segments:
            if seg.is_corner: d+=f"L{seg.c.x:.1f},{seg.c.y:.1f}L{seg.end_point.x:.1f},{seg.end_point.y:.1f}"
            else: d+=f"C{seg.c1.x:.1f},{seg.c1.y:.1f} {seg.c2.x:.1f},{seg.c2.y:.1f} {seg.end_point.x:.1f},{seg.end_point.y:.1f}"
        ds.append(d+"Z")
    open(name,'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {wd} {h}"><path fill="{color}" fill-rule="evenodd" d="{" ".join(ds)}"/></svg>')
    print(name,wd,h,len(ds))
# dessin : zone 800..1360 x 110..640 ; on efface la pince (haut gauche) et les bords
b,S=binar(800,110,1360,640,thr=0.835,kill=[(0,0,430,92),(0,0,20,530)])
ys,xs=np.where(b);b=b[max(0,ys.min()-8):ys.max()+9,max(0,xs.min()-8):xs.max()+9];svg(b,S,'dessin.svg')
b,S=binar(570,1860,840,2060,thr=0.80,minarea=55)
b2,_=binar(570,1860,840,2060,thr=0.875,minarea=25)
cut=(1985-1860)*S
b[cut:]=b2[cut:]
ys,xs=np.where(b);b=b[max(0,ys.min()-8):ys.max()+9,max(0,xs.min()-8):xs.max()+9];svg(b,S,'logo.svg')
b,S=binar(10,170,840,300,thr=0.84,kill=[],minarea=200)
ys,xs=np.where(b);b=b[max(0,ys.min()-8):ys.max()+9,max(0,xs.min()-8):xs.max()+9];svg(b,S,'vague.svg')
