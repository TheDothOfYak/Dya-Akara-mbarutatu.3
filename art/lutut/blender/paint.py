# © 2026 Isaac Flake. All Rights Reserved.
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import bpy, numpy as np, mathutils, math
from rh import *
bpy.ops.wm.open_mainfile(filepath=W+'stage2.blend')
H=bpy.data.objects['LututHigh']; me=H.data
n=len(me.vertices)
P=np.zeros(n*3); me.vertices.foreach_get('co',P); P=P.reshape(-1,3)
N=np.zeros(n*3); me.vertices.foreach_get('normal',N); N=N.reshape(-1,3)
E=np.zeros(len(me.edges)*2,dtype=np.int64); me.edges.foreach_get('vertices',E); E=E.reshape(-1,2)
# laplacian convexity
def lap(vals):
    s=np.zeros_like(vals); c=np.zeros(n)
    np.add.at(s,E[:,0],vals[E[:,1]]); np.add.at(s,E[:,1],vals[E[:,0]])
    np.add.at(c,E[:,0],1); np.add.at(c,E[:,1],1)
    return s/np.maximum(c,1)[:,None] if vals.ndim==2 else s/np.maximum(c,1)
L=lap(P)-P
el=np.linalg.norm(P[E[:,0]]-P[E[:,1]],axis=1).mean()
cv=-(L*N).sum(1)/el      # >0 convex (ridge/tip), <0 concave
for _ in range(2): cv=0.5*cv+0.5*lap(cv)
cvs=np.clip(cv/np.percentile(np.abs(cv),97),-1,1)
cv_big=cv.copy()
for _ in range(25): cv_big=0.5*cv_big+0.5*lap(cv_big)
cvb=np.clip(cv_big/np.percentile(np.abs(cv_big),97),-1,1)
x,y,z=P.T
def hexc(h): h=h.lstrip('#'); return np.array([int(h[i:i+2],16)/255 for i in (0,2,4)])**2.2
def mix(a,b,t): t=np.clip(t,0,1)[:,None] if np.ndim(t) else t; return a*(1-t)+b*t
# noise mottling
from mathutils import noise
mot=np.array([noise.noise(mathutils.Vector(p)*9.0) for p in P])
mot2=np.array([noise.noise(mathutils.Vector(p)*31.0) for p in P])
body=hexc('#151318'); back=hexc('#0c0b0e'); belly=hexc('#242024')
col=np.tile(body,(n,1))
col=mix(col,back,np.clip(N[:,2],0,1)*0.8)
col=mix(col,belly,np.clip(-N[:,2]-0.2,0,1)*0.9)
# wings
wing=np.clip((np.abs(x)-0.5)/0.15,0,1)
memb=hexc('#1c1418')
col=mix(col,memb,wing*0.85)
# mottling
col=col*(1+0.22*mot[:,None]+0.10*mot2[:,None])
# ridges/tips lighter (spines, claws, wing bones, carved brow), cavities darker
tip=hexc('#36312f')
col=mix(col,tip,np.clip(cvs,0,1)**1.5*0.45)
col=col*(1+0.55*np.clip(cvb,-1,0))[:,None]
# horns
hx=np.abs(x-0.01)
hreg=np.where((z>0.6)&(hx>0.06)&(hx<0.36)&(y<-0.1)&(y>-0.8))[0]
from mathutils.bvhtree import BVHTree as _BT
import bmesh as _bm0
_b0=_bm0.new(); _b0.from_mesh(me); _bv0=_BT.FromBMesh(_b0)
hth=np.full(n,9.0)
for i in hreg:
    p=mathutils.Vector(P[i]); d=-mathutils.Vector(N[i])
    h_=_bv0.ray_cast(p+d*0.002,d,0.3)
    if h_[0] is not None: hth[i]=h_[3]
horn=((hth<0.11)).astype(float)
print('horn verts',int(horn.sum()))
horn_t=np.clip((z-0.66)/0.2,0,1)
hcol=mix(np.tile(hexc('#141214'),(n,1)),hexc('#5a534c'),horn_t**1.6)
col=np.where(horn[:,None]>0,hcol,col)
# mouth
mx,mz=0.012,0.33
r=np.sqrt((x-mx)**2+(z-mz)**2)
inside=(r<0.215)&(y>-0.76)&(y<-0.22)
gul=hexc('#2a070c'); gul2=hexc('#120305')
depth=np.clip((y+0.76)/0.35,0,1)
gcol=mix(np.tile(gul,(n,1)),gul2,depth)
col=np.where(inside[:,None],gcol,col)
# teeth: convex bits in the rim annulus
gum=(r>0.15)&(r<0.27)&(y>-0.92)&(y<-0.6)
col=np.where(gum[:,None],mix(col,np.tile(hexc('#2a1215'),(n,1)),0.7),col)
cvm=cv.copy()
for _ in range(5): cvm=0.5*cvm+0.5*lap(cvm)
cvm=np.clip(cvm/np.percentile(np.abs(cvm),97),-1,1)
from mathutils.bvhtree import BVHTree
import bmesh as _bm
_b=_bm.new(); _b.from_mesh(me); bvh=BVHTree.FromBMesh(_b)
reg=np.where((r<0.27)&(y>-0.95)&(y<-0.5))[0]
thick=np.full(n,9.0)
for i in reg:
    p=mathutils.Vector(P[i]); d=-mathutils.Vector(N[i])
    hit=bvh.ray_cast(p+d*0.002,d,0.2)
    if hit[0] is not None: thick[i]=hit[3]+0.002
teeth=(r<0.25)&(y>-0.95)&(y<-0.55)&(thick<0.045)
tcol=mix(np.tile(hexc('#3a352f'),(n,1)),hexc('#a09480'),np.clip((0.045-thick)/0.03,0,1)*0.7+0.3)
col=np.where(teeth[:,None],tcol,col)
# eyes: slanted almonds under the brow
glow=np.zeros(n)
for ex,s in ((-0.0875,-1),(0.075,1)):
    ez=0.561
    # find surface y at eye
    sel=(np.abs(x-ex)<0.02)&(np.abs(z-ez)<0.02)&(N[:,1]<-0.2)
    ey=y[sel].min() if sel.any() else -0.7
    ang=math.radians(-18*(-s))   # inner corner lower
    ca,sa=math.cos(ang),math.sin(ang)
    dx,dz=x-ex,z-ez
    u=dx*ca+dz*sa; v=-dx*sa+dz*ca
    d=(u/0.044)**2+(v/0.017)**2
    m=(d<1)&(y<ey+0.07)&(N[:,1]<0.3)
    g=np.clip(1-d,0,1)**0.6*m
    glow=np.maximum(glow,g)
    print('eye',ex,ey,m.sum())
eyec=mix(np.tile(hexc('#2a1c04'),(n,1)),hexc('#b8860b'),glow)
col=np.where((glow>0)[:,None],mix(col,eyec,np.clip(glow*3,0,1)),col)
col=np.clip(col,0,1)
def attr(name,c):
    if name in me.color_attributes: me.color_attributes.remove(me.color_attributes[name])
    a=me.color_attributes.new(name,'FLOAT_COLOR','POINT')
    rgba=np.ones((n,4)); rgba[:,:3]=c; a.data.foreach_set('color',rgba.ravel())
attr('Col',col)
rough=np.full(n,0.62)
rough=np.where(horn>0,0.45,rough); rough=np.where(inside,0.22,rough); rough=np.where(gum,0.3,rough)
rough=np.where(teeth,0.35,rough); rough=np.where(glow>0,0.2,rough)
rough=rough+0.12*np.clip(cvs,0,1)
attr('Rough',np.stack([rough]*3,1))
g3=np.stack([glow*0.95,glow*0.68,glow*0.10],1)
attr('Glow',g3)
np.save(W+'glowmask.npy',glow)
bpy.ops.wm.save_as_mainfile(filepath=W+'stage3.blend')
# preview
L_=bpy.data.objects['Lutut']; L_.hide_render=True
sc=bpy.context.scene; setup(700,light='STUDIO'); sc.display.shading.color_type='VERTEX'
me.color_attributes.active_color=me.color_attributes['Col']
w=sc.world; w.color=(0.5,0.52,0.55)
ps=[]
for nm,loc,tg in [('p1',(0,-3.2,0.6),(0,0,0.45)),('p2',(3,-3,1.8),(0,0.3,0.4)),('p3',(0,-1.6,0.6),(0,-0.8,0.5)),('p4',(-2.5,2.5,2.2),(0,0.3,0.4))]:
    p=W+nm+'.png'; shot(p,loc,tg); ps.append(p)
sheet(ps,W+'painttest.png',2,500)
