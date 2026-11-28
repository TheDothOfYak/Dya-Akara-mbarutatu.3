# © 2026 Isaac Flake. All Rights Reserved.
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import bpy, mathutils; from rh import W; from bones import B
bpy.ops.wm.open_mainfile(filepath=W+'stage1.blend')
L=bpy.data.objects['Lutut']
arm=bpy.data.armatures.new('LututRig'); A=bpy.data.objects.new('LututRig',arm); bpy.context.collection.objects.link(A)
bpy.context.view_layer.objects.active=A; bpy.ops.object.mode_set(mode='EDIT')
for n,h,t,p,d in B:
    e=arm.edit_bones.new(n); e.head=h; e.tail=t; e.use_deform=d
    if p: e.parent=arm.edit_bones[p]; e.use_connect=(mathutils.Vector(arm.edit_bones[p].tail)-mathutils.Vector(h)).length<1e-4
    # roll: keep bone Z pointing world up-ish (or forward for vertical bones)
for e in arm.edit_bones:
    v=(e.tail-e.head).normalized()
    e.align_roll(mathutils.Vector((0,-1,0)) if abs(v.z)>0.8 else mathutils.Vector((0,0,1)))
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='DESELECT'); L.select_set(True); A.select_set(True); bpy.context.view_layer.objects.active=A
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
vg=L.vertex_groups
import numpy as _np
ball=vg['tail_ball']; bc=mathutils.Vector((-0.05,1.33,-0.24)); nb=0
for v in L.data.vertices:
    if v.co.z<-0.1 and (v.co-bc).length<0.22:
        for g in list(v.groups): vg[g.group].remove([v.index])
        ball.add([v.index],1.0,'REPLACE'); nb+=1
print('ball verts',nb)

empty=[v.index for v in L.data.vertices if len(v.groups)==0]
print('unweighted verts',len(empty),'of',len(L.data.vertices))
bpy.ops.wm.save_as_mainfile(filepath=W+'stage2.blend')
