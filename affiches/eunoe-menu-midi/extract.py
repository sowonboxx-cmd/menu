import cv2,numpy as np
from PIL import Image
w=cv2.imread('flat.jpg');g=cv2.cvtColor(w,cv2.COLOR_BGR2GRAY).astype(np.float32)
bg=cv2.GaussianBlur(cv2.dilate(g,np.ones((15,15),np.uint8)),(0,0),25)
n=np.clip(g/bg,0,1)
ink=np.clip((0.88-n)/0.45,0,1)
def save(name,x0,y0,x1,y1):
    a=(ink[y0:y1,x0:x1]*255).astype(np.uint8)
    ys,xs=np.where(a>40)
    a=a[max(0,ys.min()-4):ys.max()+5, max(0,xs.min()-4):xs.max()+5]
    a=cv2.resize(a,(a.shape[1]*2,a.shape[0]*2),interpolation=cv2.INTER_CUBIC)
    a=cv2.GaussianBlur(a,(3,3),0)
    rgba=np.zeros((*a.shape,4),np.uint8); rgba[...,3]=a
    Image.fromarray(rgba).save(name); print(name,a.shape)
    p=(np.full((*a.shape,3),245.)*(1-a[...,None]/255)).astype(np.uint8); Image.fromarray(p).save(name.replace('.png','-prev.png'))
save('dessin.png',800,110,1360,640)
save('logo.png',570,1860,840,2060)
save('vague.png',10,170,840,300)
