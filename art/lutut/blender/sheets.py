# © 2026 Isaac Flake. All Rights Reserved.
# Turns the renders into game sprites and lays out a review sheet per game.
import numpy as np, json, os
from PIL import Image, ImageDraw, ImageFont
import os as _o
W=_o.environ.get('LUTUT_WORK',_o.path.join(_o.path.dirname(_o.path.abspath(__file__)),'work'))+'/'
SP=W+'sprites/'; OUT=W+'sprites/out/'; os.makedirs(OUT,exist_ok=True)
def font(sz):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','/usr/share/fonts/dejavu/DejaVuSans.ttf']:
        if os.path.exists(f): return ImageFont.truetype(f,sz)
    return ImageFont.load_default()
F14,F20,F28=font(14),font(20),font(28)
def load(p): return np.asarray(Image.open(p).convert('RGBA')).astype(np.float32)/255
def bbox_union(arrs,th=0.05):
    m=np.zeros(arrs[0].shape[:2],bool)
    for a in arrs: m|=a[...,3]>th
    ys,xs=np.where(m); return xs.min(),ys.min(),xs.max()+1,ys.max()+1
def hexrgb(h): h=h.lstrip('#'); return np.array([int(h[i:i+2],16) for i in (0,2,4)],np.float32)
# ---------------- 4 Brothers pixel sprites ----------------
PIX=['fly_up','fly_down','walk0','walk1','rest','suck','tail','swipe']
RAMP=[hexrgb(c) for c in ['#141018','#211a2a','#2f263c','#423852','#5e5272','#7e7294']]
BONE=[hexrgb('#9a8f7c'),hexrgb('#ddd4c2')]; GUL=hexrgb('#4a1220'); EYE=hexrgb('#ffd040'); OUTL=hexrgb('#0a0810')
def pixelize(name,box,target_w):
    a=load(SP+f'pixel_{name}.png'); e=load(SP+f'pixeleye_{name}.png')
    x0,y0,x1,y1=box; a=a[y0:y1,x0:x1]; e=e[y0:y1,x0:x1]
    k=target_w/(x1-x0); tw,th=target_w,max(1,round((y1-y0)*k))
    pm=a.copy(); pm[...,:3]*=pm[...,3:4]
    im=np.asarray(Image.fromarray((pm*255).astype(np.uint8)).resize((tw,th),Image.BOX)).astype(np.float32)/255
    al=im[...,3]; rgb=np.where(al[...,None]>1e-3,im[...,:3]/np.maximum(al[...,None],1e-3),0)
    eye=np.asarray(Image.fromarray((e[...,:3].max(-1)*255).astype(np.uint8)).resize((tw,th),Image.BOX)).astype(np.float32)/255
    out=np.zeros((th,tw,4),np.uint8)
    solid=al>0.42
    lum=rgb@np.array([0.3,0.55,0.15]); sat=rgb.max(-1)-rgb.min(-1)
    # spread the dark hide over the ramp so it reads on screen (it is near-black)
    lo,hi=np.percentile(lum[solid],3),np.percentile(lum[solid],97)
    q=np.clip((lum-lo)/(hi-lo+1e-6),0,1)**0.8
    idx=np.clip((q*len(RAMP)).astype(int),0,len(RAMP)-1)
    col=np.array(RAMP)[idx]
    bone=(lum>np.percentile(lum[solid],90))&(sat<0.12)&(rgb[...,0]>rgb[...,2])
    col=np.where(bone[...,None],np.where((lum>np.percentile(lum[solid],96))[...,None],BONE[1],BONE[0]),col)
    gul=(rgb[...,0]>rgb[...,1]*1.6)&(rgb[...,0]>rgb[...,2]*1.3)&(sat>0.05)
    col=np.where(gul[...,None],GUL,col)
    eyep=eye>0.12
    col=np.where(eyep[...,None],EYE,col)
    out[...,:3]=col.astype(np.uint8); out[...,3]=np.where(solid|eyep,255,0)
    # 1px outline, as the game's own sprites have
    A_=out[...,3]>0; ring=np.zeros_like(A_)
    pad=np.pad(A_,1)
    for dy,dx in ((0,1),(1,0),(0,-1),(-1,0)): ring|=pad[1+dy:1+dy+th,1+dx:1+dx+tw]
    ring&=~A_
    full=np.zeros((th+2,tw+2,4),np.uint8); full[1:-1,1:-1]=out
    rp=np.pad(ring,1)
    # outline sits on the transparent pixels round the shape (the canvas grows by one pixel each side)
    pad2=np.pad(A_,1); ring2=np.zeros_like(pad2)
    for dy,dx in ((0,1),(1,0),(0,-1),(-1,0)): ring2|=np.roll(pad2,(dy,dx),(0,1))
    ring2&=~pad2
    full[ring2]=np.r_[OUTL,255].astype(np.uint8)
    return Image.fromarray(full)
def sheet_pixel():
    arrs=[load(SP+f'pixel_{n}.png') for n in PIX]; box=bbox_union(arrs)
    sprites={n:pixelize(n,box,60) for n in PIX}
    for n,im in sprites.items(): im.save(OUT+f'fbw_lutut_{n}.png')
    sw,sh=sprites[PIX[0]].size; Z=5
    cols=4; cw=sw*Z+40; ch=sh*Z+56
    titleh=110
    S=Image.new('RGB',(cols*cw+40,titleh+2*ch+2*(sh*2+40)+60),(28,26,34)); d=ImageDraw.Draw(S)
    d.text((20,16),'Lútut — 4 Brothers Worlds (pixel sprites, side view, facing right)',fill=(236,230,220),font=F28)
    d.text((20,56),f'Each frame is {sw}×{sh} px (the old one was 46×40 in V1 and 52×34 in V2/V3), shown here 5× bigger. The game flips it to face left.',fill=(170,164,180),font=F14)
    d.text((20,76),'Fly up / fly down are the two flying frames (V1). Walk 1 / walk 2 are the two walking frames (V2, V3). The rest are for its moves.',fill=(170,164,180),font=F14)
    labels={'fly_up':'Fly (wings up)','fly_down':'Fly (wings down)','walk0':'Walk 1','walk1':'Walk 2','rest':'Rest','suck':'Suck','tail':'Tail smack (under)','swipe':'Tail swipe'}
    for i,n in enumerate(PIX):
        cx=20+(i%cols)*cw; cy=titleh+(i//cols)*ch
        bg=Image.new('RGB',(sw*Z+16,sh*Z+16),(120,150,110) if (i//cols)%2==0 else (150,170,200))
        S.paste(bg,(cx,cy)); big=sprites[n].resize((sw*Z,sh*Z),Image.NEAREST); S.paste(big,(cx+8,cy+8),big)
        d.text((cx,cy+sh*Z+20),labels[n],fill=(236,230,220),font=F20)
    # actual size strip
    y=titleh+2*ch+10; d.text((20,y),'Actual size, on a light and a dark backdrop:',fill=(170,164,180),font=F14)
    for j,bgc in enumerate([(132,160,118),(30,30,44)]):
        strip=Image.new('RGB',(len(PIX)*(sw+10)+10,sh+16),bgc)
        for i,n in enumerate(PIX): strip.paste(sprites[n],(10+i*(sw+10),8),sprites[n])
        strip=strip.resize((strip.width*2,strip.height*2),Image.NEAREST)
        S.paste(strip,(20,y+24+j*(strip.height+12)))
    S.save(W+'sheet_4brothers.png'); return sw,sh
# ---------------- painted sheets (Stryx Pilot, Skaar) ----------------
def sheet_painted(prefix,names,labels,title,sub,bgs,cell,fname,cols=5):
    arrs=[load(SP+f'{prefix}_{n}.png') for n in names]; x0,y0,x1,y1=bbox_union(arrs)
    pad=8; x0=max(0,x0-pad); y0=max(0,y0-pad); x1=x1+pad; y1=y1+pad
    crops={}
    for n,a in zip(names,arrs):
        im=Image.fromarray((a[y0:y1,x0:x1]*255).astype(np.uint8)); crops[n]=im; im.save(OUT+f'{prefix}_lutut_{n}.png')
    w,h=crops[names[0]].size; k=cell/max(w,h); cw,chh=int(w*k),int(h*k)
    rows=(len(names)+cols-1)//cols; titleh=100
    S=Image.new('RGB',(cols*(cw+24)+24,titleh+rows*(chh+60)+10),(28,26,34)); d=ImageDraw.Draw(S)
    d.text((24,16),title,fill=(236,230,220),font=F28); d.text((24,56),sub,fill=(170,164,180),font=F14)
    for i,n in enumerate(names):
        cx=24+(i%cols)*(cw+24); cy=titleh+(i//cols)*(chh+60)
        bg=Image.new('RGB',(cw,chh),bgs[(i//cols)%len(bgs)]); S.paste(bg,(cx,cy))
        im=crops[n].resize((cw,chh),Image.LANCZOS); S.paste(im,(cx,cy),im)
        d.text((cx,cy+chh+8),labels.get(n,n),fill=(236,230,220),font=F20)
    S.save(W+fname); return w,h
if __name__=='__main__':
    sw,sh=sheet_pixel()
    sheet_painted('stryx',['fly0','fly1','fly2','fly3','fly4','fly5','glide','dive0','dive1','screech'],
        {'fly0':'Fly 1','fly1':'Fly 2','fly2':'Fly 3','fly3':'Fly 4','fly4':'Fly 5','fly5':'Fly 6','glide':'Glide','dive0':'Dive (folding)','dive1':'Dive (stoop)','screech':'Screech (throat lit)'},
        'Lútut — Stryx Pilot (seen from above, facing right)','A six-frame wingbeat, a glide, the dive and the screech. The game turns it to face where it flies; the eyes keep their glow.',
        [(12,14,34),(40,48,90)],230,'sheet_stryx.png')
    sheet_painted('skaar',['idle0','idle1','idle2','idle3','suck','swipe','smack','screech','hurt'],
        {'idle0':'Hover 1','idle1':'Hover 2','idle2':'Hover 3','idle3':'Hover 4','suck':'Suck (attack)','swipe':'Tail swipe','smack':'Tail smack (under)','screech':'Screech (stuns)','hurt':'Hurt'},
        'Lútut — Skaar Uverkhron (side view, turned a little toward you)','Four hover frames, its attacks and the screech, for the town, the battle field and the title screen.',
        [(96,104,82),(70,62,58)],230,'sheet_skaar.png')
    print('pixel frame',sw,sh)
