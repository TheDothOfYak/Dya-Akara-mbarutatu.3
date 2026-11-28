# © 2026 Isaac Flake. All Rights Reserved.
import math
from bones import NT
S=('.L','.R')
sin,cos,pi=math.sin,math.cos,math.pi
TAU=2*pi
LEAD=(-1.389,-0.07,0.457)          # left wing leading edge, shoulder -> tip
def sa(axis,s): return axis if s=='.L' else (axis[0],-axis[1],-axis[2])
def ease(x): x=min(max(x,0),1); return x*x*(3-2*x)
def seg(t,a,b): return ease((t-a)/(b-a)) if b>a else float(t>=a)
def lerp(a,b,t): return a+(b-a)*t
def add(d,bone,axis,deg):
    if abs(deg)>1e-6: d.setdefault(bone,[]).append((axis,deg))
TUCK=dict(ua_y=-62,ua_z=-30,ua_x=10,fa_y=-30,fz=[-112,-104,-96,-88],fx=[-8,-16,-24,-32],fb=-14)
def wings(d, up=0.0, sweep=0.0, lag=0.0, twist=0.0, ffold=0.0, fold=0.0, spread=0.0, s_only=None):
    """up: + raises the arm; lag: tips trail; twist: + tilts the membrane back (trailing edge up/back);
       ffold: 0..1 partial fold of the fingers (upstroke); fold: 0..1 full tuck against the body."""
    T=TUCK; k=fold
    for s in S:
        if s_only and s!=s_only: continue
        add(d,'upperarm'+s,sa(LEAD,s),-twist*(1-k))
        add(d,'upperarm'+s,sa((0,1,0),s),up*(1-k) + T['ua_y']*k)
        add(d,'upperarm'+s,sa((0,0,1),s),sweep*(1-k) + T['ua_z']*k)
        add(d,'upperarm'+s,(1,0,0),T['ua_x']*k)
        add(d,'forearm'+s,sa((0,1,0),s),lag*0.6*(1-k) + T['fa_y']*k - 18*ffold*(1-k))
        for i in range(4):
            fz=T['fz'][i]*k + (-(22+12*i)*ffold + spread*(i-1.5)*0.5)*(1-k)
            add(d,f'finger{i+1}a'+s,sa((0,0,1),s),fz)
            add(d,f'finger{i+1}a'+s,(1,0,0),T['fx'][i]*k)
            add(d,f'finger{i+1}a'+s,sa((0,1,0),s),lag*(0.3+0.15*i)*(1-k))
            add(d,f'finger{i+1}b'+s,sa((0,1,0),s),lag*0.8*(0.4+0.15*i)*(1-k) - 10*ffold*(1-k))
            add(d,f'finger{i+1}b'+s,sa((0,0,1),s),T['fb']*k)
def flap(t, amp=34, bias=0):
    ph=TAU*t
    up=bias+amp*cos(ph)                  # top of the stroke at t=0, bottom at 0.5
    lag=-amp*0.35*sin(ph)                # tips trail the arm
    upstroke=max(0.0,-sin(ph))           # 0..1 while the wing rises
    down=max(0.0,sin(ph))
    return up,lag,upstroke,down
def beat(d,t,amp=28,bias=-6,base_twist=45,sweep=6):
    up,lag,u,dn=flap(t,amp,bias)
    wings(d,up,sweep=sweep*sin(TAU*t),lag=lag,twist=base_twist+18*u-8*dn,ffold=0.6*u)
    return up
TW=[(0.5+(i+1)/NT)*7/NT for i in range(NT)]   # per-bone share, sums like the old 7-bone tail
def tail(d, ph, side=6.0, upamp=3.0, lift=0.0, curl=0.0, delay=0.32, sideoff=0.0):
    for i in range(NT):
        w=TW[i]
        add(d,f'tail{i+1}',(0,0,1),side*w*sin(ph - i*delay) + sideoff*w)
        add(d,f'tail{i+1}',(1,0,0),upamp*w*sin(ph - i*delay + 1.3) + (lift if i==0 else lift*0.08) - curl*w*0.5)
def tail_shape(d, ups, sides=None):
    """ups/sides: callables i->deg for each tail bone"""
    for i in range(NT):
        add(d,f'tail{i+1}',(1,0,0),ups(i))
        if sides: add(d,f'tail{i+1}',(0,0,1),sides(i))
def legs_dangle(d, ph, amp=6, tuck=0.0):
    for s in S:
        for leg,o in (('front',0),('back',0.8)):
            add(d,f'{leg}_thigh'+s,(1,0,0),tuck + amp*sin(ph+o))
            add(d,f'{leg}_shin'+s,(1,0,0),-tuck*0.6 + amp*0.6*sin(ph+o-0.7))
            add(d,f'{leg}_foot'+s,(1,0,0),-tuck*0.3 + amp*0.5*sin(ph+o-1.2))
def mouth(d, op):
    add(d,'jaw_up',(1,0,0),-op); add(d,'jaw_low',(1,0,0),op)
# ---------------- clips: t in [0,1] -> (pose dict, root location) ----------------
def c_idle(t):
    d={}; beat(d,t,28,-6,45)
    tail(d,TAU*t,9,5,delay=0.35); legs_dangle(d,TAU*t+1,5)
    add(d,'spine',(1,0,0),2*sin(TAU*t)); add(d,'head',(1,0,0),-3*sin(TAU*t-0.6))
    mouth(d,3*sin(TAU*t))
    return d,(0,0,0.07*sin(TAU*t+pi*0.5))
def c_fly(t):
    d={}; beat(d,t,36,-8,48,10)
    tail(d,TAU*t,7,6,lift=7,delay=0.4); legs_dangle(d,TAU*t,3,tuck=48)
    add(d,'root',(1,0,0),8); add(d,'head',(1,0,0),-8)
    return d,(0,0,0.09*sin(TAU*t+pi*0.5))
def c_glide(t):
    d={}
    wings(d,6+3*sin(TAU*t),lag=-3,twist=50+3*sin(TAU*t),spread=4)
    add(d,'root',(0,1,0),6*sin(TAU*t)); add(d,'root',(1,0,0),5)
    tail(d,TAU*t,12,4,lift=4,delay=0.3); legs_dangle(d,TAU*t,3,tuck=40)
    return d,(0,0,0.04*sin(TAU*t))
def c_walk(t):
    d={}
    wings(d,fold=1.0)                                     # wings stay tucked, no flutter
    ph=TAU*t
    for s,o in (('.L',0),('.R',pi)):
        for leg,lo in (('front',0),('back',pi)):
            p=ph+o+lo
            swing=-26*sin(p); lift=max(0,cos(p))
            add(d,f'{leg}_thigh'+s,(1,0,0),swing)
            add(d,f'{leg}_shin'+s,(1,0,0),-38*lift)
            add(d,f'{leg}_foot'+s,(1,0,0),30*lift - swing*0.4)
    add(d,'spine',(0,0,1),4*sin(ph)); add(d,'chest',(0,0,1),-5*sin(ph)); add(d,'head',(0,0,1),4*sin(ph-0.5))
    add(d,'chest',(0,1,0),3*sin(ph))
    tail(d,ph,14,3,lift=24,delay=0.3)                     # held off the ground, swishing
    return d,(0,0,0.025*abs(sin(ph))+0.02)
def c_bite(t):
    d={}
    wind=seg(t,0.0,0.38); lunge=seg(t,0.38,0.52); back=seg(t,0.6,1.0)
    a=wind*(1-lunge); l=lunge*(1-back)
    add(d,'root',(1,0,0),-22*a + 18*l)
    add(d,'chest',(1,0,0),-10*a + 8*l); add(d,'head',(1,0,0),-8*a + 10*l)
    mouth(d,-14*a + 26*l)
    up,lag,u,dn=flap(min(t*2,1),34,4)
    wings(d,lerp(up,lerp(40*a+5,-38,l),max(a,l)),lag=-20*l+10*a,twist=45+10*a-12*l,ffold=0.4*a)
    tail(d,TAU*t,12,8,lift=-10*a+10*l,delay=0.35)
    legs_dangle(d,TAU*t,4,tuck=20*l-10*a)
    return d,(0,0.22*a-0.55*l,0.12*a-0.05*l)
def c_swipe(t):
    d={}
    tw=seg(t,0.0,0.3); wh=seg(t,0.3,0.52); rc=seg(t,0.65,1.0)
    turn=lerp(lerp(30*tw,-40,wh),0,rc)
    add(d,'root',(0,0,1),turn); add(d,'chest',(0,0,1),-turn*0.25)
    k=lerp(lerp(-14*tw,26,wh),0,rc)
    for i in range(NT): add(d,f'tail{i+1}',(0,0,1),k*(0.6+0.5*i/NT)*7/NT*1.6)
    for i in range(NT): add(d,f'tail{i+1}',(1,0,0),8*wh*(1-rc)*(1 if i<3 else -0.25)*7/NT*1.6)
    beat(d,(t*1.5)%1,28,-6,45)
    mouth(d,6*wh*(1-rc)); legs_dangle(d,TAU*t,5)
    return d,(0,0,0.05*sin(TAU*t))
def c_slam(t):
    """overhead smack: the tail coils high over the back, then whips the ball down in front of the face"""
    d={}
    up_=seg(t,0.0,0.38); hit=seg(t,0.38,0.5); rc=seg(t,0.66,1.0)
    def mixp(r,s_): return (lerp(0,r,up_), s_)
    for i in range(NT):
        coil=25 if i<3 else (14 if i<8 else 0)
        strike=34 if i<3 else (26 if i<8 else 4)
        a=lerp(lerp(0,coil,up_),strike,hit)
        a=lerp(a,0,rc)
        add(d,f'tail{i+1}',(1,0,0),a)
        add(d,f'tail{i+1}',(0,0,1),3*sin(TAU*t*2-i*0.4)*(1-hit*(1-rc)))
    pitch=lerp(lerp(0,-14,up_),35,hit); pitch=lerp(pitch,0,rc)
    add(d,'root',(1,0,0),pitch)
    add(d,'head',(1,0,0),-10*hit*(1-rc))
    mouth(d,lerp(lerp(0,12,up_),24,hit)*(1-rc))
    up,lag,u,dn=flap(min(t*1.6,1),28,-6)
    w=max(up_,hit)*(1-rc)
    wings(d,lerp(up,lerp(28,-30,hit),w),lag=lerp(lag,-20*hit,w),twist=45-15*hit*(1-rc),ffold=0.3*up_*(1-hit))
    legs_dangle(d,TAU*t,4,tuck=25*hit*(1-rc))
    return d,(0,0.08*up_*(1-hit)-0.25*hit*(1-rc),(0.08*up_+0.3*hit)*(1-rc))
def c_screech(t):
    d={}
    r=seg(t,0,0.25)*(1-seg(t,0.8,1.0))
    add(d,'root',(1,0,0),-28*r); add(d,'chest',(1,0,0),-8*r); add(d,'head',(1,0,0),-6*r)
    shake=sin(TAU*t*14)*r
    add(d,'head',(0,0,1),6*shake); add(d,'head',(0,1,0),4*shake)
    mouth(d,30*r+4*shake)
    wings(d,lerp(8,28,r)+5*sin(TAU*t*10)*r,lag=6*sin(TAU*t*10)*r,twist=lerp(45,20,r),spread=14*r)
    tail(d,TAU*t*2,16*r+5,6,lift=10*r,delay=0.35)
    legs_dangle(d,TAU*t*3,8*r,tuck=-15*r)
    return d,(0,0.1*r,0.15*r)
def c_hurt(t):
    d={}
    h=seg(t,0,0.15)*(1-seg(t,0.3,1.0))
    add(d,'root',(1,0,0),-18*h); add(d,'root',(0,1,0),10*h); add(d,'head',(1,0,0),-14*h)
    mouth(d,16*h)
    wings(d,lerp(6,32,h),lag=-25*h,twist=45-10*h,ffold=0.3*h)
    tail(d,TAU*t,8+14*h,5,delay=0.35); legs_dangle(d,TAU*t,4+10*h)
    return d,(0,0.18*h,0.05*h)
def c_death(t):
    d={}
    f=seg(t,0.0,0.35); roll=seg(t,0.25,0.75); land=seg(t,0.6,0.85)
    add(d,'root',(0,1,0),-95*roll); add(d,'root',(1,0,0),-15*f+10*land)
    flail=sin(TAU*t*4)*(1-roll)
    wings(d,lerp(24*flail,-10,roll),lag=20*flail,twist=45,fold=0.8*land)
    mouth(d,20*f-8*land); add(d,'head',(1,0,0),-15*f+20*land)
    tail(d,TAU*t*2,12*(1-land),6*(1-land),curl=25*land,delay=0.35)
    legs_dangle(d,TAU*t*3,10*(1-land),tuck=30*land)
    return d,(0,0.1*f,0.25*f*(1-roll)-0.02*land)
CLIPS=[('Idle',c_idle,36,True),('Fly',c_fly,24,True),('Glide',c_glide,60,True),('Walk',c_walk,36,True),
       ('Bite',c_bite,30,False),('TailSwipe',c_swipe,30,False),('TailSlam',c_slam,36,False),('Screech',c_screech,42,False),
       ('Hurt',c_hurt,15,False),('Death',c_death,48,False)]
