# © 2026 Isaac Flake. All Rights Reserved.
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import bpy, mathutils; from rh import W
bpy.ops.wm.open_mainfile(filepath=W+'stage6.blend')
for o in list(bpy.data.objects):
    if o.name not in ('Lutut','LututRig'): bpy.data.objects.remove(o)
A=bpy.data.objects['LututRig']; L=bpy.data.objects['Lutut']
bpy.context.view_layer.objects.active=L
for o in bpy.context.view_layer.objects: o.select_set(o is L)
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
L.data.validate()
# ---- low-detail copy (same skeleton, same textures) ----
lod=L.copy(); lod.data=L.data.copy(); lod.name='Lutut_LOD1'; bpy.context.collection.objects.link(lod)
for mo in list(lod.modifiers):
    if mo.type!='ARMATURE': lod.modifiers.remove(mo)
dm=lod.modifiers.new('dec','DECIMATE'); dm.ratio=0.245; dm.use_collapse_triangulate=True
bpy.ops.object.select_all(action='DESELECT'); lod.select_set(True); bpy.context.view_layer.objects.active=lod
bpy.ops.object.modifier_move_to_index(modifier='dec',index=0); bpy.ops.object.modifier_apply(modifier='dec')
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
print('LOD tris',sum(len(p.vertices)-2 for p in lod.data.polygons))
# ---- hit points and collision spheres, riding the bones (exported as nodes with extras) ----
def attach(name, bone, at, r, kind):
    e=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(e)
    e.empty_display_type='SPHERE'; e.empty_display_size=r
    hb=A.data.bones[bone]
    e.parent=A; e.parent_type='BONE'; e.parent_bone=bone
    e.matrix_parent_inverse=(A.matrix_world@hb.matrix_local@mathutils.Matrix.Translation((0,hb.length,0))).inverted()
    e.location=at
    e['lutut_radius']=r; e['lutut_kind']=kind
ATT=[('hit_mouth','head',(0.012,-0.80,0.33),0.26,'hit'),
     ('hit_tail','tail_ball',(-0.05,1.33,-0.24),0.22,'hit'),
     ('col_body_front','chest',(0,-0.45,0.45),0.40,'body'),
     ('col_body_mid','spine',(0,-0.05,0.44),0.38,'body'),
     ('col_body_rear','spine',(0,0.28,0.42),0.30,'body'),
     ('col_tail_1','tail2',(-0.04,0.50,0.405),0.16,'tail'),('col_tail_2','tail4',(-0.047,0.72,0.37),0.12,'tail'),
     ('col_tail_3','tail6',(-0.055,0.96,0.325),0.10,'tail'),('col_tail_4','tail8',(-0.08,1.16,0.275),0.09,'tail'),
     ('col_tail_5','tail10',(-0.125,1.32,0.18),0.08,'tail'),('col_tail_6','tail12',(-0.155,1.44,0.03),0.08,'tail'),
     ('col_tail_ball','tail_ball',(-0.05,1.33,-0.24),0.2,'tail'),
     ('col_wing_L0','forearm.L',(-0.60,-0.17,1.00),0.12,'wing'),('col_wing_L1','finger1a.L',(-1.14,-0.18,1.05),0.20,'wing'),
     ('col_wing_L2','finger2a.L',(-1.07,-0.14,0.88),0.22,'wing'),('col_wing_L3','finger3a.L',(-0.87,-0.13,0.77),0.20,'wing'),
     ('col_wing_R0','forearm.R',(0.60,-0.13,1.02),0.12,'wing'),('col_wing_R1','finger1a.R',(1.10,-0.10,1.07),0.20,'wing'),
     ('col_wing_R2','finger2a.R',(1.03,-0.065,0.89),0.22,'wing'),('col_wing_R3','finger3a.R',(0.83,-0.07,0.79),0.20,'wing')]
for a in ATT: attach(*a)
for tr in A.animation_data.nla_tracks: tr.mute=False
A.animation_data.action=None
bpy.ops.object.select_all(action='SELECT')
bpy.ops.wm.save_as_mainfile(filepath=W+'Lutut.blend')
bpy.ops.export_scene.gltf(filepath=W+'lutut.glb', export_format='GLB', use_selection=False,
    export_apply=False, export_animations=True, export_animation_mode='ACTIONS',
    export_skins=True, export_def_bones=False, export_image_format='JPEG', export_jpeg_quality=90,
    export_yup=True, export_extras=True, export_lights=False, export_force_sampling=True, export_optimize_animation_size=True)
