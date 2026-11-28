# © 2026 Isaac Flake. All Rights Reserved.
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import bpy, numpy as np, mathutils, math
from rh import *
bpy.ops.wm.open_mainfile(filepath=W+'stage2.blend')
H=bpy.data.objects['LututHigh']; me=H.data
if len(me.vertices)<500000:
    bpy.context.view_layer.objects.active=H
    for o in bpy.context.view_layer.objects: o.select_set(o is H)
    sm=H.modifiers.new('sub','SUBSURF'); sm.subdivision_type='SIMPLE'; sm.levels=1; sm.render_levels=1
    bpy.ops.object.modifier_apply(modifier='sub')
    print('subdivided to',len(me.vertices))
n=len(me.vertices)
P=np.zeros(n*3); me.vertices.foreach_get('co',P); P=P.reshape(-1,3)
N=np.zeros(n*3); me.vertices.foreach_get('normal',N); N=N.reshape(-1,3)
E=np.zeros(len(me.edges)*2,dtype=np.int64); me.edges.foreach_get('vertices',E); E=E.reshape(-1,2)
gdepth=np.zeros(n)   # no carvings
me.vertices.foreach_set('co',P.ravel()); me.update()
N=np.zeros(n*3); me.vertices.foreach_get('normal',N); N=N.reshape(-1,3)
print('carved verts',int((gdepth>0).sum()))
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
glow=np.zeros(n); lid=np.zeros(n)
import json as _js
from collections import deque
cvE=cv.copy()
for _ in range(4): cvE=0.5*cvE+0.5*lap(cvE)
cvE=np.clip(cvE/np.percentile(np.abs(cvE),97),-1,1)
adj=[[] for _ in range(n)]
for a_,b_ in E: adj[a_].append(b_); adj[b_].append(a_)
EYES={}
for k,hit in (('L',(-0.13,-0.767,0.56)),('R',(0.136,-0.758,0.564))):
    hit=np.array(hit)
    near=np.where(np.linalg.norm(P-hit,axis=1)<0.03)[0]
    c=near[np.argmax(cvb[near]+cvs[near]*0.3)]
    C=P[c]
    # grow the dome: convex surface around the centre, stopping at the lid creases
    seen={c}; q=deque([c]); dome=[]
    while q:
        v=q.popleft(); dome.append(v)
        for w in adj[v]:
            if w in seen: continue
            seen.add(w)
            if np.linalg.norm(P[w]-C)<0.065 and cvE[w]>-0.12: q.append(w)
    dome=np.array(dome)
    m=np.zeros(n,bool); m[dome]=True
    Cm=P[dome].mean(0); Nc=N[dome].mean(0); Nc/=np.linalg.norm(Nc)
    # clear lids: the ring just outside the dome
    dd=np.linalg.norm(P-Cm,axis=1)
    rmax=np.percentile(np.linalg.norm(P[dome]-Cm,axis=1),90)
    dd=np.linalg.norm(P-Cm,axis=1)
    m|=(dd<rmax*0.92)&((N@Nc)>0.25)&(cvE>-0.35)
    # keep only what joins the eyeball itself: no stray flecks on the lids
    keepm=np.zeros(n,bool); q=deque([c]); keepm[c]=True
    while q:
        v=q.popleft()
        for w2 in adj[v]:
            if m[w2] and not keepm[w2]: keepm[w2]=True; q.append(w2)
    m=keepm
    ring=(~m)&(dd<rmax+0.022)&((N@Nc)>-0.2)
    glow[m]=np.maximum(glow[m],0.75+0.25*np.clip(1-(dd[m]/rmax)**2,0,1))
    lid=np.maximum(lid,ring*np.clip(1-(dd-rmax)/0.022,0,1))
    EYES[k]=dict(c=Cm.tolist(),n=Nc.tolist(),r=float(rmax),cnt=int(m.sum()))
    print('eye',k,np.round(Cm,3),'r',round(rmax,3),int(m.sum()),'lid',int(ring.sum()))
_js.dump(EYES,open(W+'eyes.json','w'))
eyec=mix(np.tile(hexc('#c08a10'),(n,1)),hexc('#ffd040'),np.clip((glow-0.75)*4,0,1))
col=np.where((glow>0)[:,None],eyec,col)
col=np.clip(col,0,1)
def attr(name,c):
    if name in me.color_attributes: me.color_attributes.remove(me.color_attributes[name])
    a=me.color_attributes.new(name,'FLOAT_COLOR','POINT')
    rgba=np.ones((n,4)); rgba[:,:3]=c; a.data.foreach_set('color',rgba.ravel())
attr('Col',col)
thr=np.where(inside,0.35+0.65*depth,0.0)
attr('Throat',np.stack([thr,thr*0.08,thr*0.04],1))
rough=np.full(n,0.72)
rough=np.where(wing>0.3,0.86,rough)
rough=np.where(horn>0,0.45,rough); rough=np.where(inside,0.22,rough); rough=np.where(gum,0.3,rough)
rough=np.where(teeth,0.35,rough); rough=np.where(glow>0,0.18,rough); rough=np.where(lid>0.2,0.15,rough)
rough=rough+0.12*np.clip(cvs,0,1)
attr('Rough',np.stack([rough]*3,1))
gl=np.clip(glow,0,1)        # the glow stays on the eyeballs: nothing around them glows
g3=np.stack([gl*1.0,gl*0.72,gl*0.14],1)

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
