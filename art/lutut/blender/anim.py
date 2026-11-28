# © 2026 Isaac Flake. All Rights Reserved.
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import bpy, math, mathutils
from rh import W; from pk import Q, wq
bpy.ops.wm.open_mainfile(filepath=W+'stage5.blend')
A=bpy.data.objects['LututRig']; P=A.pose.bones
sc=bpy.context.scene; sc.render.fps=30
S=('.L','.R')
from motion import CLIPS
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
        scl=d.get('__scale__',{})
        for bn in ('chest','spine'):
            sv=scl.get(bn,1.0); P[bn].scale=(sv,sv,sv)
            P[bn].keyframe_insert('scale',frame=f+1,group=bn)
    # stash into NLA so the exporter sees every action
    tr=A.animation_data.nla_tracks.new(); tr.name=name
    st=tr.strips.new(name,1,act); tr.mute=True
    print('clip',name,nf)
A.animation_data.action=None
for pb in P: pb.rotation_quaternion=(1,0,0,0); pb.location=(0,0,0); pb.scale=(1,1,1)
bpy.ops.wm.save_as_mainfile(filepath=W+'stage6.blend')
