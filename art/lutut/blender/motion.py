# © 2026 Isaac Flake. All Rights Reserved.
import math
from bones import NT, B
S=('.L','.R')
sin,cos,pi=math.sin,math.cos,math.pi
TAU=2*pi
LEAD=(-1.389,-0.07,0.457)          # left wing leading edge, shoulder -> tip
def sa(axis,s): return axis if s=='.L' else (axis[0],-axis[1],-axis[2])
def ease(x): x=min(max(x,0),1); return x*x*(3-2*x)
def seg(t,a,b): return ease((t-a)/(b-a)) if b>a else float(t>=a)
def lerp(a,b,t): return a+(b-a)*t
def add(d,bone,axis,deg):
    if bone=='head': bone='chest'; deg*=0.5          # no neck: the head is the body, it only moves with it
    if abs(deg)>1e-6: d.setdefault(bone,[]).append((axis,deg))
def scale(d,bone,s): d.setdefault('__scale__',{})[bone]=s

# ---- the tail at rest: relaxed, nearly straight out behind, a slight droop (the sculpt curls it down) ----
_tb=[(h,t) for nm,h,t,p,dd in B if nm.startswith('tail') and nm!='tail_ball']
def _pitch(h,t): return math.degrees(math.atan2(t[2]-h[2],t[1]-h[1]))
_rest=[_pitch(h,t) for h,t in _tb]
_target=[-4-1.2*i for i in range(NT)]                  # gentle droop growing toward the tip
TAILREST=[]; _acc=0.0
for i in range(NT):
    dlt=(_target[i]-_rest[i])-_acc; TAILREST.append(dlt); _acc+=dlt
def tail_rest(d,k=1.0):
    for i in range(NT): add(d,f'tail{i+1}',(1,0,0),TAILREST[i]*k)

TUCK=dict(ua_y=-62,ua_z=-30,ua_x=10,fa_y=-30,fz=[-112,-104,-96,-88],fx=[-8,-16,-24,-32],fb=-14)
def wings(d, up=0.0, sweep=0.0, lag=0.0, twist=0.0, ffold=0.0, fold=0.0, spread=0.0, s_only=None, sgn_up=None):
    """up: + raises the arm; lag: tips trail; twist: + tilts the membrane back; ffold: 0..1 partial finger fold
       (upstroke); fold: 0..1 full tuck against the body; spread: + opens the fingers apart."""
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
def flap(t, amp=28, bias=-6):
    ph=TAU*t
    up=bias+amp*cos(ph)                  # top of the stroke at t=0, bottom at 0.5
    lag=-amp*0.35*sin(ph)
    return up,lag,max(0.0,-sin(ph)),max(0.0,sin(ph))
def beat(d,t,amp=28,bias=-6,base_twist=45,sweep=6):
    up,lag,u,dn=flap(t,amp,bias)
    wings(d,up,sweep=sweep*sin(TAU*t),lag=lag,twist=base_twist+18*u-8*dn,ffold=0.6*u)
    return up
TW=[(0.5+(i+1)/NT)*7/NT for i in range(NT)]
def tail(d, ph, side=6.0, upamp=3.0, lift=0.0, curl=0.0, delay=0.32, rest=1.0):
    """a wave travelling down the tail: it follows the body with a delay along its length"""
    tail_rest(d,rest)
    for i in range(NT):
        w=TW[i]
        add(d,f'tail{i+1}',(0,0,1),side*w*sin(ph - i*delay))
        add(d,f'tail{i+1}',(1,0,0),upamp*w*sin(ph - i*delay + 1.3) + (lift if i==0 else lift*0.08) - curl*w*0.5)
def legs_dangle(d, ph, amp=6, tuck=0.0):
    for s in S:
        for leg,o in (('front',0),('back',0.8)):
            add(d,f'{leg}_thigh'+s,(1,0,0),tuck + amp*sin(ph+o))
            add(d,f'{leg}_shin'+s,(1,0,0),-tuck*0.6 + amp*0.6*sin(ph+o-0.7))
            add(d,f'{leg}_foot'+s,(1,0,0),-tuck*0.3 + amp*0.5*sin(ph+o-1.2))
def gait(d, ph, stride=26, lift=38):
    """four-legged walk/run: diagonal pairs"""
    for s,o in (('.L',0),('.R',pi)):
        for leg,lo in (('front',0),('back',pi)):
            p=ph+o+lo
            sw=-stride*sin(p); lf=max(0,cos(p))
            add(d,f'{leg}_thigh'+s,(1,0,0),sw)
            add(d,f'{leg}_shin'+s,(1,0,0),-lift*lf)
            add(d,f'{leg}_foot'+s,(1,0,0),lift*0.8*lf - sw*0.4)
def mouth(d, op):
    """the lamprey mouth is always open: it can only flare wider (op>=0), never close"""
    op=max(0.0,op)
    add(d,'jaw_up',(1,0,0),-op); add(d,'jaw_low',(1,0,0),op)

# ================= clips: t in [0,1] -> (pose dict, root location) =================
# ---- in the air ----
def c_idle(t):
    d={}; beat(d,t,28,-6,45)
    tail(d,TAU*t,12,7,delay=0.38); legs_dangle(d,TAU*t+1,5)
    add(d,'spine',(1,0,0),2*sin(TAU*t)); mouth(d,2+2*sin(TAU*t))
    return d,(0,0,0.07*sin(TAU*t+pi*0.5))
def c_fly(t):
    d={}; beat(d,t,36,-8,48,10)
    # in flight the tail is always working: a big travelling S that rides the wingbeat
    tail(d,TAU*t,18,9,lift=5,delay=0.42); legs_dangle(d,TAU*t,3,tuck=48)
    add(d,'root',(1,0,0),8); add(d,'root',(0,1,0),3*sin(TAU*t))
    return d,(0,0,0.09*sin(TAU*t+pi*0.5))
def c_glide(t):
    d={}
    wings(d,6+3*sin(TAU*t),lag=-3,twist=50+3*sin(TAU*t),spread=4)
    add(d,'root',(0,1,0),6*sin(TAU*t)); add(d,'root',(1,0,0),5)
    tail(d,TAU*t,14,5,lift=3,delay=0.3); legs_dangle(d,TAU*t,3,tuck=40)
    return d,(0,0,0.04*sin(TAU*t))
# ---- on the ground: wings always tucked ----
def c_stand(t):
    d={}; wings(d,fold=1.0)
    ph=TAU*t
    scale(d,'chest',1+0.025*sin(ph)); scale(d,'spine',1+0.02*sin(ph-0.4))   # slow breathing
    tail(d,ph,6,2,lift=6,delay=0.3)
    mouth(d,2+2*sin(ph))
    return d,(0,0,0.02)
def c_walk(t):
    d={}; wings(d,fold=1.0)
    ph=TAU*t; gait(d,ph)
    add(d,'spine',(0,0,1),4*sin(ph)); add(d,'chest',(0,0,1),-5*sin(ph)); add(d,'chest',(0,1,0),3*sin(ph))
    tail(d,ph,14,3,lift=10,delay=0.3)
    return d,(0,0,0.025*abs(sin(ph))+0.02)
# ---- take-off and landing.  Root z is the height the clip itself carries: the game keeps the Lútut on the
#      ground while TakeOff plays and sets its flying height to TAKEOFF_END when the clip ends; landings start at
#      LAND_FROM above the ground and end on it. ----
TAKEOFF_END=1.6; LAND_FROM=2.2
def c_takeoff(t):
    d={}
    run=1-seg(t,0.42,0.5); jump=seg(t,0.42,0.55); air=seg(t,0.5,1.0)
    # wings spread wide and high while it runs, then the first big downstroke at the jump
    if t<0.5:
        wings(d,lerp(-2,8,seg(t,0,0.2))+3*sin(TAU*t*4),sweep=-4,twist=lerp(30,40,seg(t,0.3,0.5)),spread=14,lag=3*sin(TAU*t*4))
    else:
        tt=(t-0.5)/0.5*2.5             # two and a half strong beats
        up,lag,u,dn=flap(tt%1,44,-4)
        wings(d,up,sweep=8*sin(TAU*tt),lag=lag*1.2,twist=40+16*u-10*dn,ffold=0.5*u,spread=6)
    ph=TAU*t*4.5                       # running strides
    if t<0.5: gait(d,ph,stride=34*run,lift=48*run)
    crouch=seg(t,0.34,0.44)*(1-jump)
    for s in S:
        for leg in ('front','back'):
            add(d,f'{leg}_thigh'+s,(1,0,0),(-20 if leg=='front' else 25)*crouch + 35*jump*(1-air*0.3))
            add(d,f'{leg}_shin'+s,(1,0,0),-30*crouch - 25*jump)
    add(d,'root',(1,0,0),6*run*sin(ph*2)*0.3 - 14*jump*(1-air) + 6*air)
    tail(d,ph if t<0.5 else TAU*t*2.5,10,4,lift=12*run+6*air,delay=0.35)
    mouth(d,4+6*jump)
    z=0.03*abs(sin(ph))*run - 0.08*crouch + jump*(0.7+(TAKEOFF_END-0.7)*air)
    return d,(0,0,z)
def c_land_glide(t):
    d={}
    glide=1-seg(t,0.45,0.62); flare=seg(t,0.4,0.6)*(1-seg(t,0.7,0.85)); touch=seg(t,0.62,0.7); fold=seg(t,0.72,1.0)
    w=dict(up=lerp(6,30,flare),sweep=lerp(0,18,flare),twist=lerp(50,5,flare),lag=-6*flare,spread=6*glide,fold=fold)
    wings(d,**w)
    add(d,'root',(1,0,0),lerp(6,-24,flare)*(1-fold*0.9))
    for s in S:
        for leg in ('front','back'):
            add(d,f'{leg}_thigh'+s,(1,0,0),lerp(40,(-25 if leg=='front' else 10),seg(t,0.3,0.6))*(1-touch*0.8))
            add(d,f'{leg}_shin'+s,(1,0,0),-25*touch*(1-fold)*0.6)
    tail(d,TAU*t,10*(1-touch*0.5),4,lift=-8*flare,delay=0.3)
    mouth(d,3)
    h=LAND_FROM*(1-seg(t,0.0,0.66))**1.6
    bounce=-0.07*seg(t,0.64,0.7)*(1-seg(t,0.7,0.85))
    return d,(0,0,h+bounce)
def c_land_barrel(t):
    """wings tucked, it barrels into the ground: rolls over along its length and comes up on its feet"""
    d={}
    tuck=seg(t,0.0,0.15); hit=seg(t,0.28,0.34); roll=seg(t,0.3,0.72); up_=seg(t,0.72,0.95)
    wings(d,fold=tuck)
    add(d,'root',(0,1,0),-360*roll)                     # a full roll about its length
    add(d,'root',(1,0,0),18*tuck*(1-hit) - 8*hit*(1-up_))
    tail(d,TAU*t*1.5,6,3,curl=lerp(0,30,tuck)*(1-up_),delay=0.3)
    for s in S:
        for leg in ('front','back'):
            add(d,f'{leg}_thigh'+s,(1,0,0),45*tuck*(1-up_)); add(d,f'{leg}_shin'+s,(1,0,0),-30*tuck*(1-up_))
    mouth(d,6+10*hit*(1-roll))
    zfall=LAND_FROM*(1-seg(t,0.05,0.32))**1.3
    zroll=0.34*sin(pi*roll)*(roll>0)                     # its body is round: it rides up as it rolls over
    return d,(0,0,max(zfall,0)+zroll-0.04*hit*(1-roll))
# ---- feeding and attacks.  It has no bite: the mouth can't close. It sucks things in. ----
def c_suck(t):
    """hover, flare the mouth wide and draw everything in: the body swells with the breath"""
    d={}
    a=seg(t,0.0,0.25); hold=seg(t,0.25,0.3)*(1-seg(t,0.8,1.0)); r=seg(t,0.8,1.0)
    up,lag,u,dn=flap(t*2%1,24,-4); beat(d,t*2%1,24,-4,45)
    add(d,'root',(1,0,0),10*a*(1-r))                     # nose a little down, toward what it's eating
    mouth(d,lerp(2,26,a)*(1-r)+2+3*sin(TAU*t*16)*hold)
    sw=1+0.08*a*(1-r)+0.02*sin(TAU*t*8)*hold
    scale(d,'chest',sw); scale(d,'spine',1+0.05*a*(1-r))
    tail(d,TAU*t*2,10,6,delay=0.38); legs_dangle(d,TAU*t,4,tuck=15*a*(1-r))
    return d,(0,-0.12*a*(1-r),0.05*sin(TAU*t*2))
def c_dive(t):
    """fold back and stoop on its prey, flare the mouth at the bottom, then pull up"""
    d={}
    tip=seg(t,0.0,0.2); stoop=seg(t,0.15,0.55); flare=seg(t,0.5,0.62); pull=seg(t,0.62,0.85); r=seg(t,0.85,1.0)
    st=stoop*(1-pull)
    add(d,'root',(1,0,0),lerp(lerp(0,55,tip),-20,pull)*(1-r))
    if t<0.62: wings(d,lerp(20,-10,st),sweep=-30*st,twist=60*st,fold=0.55*st,lag=-5)
    else:
        tt=(t-0.62)/0.38*1.5; up,lag,u,dn=flap(tt%1,46,-4)
        wings(d,up,lag=lag,twist=40+16*u,ffold=0.5*u,spread=6)
    mouth(d,lerp(4,30,flare)*(1-r)+4)
    scale(d,'chest',1+0.06*flare*(1-r))
    tail(d,TAU*t*2,6+10*pull,4,lift=10*st,delay=0.35); legs_dangle(d,TAU*t,3,tuck=45*st)
    return d,(0,-0.4*st,-0.6*st+0.3*pull*(1-r))
SM=0.74
def _smack_under(t):
    """the main tail attack: the tail whips down and forward under its belly"""
    d={}
    wind=seg(t,0.0,0.35); hit=seg(t,0.35,0.5); rc=seg(t,0.65,1.0)
    for i in range(NT):
        k=i/(NT-1)
        a=lerp(lerp(0,3-2*k,wind),-(22-10*k)*SM,hit)*(1-rc)
        add(d,f'tail{i+1}',(1,0,0),a)
    tail(d,TAU*t,4*(1-hit),3,delay=0.35)
    add(d,'root',(1,0,0),lerp(lerp(0,10,wind),-22,hit)*(1-rc))   # nose up so the tail swings through underneath
    up,lag,u,dn=flap(min(t*1.6,1),30,-4)
    wings(d,lerp(up,lerp(26,-24,hit),max(wind,hit)*(1-rc)),lag=lag,twist=45,ffold=0.3*wind*(1-hit))
    legs_dangle(d,TAU*t,4,tuck=30*hit*(1-rc))
    mouth(d,4+8*hit*(1-rc))
    return d,(0,0.1*hit*(1-rc),0.1*wind*(1-hit)+0.25*hit*(1-rc))
def c_smack(t): return _smack_under(t)
def c_smack_up(t):
    """only for something above it: the tail coils over the back and hammers down in front of the face"""
    d={}
    up_=seg(t,0.0,0.38); hit=seg(t,0.38,0.5); rc=seg(t,0.66,1.0)
    tail_rest(d,1-max(up_,hit)*(1-rc))
    for i in range(NT):
        coil=25 if i<3 else (14 if i<8 else 0)
        strike=34 if i<3 else (26 if i<8 else 4)
        a=lerp(lerp(0,coil,up_),strike,hit); a=lerp(a,0,rc)
        add(d,f'tail{i+1}',(1,0,0),a)
    pitch=lerp(lerp(0,-14,up_),35,hit); pitch=lerp(pitch,0,rc)
    add(d,'root',(1,0,0),pitch)
    mouth(d,4+lerp(lerp(0,8,up_),16,hit)*(1-rc))
    up,lag,u,dn=flap(min(t*1.6,1),28,-6)
    w=max(up_,hit)*(1-rc)
    wings(d,lerp(up,lerp(28,-30,hit),w),lag=lerp(lag,-20*hit,w),twist=45-15*hit*(1-rc),ffold=0.3*up_*(1-hit))
    legs_dangle(d,TAU*t,4,tuck=25*hit*(1-rc))
    return d,(0,0.08*up_*(1-hit)-0.25*hit*(1-rc),(0.08*up_+0.3*hit)*(1-rc))
SW=150
def _swipe(t,sg):
    """a sideways club: sg=+1 swings the ball out to its left, -1 to its right"""
    d={}
    tw=seg(t,0.0,0.3); wh=seg(t,0.3,0.5); rc=seg(t,0.65,1.0)
    turn=lerp(lerp(-15*tw,25,wh),0,rc)*sg
    add(d,'root',(0,0,1),turn); add(d,'chest',(0,0,1),-turn*0.2)
    tail_rest(d)
    K=lerp(lerp(30*tw,-SW,wh),0,rc)*sg                      # total bend down the tail, degrees
    ws=[1.4-0.8*i/(NT-1) for i in range(NT)]; sws=sum(ws)
    for i in range(NT): add(d,f'tail{i+1}',(0,0,1),K*ws[i]/sws)
    for i in range(NT): add(d,f'tail{i+1}',(1,0,0),-10*wh*(1-rc)*ws[i]/sws)
    beat(d,(t*1.5)%1,28,-6,45)
    mouth(d,4+6*wh*(1-rc)); legs_dangle(d,TAU*t,5)
    return d,(0,0,0.05*sin(TAU*t))
def c_swipe_l(t): return _swipe(t,1)
def c_swipe_r(t): return _swipe(t,-1)
def c_screech(t):
    d={}
    r=seg(t,0,0.25)*(1-seg(t,0.8,1.0))
    add(d,'root',(1,0,0),-28*r); add(d,'chest',(1,0,0),-10*r)
    shake=sin(TAU*t*14)*r
    add(d,'chest',(0,0,1),3*shake); add(d,'chest',(0,1,0),2*shake)
    mouth(d,4+30*r+4*shake)
    scale(d,'chest',1+0.05*r)
    wings(d,lerp(8,28,r)+5*sin(TAU*t*10)*r,lag=6*sin(TAU*t*10)*r,twist=lerp(45,20,r),spread=14*r)
    tail(d,TAU*t*2,16*r+5,6,lift=10*r,delay=0.35)
    legs_dangle(d,TAU*t*3,8*r,tuck=-15*r)
    return d,(0,0.1*r,0.15*r)
def c_hurt(t):
    d={}
    h=seg(t,0,0.15)*(1-seg(t,0.3,1.0))
    add(d,'root',(1,0,0),-18*h); add(d,'root',(0,1,0),10*h)
    mouth(d,4+16*h)
    wings(d,lerp(6,32,h),lag=-25*h,twist=45-10*h,ffold=0.3*h)
    tail(d,TAU*t,8+14*h,5,delay=0.35); legs_dangle(d,TAU*t,4+10*h)
    return d,(0,0.18*h,0.05*h)
def c_death(t):
    d={}
    f=seg(t,0.0,0.35); roll=seg(t,0.25,0.75); land=seg(t,0.6,0.85)
    add(d,'root',(0,1,0),-95*roll); add(d,'root',(1,0,0),-15*f+10*land)
    flail=sin(TAU*t*4)*(1-roll)
    wings(d,lerp(24*flail,-10,roll),lag=20*flail,twist=45,fold=0.8*land)
    mouth(d,4+20*f-8*land)
    tail(d,TAU*t*2,12*(1-land),6*(1-land),curl=25*land,delay=0.35)
    legs_dangle(d,TAU*t*3,10*(1-land),tuck=30*land)
    return d,(0,0.1*f,0.25*f*(1-roll)-0.02*land)
CLIPS=[('Idle',c_idle,36,True),('Fly',c_fly,24,True),('Glide',c_glide,60,True),('Stand',c_stand,72,True),('Walk',c_walk,36,True),
       ('TakeOff',c_takeoff,66,False),('LandGlide',c_land_glide,60,False),('LandBarrel',c_land_barrel,48,False),
       ('Suck',c_suck,45,False),('Dive',c_dive,42,False),
       ('TailSmack',c_smack,30,False),('TailSmackUp',c_smack_up,36,False),('TailSwipeL',c_swipe_l,30,False),('TailSwipeR',c_swipe_r,30,False),
       ('Screech',c_screech,42,False),('Hurt',c_hurt,15,False),('Death',c_death,48,False)]
