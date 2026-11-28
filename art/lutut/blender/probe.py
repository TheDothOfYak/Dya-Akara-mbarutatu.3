# © 2026 Isaac Flake. All Rights Reserved.
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import bpy, mathutils; from rh import W; from pk import Q, wq; import motion
bpy.ops.wm.open_mainfile(filepath=W+'stage2.blend')
A=bpy.data.objects['LututRig']; P=A.pose.bones
fns=dict((n,f) for n,f,_,_ in motion.CLIPS)
for spec in sys.argv[sys.argv.index('--')+1:]:
    name,t=spec.split(':'); d,loc=fns[name](float(t))
    for pb in P:
        q=mathutils.Quaternion()
        for axis,deg in d.get(pb.name,[]): q=Q(axis,deg)@q
        pb.rotation_mode='QUATERNION'; pb.rotation_quaternion=wq(pb,q); pb.scale=(1,1,1)
    P['root'].location=loc; bpy.context.view_layer.update()
    f=lambda v: tuple(round(c,2) for c in (A.matrix_world@v))
    print(spec,'ball',f(P['tail_ball'].tail),'tailbase',f(P['tail1'].tail),'mouth',f(P['head'].tail))
