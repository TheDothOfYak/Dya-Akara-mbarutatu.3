# © 2026 Isaac Flake. All Rights Reserved.
import bpy, mathutils, bmesh
import sys as _s; _s.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__))); from rh import W
bpy.ops.wm.open_mainfile(filepath=W+'raw.blend')
for n in ['Sperm','Sperm_1','Cone','Cone_1']: bpy.data.objects.remove(bpy.data.objects[n])
o=bpy.data.objects['Full']; o.name='LututHigh'
bpy.context.view_layer.objects.active=o; o.select_set(True)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
# recenter: x centre -0.21, y -0.55, feet z 0.92  -> origin
OFF=mathutils.Vector((-0.21,-0.55,0.92))
o.data.transform(mathutils.Matrix.Translation(-OFF))
o.data.update()
lo=o.copy(); lo.data=o.data.copy(); lo.name='Lutut'; bpy.context.collection.objects.link(lo)
m=lo.modifiers.new('dec','DECIMATE'); m.ratio=0.13; m.use_collapse_triangulate=True
bpy.context.view_layer.objects.active=lo
bpy.ops.object.modifier_apply(modifier='dec')
print('LOW tris',sum(len(p.vertices)-2 for p in lo.data.polygons),'verts',len(lo.data.vertices))
bm=bmesh.new(); bm.from_mesh(lo.data)
nm=[e for e in bm.edges if not e.is_manifold]; print('nonmanifold edges',len(nm))
bm2=bmesh.new(); bm2.from_mesh(o.data); print('HIGH nonmanifold', len([e for e in bm2.edges if not e.is_manifold]))
bpy.ops.wm.save_as_mainfile(filepath=W+'stage1.blend')
