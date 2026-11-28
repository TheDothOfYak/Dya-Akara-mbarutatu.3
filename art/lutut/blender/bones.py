# © 2026 Isaac Flake. All Rights Reserved.
# bone layout for the Lutut (rest pose, metres-ish, origin at feet, faces -Y)
def mirror(p): return (-p[0],p[1],p[2])
B=[]  # name, head, tail, parent, deform
def b(n,h,t,p=None,d=True): B.append((n,tuple(h),tuple(t),p,d))
b('root',(0,0,0),(0,0.25,0),None,False)
b('spine',(0,0.40,0.44),(0,0.0,0.45),'root')
b('chest',(0,0.0,0.45),(0,-0.38,0.47),'spine')
b('head',(0,-0.38,0.47),(0,-0.86,0.45),'chest')
b('jaw_up',(0,-0.42,0.50),(0,-0.80,0.62),'head')
b('jaw_low',(0,-0.42,0.38),(0,-0.80,0.18),'head')
T=[(0,0.40,0.44),(0,0.62,0.40),(-0.03,0.86,0.36),(-0.02,1.10,0.31),(-0.09,1.33,0.22),(-0.14,1.445,0.10),(-0.10,1.39,-0.10),(-0.06,1.27,-0.30)]
par='spine'
for i in range(len(T)-1):
    n=f'tail{i+1}'; b(n,T[i],T[i+1],par); par=n
b('tail_ball',T[-1],(-0.04,1.20,-0.44),par)
def side(s,L):
    S='.L' if s<0 else '.R'
    f=lambda p:(p[0]*(1 if s<0 else -1)*(-1) if False else p[0],p[1],p[2])
    sh,el,wr=L['sh'],L['el'],L['wr']
    b('upperarm'+S,sh,el,'chest'); b('forearm'+S,el,wr,'upperarm'+S)
    for k,tip in enumerate(L['f']):
        mid=tuple(wr[i]+(tip[i]-wr[i])*0.5 for i in range(3))
        b(f'finger{k+1}a'+S,wr,mid,'forearm'+S); b(f'finger{k+1}b'+S,mid,tip,f'finger{k+1}a'+S)
    for nm,(hip,knee,ank,toe,parent) in L['legs'].items():
        b(nm+'_thigh'+S,hip,knee,parent); b(nm+'_shin'+S,knee,ank,nm+'_thigh'+S); b(nm+'_foot'+S,ank,toe,nm+'_shin'+S)
side(-1,dict(sh=(-0.30,-0.12,0.64),el=(-0.48,-0.17,0.84),wr=(-0.60,-0.17,1.00),
  f=[(-1.689,-0.19,1.097),(-1.53,-0.11,0.76),(-1.146,-0.09,0.546),(-0.849,-0.08,0.517)],
  legs={'front':((-0.22,-0.34,0.34),(-0.27,-0.33,0.17),(-0.28,-0.36,0.05),(-0.28,-0.46,0.0),'chest'),
        'back':((-0.22,0.20,0.36),(-0.28,0.24,0.19),(-0.29,0.21,0.06),(-0.29,0.11,0.0),'spine')}))
side(1,dict(sh=(0.29,-0.08,0.64),el=(0.47,-0.12,0.85),wr=(0.60,-0.13,1.02),
  f=[(1.592,-0.07,1.116),(1.45,0.0,0.76),(1.057,-0.01,0.555),(0.80,-0.02,0.52)],
  legs={'front':((0.20,-0.32,0.34),(0.24,-0.31,0.17),(0.24,-0.34,0.05),(0.24,-0.44,0.0),'chest'),
        'back':((0.20,0.22,0.36),(0.23,0.26,0.19),(0.22,0.23,0.06),(0.22,0.13,0.0),'spine')}))
