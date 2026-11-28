# © 2026 Isaac Flake. All Rights Reserved.
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import bpy, math, mathutils
from rh import W; from pk import Q, wq
bpy.ops.wm.open_mainfile(filepath=W+'stage5.blend')
A=bpy.data.objects['LututRig']; P=A.pose.bones
sc=bpy.context.scene; sc.render.fps=30
S=('.L','.R')
sin,cos,pi=math.sin,math.cos,math.pi
TAU=2*pi
def sa(axis,s): return axis if s=='.L' else (axis[0],-axis[1],-axis[2])
def ease(x): x=min(max(x,0),1); return x*x*(3-2*x)
def seg(t,a,b): return ease((t-a)/(b-a)) if b>a else float(t>=a)
def lerp(a,b,t): return a+(b-a)*t
# ---------- building blocks: each returns {bone: [(axis,deg),...]} ----------
def add(d,bone,axis,deg):
    if abs(deg)>1e-6: d.setdefault(bone,[]).append((axis,deg))
def wings(d, up, sweep=0.0, lag=0.0, fingers=0.0, s_only=None, fold=0.0, spread=0.0):
    """up: deg (+ = raise) for the upperarm; lag: extra on forearm/fingers;
       fingers: + folds membrane down; fold: 0..1 tuck wings for walking; spread: + opens fingers apart"""
    for s in S:
        if s_only and s!=s_only: continue
        add(d,'upperarm'+s,sa((0,1,0),s),up - 20*fold)
        add(d,'upperarm'+s,sa((0,0,1),s),sweep - 25*fold)
        add(d,'forearm'+s,sa((0,1,0),s),lag*0.6 - 25*fold)
        for i,(z,x) in enumerate([(-100,10),(-92,-2),(-84,-12),(-76,-20)]):
            add(d,f'finger{i+1}a'+s,sa((0,0,1),s),z*fold + spread*(i-1.5)*0.5)
            add(d,f'finger{i+1}a'+s,(1,0,0),x*fold)
            add(d,f'finger{i+1}a'+s,sa((0,1,0),s),(lag - fingers)*(0.3+0.15*i)*(1-fold))
            add(d,f'finger{i+1}b'+s,sa((0,1,0),s),(lag*0.8 - fingers)*(0.4+0.15*i)*(1-fold))
            add(d,f'finger{i+1}b'+s,sa((0,0,1),s),-10*fold)
def tail(d, ph, amp_side=6.0, amp_up=3.0, lift=0.0, curl=0.0, delay=0.55):
    for i in range(7):
        k=(i+1)/7
        add(d,f'tail{i+1}',(0,0,1),amp_side*(0.5+k)*sin(ph - i*delay))
        add(d,f'tail{i+1}',(1,0,0),amp_up*(0.5+k)*sin(ph*1.0 - i*delay + 1.3) + (lift if i==0 else lift*0.15) - curl*(0.3+k)*0.5)
def legs_dangle(d, ph, amp=6, tuck=0.0):
    for s in S:
        for leg,o in (('front',0),('back',0.8)):
            add(d,f'{leg}_thigh'+s,(1,0,0),tuck + amp*sin(ph+o))
            add(d,f'{leg}_shin'+s,(1,0,0),-tuck*0.6 + amp*0.6*sin(ph+o-0.7))
            add(d,f'{leg}_foot'+s,(1,0,0),-tuck*0.3 + amp*0.5*sin(ph+o-1.2))
def mouth(d, op):   # op: + opens wider, - closes
    add(d,'jaw_up',(1,0,0),-op); add(d,'jaw_low',(1,0,0),op)
# ---------- clips ----------
def flap(t, amp=40, bias=5):
    """classic flap: ph in [0,1) ; returns up-angle and lag"""
    ph=TAU*t
    up=bias+amp*cos(ph)                 # top of stroke at t=0
    lag=-amp*0.35*sin(ph)               # tips trail the arm
    return up,lag,ph
def c_idle(t):
    d={}; up,lag,ph=flap(t,40,6)
    wings(d,up,sweep=6*sin(TAU*t),lag=lag,fingers=8*max(0,sin(TAU*t)))
    tail(d,TAU*t,7,4); legs_dangle(d,TAU*t+1,5)
    add(d,'spine',(1,0,0),2*sin(TAU*t)); add(d,'head',(1,0,0),-3*sin(TAU*t-0.6))
    mouth(d,3*sin(TAU*t*1))
    return d,(0,0,0.07*sin(TAU*t+pi*0.5)+0.0)
def c_fly(t):
    d={}; up,lag,ph=flap(t,52,4)
    wings(d,up,sweep=10*sin(TAU*t),lag=lag*1.2,fingers=14*max(0,sin(TAU*t)))
    tail(d,TAU*t,4,3,lift=6); legs_dangle(d,TAU*t,3,tuck=48)
    add(d,'root',(1,0,0),8)   # pitch nose down into the flight
    add(d,'head',(1,0,0),-8)
    return d,(0,0,0.09*sin(TAU*t+pi*0.5))
def c_glide(t):
    d={}
    wings(d,10+4*sin(TAU*t),lag=-3,spread=4)
    add(d,'root',(0,1,0),6*sin(TAU*t)); add(d,'root',(1,0,0),5)
    tail(d,TAU*t,9,3,lift=4); legs_dangle(d,TAU*t,3,tuck=40)
    return d,(0,0,0.04*sin(TAU*t))
def c_walk(t):
    d={}
    wings(d,4*sin(TAU*t*2),fold=0.9)
    ph=TAU*t
    for s,o in (('.L',0),('.R',pi)):
        for leg,lo in (('front',0),('back',pi)):
            p=ph+o+lo
            swing=-26*sin(p)                      # forward when negative
            lift=max(0,cos(p))                    # lift while swinging forward
            add(d,f'{leg}_thigh'+s,(1,0,0),swing)
            add(d,f'{leg}_shin'+s,(1,0,0),-38*lift)
            add(d,f'{leg}_foot'+s,(1,0,0),30*lift - swing*0.4)
    add(d,'spine',(0,0,1),4*sin(ph)); add(d,'chest',(0,0,1),-5*sin(ph)); add(d,'head',(0,0,1),4*sin(ph-0.5))
    add(d,'chest',(0,1,0),3*sin(ph))
    tail(d,ph,9,2,lift=22,delay=0.5)
    return d,(0,0,0.025*abs(sin(ph*1))+0.02)
def c_bite(t):
    d={}
    wind=seg(t,0.0,0.38); lunge=seg(t,0.38,0.52); back=seg(t,0.6,1.0)
    a=wind*(1-lunge); l=lunge*(1-back)
    add(d,'root',(1,0,0),-22*a + 18*l)
    add(d,'chest',(1,0,0),-10*a + 8*l); add(d,'head',(1,0,0),-8*a + 10*l)
    mouth(d,-14*a + 26*l)
    up,lag,_=flap(min(t*2,1),45,8)
    wings(d,lerp(up,lerp(60*a+5,-45,l),max(a,l)),lag=-20*l+10*a,fingers=6*l)
    tail(d,TAU*t,10,6,lift=-10*a+8*l)
    legs_dangle(d,TAU*t,4,tuck=20*l-10*a)
    return d,(0,0.22*a-0.55*l,0.12*a-0.05*l)
def c_swipe(t):
    d={}
    tw=seg(t,0.0,0.3); wh=seg(t,0.3,0.55); rc=seg(t,0.65,1.0)
    turn=(30*tw - 70*wh)*(1-rc) if wh<1 or rc>0 else -40
    turn=lerp(lerp(30*tw, -40, wh), 0, rc)
    add(d,'root',(0,0,1),turn)
    add(d,'chest',(0,0,1),-turn*0.25)
    k=lerp(lerp(-14*tw, 26, wh),0,rc)
    for i in range(7): add(d,f'tail{i+1}',(0,0,1),k*(0.6+0.12*i))
    for i in range(7): add(d,f'tail{i+1}',(1,0,0),(8*wh*(1-rc))*(1 if i<2 else -0.3))
    up,lag,_=flap(t*1.5%1,42,6); wings(d,up,lag=lag)
    mouth(d,6*wh*(1-rc)); legs_dangle(d,TAU*t,5)
    return d,(0,0,0.05*sin(TAU*t))
def c_screech(t):
    d={}
    r=seg(t,0,0.25)*(1-seg(t,0.8,1.0))
    add(d,'root',(1,0,0),-28*r); add(d,'chest',(1,0,0),-8*r); add(d,'head',(1,0,0),-6*r)
    shake=sin(TAU*t*14)*r
    add(d,'head',(0,0,1),6*shake); add(d,'head',(0,1,0),4*shake)
    mouth(d,30*r + 4*shake)
    wings(d,lerp(10,38,r)+5*sin(TAU*t*10)*r,lag=6*sin(TAU*t*10)*r,spread=14*r)
    tail(d,TAU*t*2,12*r+4,5,lift=10*r)
    legs_dangle(d,TAU*t*3,8*r, tuck=-15*r)
    return d,(0,0.1*r,0.15*r)
def c_hurt(t):
    d={}
    h=seg(t,0,0.15)*(1-seg(t,0.3,1.0))
    add(d,'root',(1,0,0),-18*h); add(d,'root',(0,1,0),10*h); add(d,'head',(1,0,0),-14*h)
    mouth(d,16*h)
    wings(d,lerp(8,45,h),lag=-25*h,fingers=-10*h)
    tail(d,TAU*t,6+10*h,4); legs_dangle(d,TAU*t,4+10*h)
    return d,(0,0.18*h,0.05*h)
def c_death(t):
    d={}
    f=seg(t,0.0,0.35); roll=seg(t,0.25,0.75); land=seg(t,0.6,0.85)
    add(d,'root',(0,1,0),-95*roll); add(d,'root',(1,0,0),-15*f+10*land)
    flail=sin(TAU*t*4)*(1-roll)
    wings(d,lerp(30*flail,-10,roll),lag=20*flail,fold=0.75*land)
    mouth(d,20*f - 8*land)
    add(d,'head',(1,0,0),-15*f+20*land)
    tail(d,TAU*t*2,10*(1-land),5*(1-land),curl=25*land)
    legs_dangle(d,TAU*t*3,10*(1-land),tuck=30*land)
    return d,(0,0.1*f,0.25*f*(1-roll)-0.02*land + 0.35*roll*land*0)
CLIPS=[('Idle',c_idle,36,True),('Fly',c_fly,24,True),('Glide',c_glide,60,True),('Walk',c_walk,36,True),
       ('Bite',c_bite,30,False),('TailSwipe',c_swipe,30,False),('Screech',c_screech,42,False),('Hurt',c_hurt,15,False),('Death',c_death,48,False)]
if A.animation_data is None: A.animation_data_create()
prev={}
for name,fn,nf,loop in CLIPS:
    act=bpy.data.actions.new(name); act.use_fake_user=True
    A.animation_data.action=act
    prev.clear()
    for f in range(nf+1):
        t=f/nf
        d,loc=fn(t)
        for pb in P:
            pb.rotation_mode='QUATERNION'
            q=mathutils.Quaternion()
            for axis,deg in d.get(pb.name,[]): q=Q(axis,deg)@q
            ql=wq(pb,q)
            if pb.name in prev and prev[pb.name].dot(ql)<0: ql.negate()
            prev[pb.name]=ql.copy()
            pb.rotation_quaternion=ql
            pb.keyframe_insert('rotation_quaternion',frame=f+1,group=pb.name)
        P['root'].location=loc
        P['root'].keyframe_insert('location',frame=f+1,group='root')
    # stash into NLA so the exporter sees every action
    tr=A.animation_data.nla_tracks.new(); tr.name=name
    st=tr.strips.new(name,1,act); tr.mute=True
    print('clip',name,nf)
A.animation_data.action=None
for pb in P: pb.rotation_quaternion=(1,0,0,0); pb.location=(0,0,0)
bpy.ops.wm.save_as_mainfile(filepath=W+'stage6.blend')
