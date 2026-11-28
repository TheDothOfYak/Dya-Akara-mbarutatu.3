# © 2026 Isaac Flake. All Rights Reserved.
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import bpy, mathutils, importlib; from rh import *; from pk import Q, wq
import motion
args=sys.argv[sys.argv.index('--')+1:]   # out  clip:t[,clip:t...]  views
bpy.ops.wm.open_mainfile(filepath=W+args[3] if len(args)>3 else W+'stage2.blend')
bpy.data.objects['LututHigh'].hide_render=True
A=bpy.data.objects['LututRig']; P=A.pose.bones
setup(380,light='STUDIO')
V={'q':((-3.0,-3.4,1.5),(0,0.2,0.4)),'s':((4.4,0.3,0.5),(0,0.3,0.4)),'f':((0,-4.4,0.6),(0,0,0.55)),'b':((-2.4,3.6,2.2),(0,0.3,0.4))}
fns=dict((n,f) for n,f,_,_ in motion.CLIPS)
ps=[]
for spec in args[1].split(','):
    name,t=spec.split(':'); d,loc=fns[name](float(t))
    for pb in P:
        q=mathutils.Quaternion()
        for axis,deg in d.get(pb.name,[]): q=Q(axis,deg)@q
        pb.rotation_mode='QUATERNION'; pb.rotation_quaternion=wq(pb,q)
    P['root'].location=loc
    for v in args[2]:
        p=W+f'pp_{name}_{t}_{v}.png'; shot(p,*V[v],lens=32); ps.append(p)
sheet(ps,W+args[0],len(args[2])*2 if len(args[2])<3 else len(args[2]),380)
