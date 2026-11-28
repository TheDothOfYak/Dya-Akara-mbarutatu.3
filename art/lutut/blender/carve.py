# © 2026 Isaac Flake. All Rights Reserved.
# patterns carved into the hide: each element is a dotted line; returns groove depth + dot colour per vertex
import numpy as np
from bones import B
PURPLE=np.array([0.22,0.05,0.42]); DPURPLE=np.array([0.15,0.03,0.30]); BLUE=np.array([0.08,0.18,0.55]); GREEN=np.array([0.06,0.42,0.22])
def tri(x): return 2*np.abs(x-np.floor(x+0.5))      # 0..1 triangle wave
def carve(P,N, SP=0.026, RD=0.0055, GW=0.0085, DEPTH=0.0032):
    n=len(P); x,y,z=P.T
    groove=np.zeros(n); dot=np.zeros(n); dcol=np.zeros((n,3)); best=np.full(n,9.0)
    def element(dist,u,col,valid,dots=True,cut=True,sp=SP):
        dist=np.where(valid,np.abs(dist),9.0)
        g=np.clip(1-(dist/GW)**2,0,1)
        if cut: groove[:]=np.maximum(groove,g)
        if dots:
            du=(np.mod(u/sp,1.0)-0.5)*sp
            r=np.sqrt(du**2+dist**2)
            d_=np.clip(1-(r/RD)**2,0,1)**0.6*(dist<GW)
            # colour: mostly the element's colour, every 5th dot a different hue
            k=np.floor(u/sp).astype(int)
            alt=np.where(np.mod(k,5)==2,1,0)[:,None]
            c=col*(1-alt)+np.where(col[2]>0.45,1,0)*0+alt*(GREEN if col is not GREEN else BLUE)
            upd=d_>dot
            dot[upd]=d_[upd]; dcol[upd]=c[upd] if c.ndim==2 else c
    # ---- body (a drop along Y, centre line z=0.44) ----
    zc=0.44; R=0.38
    th=np.arctan2(x,z-zc); u=th*R; rr=np.hypot(x,z-zc)
    body=(y>-0.66)&(y<0.36)&(np.abs(x)<0.5)&(rr>0.2)
    legs=((z<0.2)&(np.abs(th)>2.0))                         # keep off the feet
    element(y+0.53,u,DPURPLE,body&~legs)                     # collar ring behind the face
    element(y-0.28,u,PURPLE,body&~legs&(y>0.1))             # hip ring
    zig=-0.12+0.07*(tri(u/0.17)-0.5)
    element(y-zig,u,BLUE,body&(np.abs(th)<2.2))              # chevrons round the middle
    element(u,y,PURPLE,(y>-0.5)&(y<0.36)&(np.abs(th)<0.6)&(rr>0.25))   # spine line
    for sgn in (-1,1):                                       # ringed circles on the flanks
        for cy in (-0.33,0.08):
            cu=sgn*1.35*R; dc=np.hypot(u-cu,y-cy)
            ang=np.arctan2(y-cy,u-cu)
            element(dc-0.045,ang*0.045,GREEN if cy>0 else PURPLE,body&(dc<0.07),sp=0.02)
    element(y+0.31,u,DPURPLE,body&(np.abs(th)<1.0)&(np.abs(u)>0.12)&(np.abs(u)<0.3))   # short dashes either side of the spine
    # ---- tail: rings by arclength along the tail bones + a top line ----
    tb=[(np.array(h),np.array(t)) for nm,h,t,p,d in B if nm.startswith('tail')]
    S0=np.cumsum([0]+[np.linalg.norm(t-h) for h,t in tb])
    best_d=np.full(n,9.0); s=np.zeros(n); side=np.zeros(n)
    for i,(h,t) in enumerate(tb):
        v=t-h; L=np.linalg.norm(v); vn=v/L
        w=P-h; a=np.clip(w@vn,0,L); q=h+np.outer(a,vn); d=np.linalg.norm(P-q,axis=1)
        upd=d<best_d; best_d[upd]=d[upd]; s[upd]=S0[i]+a[upd]
        up=np.cross(vn,np.array([1.0,0,0])); up/= (np.linalg.norm(up)+1e-9)
        if up[2]<0: up=-up
        side_vec=np.cross(vn,up)
        rel=P-q; ang=np.arctan2(rel@side_vec,rel@up); side[upd]=ang[upd]
    tail=(s>0.08)&(best_d<0.16)&(y>0.3)
    rad=np.clip(best_d,0.03,0.12)
    for k,s0 in enumerate(np.arange(0.22,S0[-1]-0.1,0.2)):
        element(s-s0,side*rad,[PURPLE,BLUE,DPURPLE][k%3],tail&(s<S0[-1]-0.05))
    element(side*rad,s,PURPLE,tail&(np.abs(side)<0.8))
    # ---- wings: dotted lines along the arm and finger bones (no cut: the membrane is thin) ----
    for nm,h,t,p,d in B:
        if nm.startswith(('finger','forearm')):
            h=np.array(h); t=np.array(t); v=t-h; L=np.linalg.norm(v); vn=v/L
            w=P-h; a=w@vn; q=h+np.outer(np.clip(a,0,L),vn); d=np.linalg.norm(P-q,axis=1)
            valid=(a>0.02)&(a<L)&(np.abs(x)>0.45)
            col=BLUE if 'finger1' in nm else (DPURPLE if 'finger3' in nm else PURPLE)
            element(d-0.0,a,col,valid&(d<0.03),cut=False,sp=0.03)
    return groove*DEPTH, dot, dcol
