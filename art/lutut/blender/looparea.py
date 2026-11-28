# © 2026 Isaac Flake. All Rights Reserved.
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import bpy, mathutils; from rh import W; from pk import Q, wq; import motion
bpy.ops.wm.open_mainfile(filepath=W+'stage2.blend')
A=bpy.data.objects['LututRig']; P=A.pose.bones
fns=dict((n,f) for n,f,_,_ in motion.CLIPS)
def area(pts):  # shoelace, absolute
    a=0
    for i in range(len(pts)): x1,y1=pts[i]; x2,y2=pts[(i+1)%len(pts)]; a+=x1*y2-x2*y1
    return abs(a)/2
JO=[('elbow','upperarm.L','tail'),('wrist','forearm.L','tail'),('tip1','finger1b.L','tail'),('tip3','finger3b.L','tail')]
for clip in ('Idle','Fly'):
    paths={j:[] for j,_,_ in JO}
    for i in range(36):
        d,loc=fns[clip](i/36)
        for pb in P:
            q=mathutils.Quaternion()
            for axis,deg in d.get(pb.name,[]): q=Q(axis,deg)@q
            pb.rotation_mode='QUATERNION'; pb.rotation_quaternion=wq(pb,q)
        P['root'].location=(0,0,0); P['root'].rotation_quaternion=(1,0,0,0); bpy.context.view_layer.update()
        for j,b,e in JO: paths[j].append(A.matrix_world@getattr(P[b],e))
    for j,_,_ in JO:
        p=paths[j]
        print(clip,j,'front(x,z) %.4f side(y,z) %.4f top(x,y) %.4f'%(area([(v.x,v.z) for v in p]),area([(v.y,v.z) for v in p]),area([(v.x,v.y) for v in p])))
