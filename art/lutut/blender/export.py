# © 2026 Isaac Flake. All Rights Reserved.
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import bpy; from rh import W
bpy.ops.wm.open_mainfile(filepath=W+'stage6.blend')
H=bpy.data.objects['LututHigh']; bpy.data.objects.remove(H)
for o in list(bpy.data.objects):
    if o.name not in ('Lutut','LututRig'): bpy.data.objects.remove(o)
A=bpy.data.objects['LututRig']
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
    export_yup=True, export_force_sampling=True, export_optimize_animation_size=True)
