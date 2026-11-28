# © 2026 Isaac Flake. All Rights Reserved.
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import bpy; from rh import W
bpy.ops.wm.open_mainfile(filepath=W+'stage6.blend')
H=bpy.data.objects['LututHigh']; bpy.data.objects.remove(H)
for o in list(bpy.data.objects):
    if o.name not in ('Lutut','LututRig'): bpy.data.objects.remove(o)
A=bpy.data.objects['LututRig']
import json, mathutils
EY=json.load(open(W+'eyes.json'))
for k,e in EY.items():
    c=mathutils.Vector(e['c'])+mathutils.Vector(e['n'])*0.035
    ld=bpy.data.lights.new('EyeLight.'+k,'POINT'); ld.color=(1.0,0.72,0.18); ld.energy=2.0; ld.shadow_soft_size=0.01
    lo=bpy.data.objects.new('EyeLight.'+k,ld); bpy.context.collection.objects.link(lo)
    lo.location=c
    hb=A.data.bones['head']
    lo.parent=A; lo.parent_type='BONE'; lo.parent_bone='head'
    # keep world position: bone-parent matrix is at the bone tail
    lo.matrix_parent_inverse=(A.matrix_world @ mathutils.Matrix.Translation(hb.tail_local) @ hb.matrix_local.to_3x3().to_4x4().normalized() if False else (A.matrix_world@hb.matrix_local@mathutils.Matrix.Translation((0,hb.length,0)))).inverted()
    lo.location=c
L=bpy.data.objects['Lutut']
bpy.context.view_layer.objects.active=L; L.select_set(True)
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
print('valid',L.data.validate())
for tr in A.animation_data.nla_tracks: tr.mute=False
A.animation_data.action=None
bpy.ops.object.select_all(action='SELECT')
bpy.ops.wm.save_as_mainfile(filepath=W+'Lutut.blend')
bpy.ops.export_scene.gltf(filepath=W+'lutut.glb', export_format='GLB', use_selection=False,
    export_apply=False, export_animations=True, export_animation_mode='ACTIONS',
    export_skins=True, export_def_bones=False, export_image_format='JPEG', export_jpeg_quality=90,
    export_yup=True, export_lights=True, export_force_sampling=True, export_optimize_animation_size=True)
