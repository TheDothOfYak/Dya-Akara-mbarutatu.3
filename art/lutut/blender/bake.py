# © 2026 Isaac Flake. All Rights Reserved.
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import bpy, time
from rh import W
RES=int(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else 2048
bpy.ops.wm.open_mainfile(filepath=W+'stage3.blend')
H=bpy.data.objects['LututHigh']; L=bpy.data.objects['Lutut']
H.hide_render=False; L.hide_render=False
for ob in (H,L):
    if 'sharp_face' in ob.data.attributes: ob.data.attributes.remove(ob.data.attributes['sharp_face'])
    ob.data.shade_smooth()
# UVs
while L.data.uv_layers: L.data.uv_layers.remove(L.data.uv_layers[0])
L.data.uv_layers.new(name='UVMap')
bpy.ops.object.select_all(action='DESELECT'); L.select_set(True); bpy.context.view_layer.objects.active=L
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
t=time.time(); bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.0025, area_weight=0.0)
bpy.ops.uv.pack_islands(margin=0.0025)
bpy.ops.object.mode_set(mode='OBJECT'); print('uv',time.time()-t)
# source material on High
def srcmat(attr):
    m=bpy.data.materials.get('BakeSrc') or bpy.data.materials.new('BakeSrc'); m.use_nodes=True
    nt=m.node_tree; nt.nodes.clear()
    a=nt.nodes.new('ShaderNodeVertexColor'); a.layer_name=attr
    e=nt.nodes.new('ShaderNodeEmission'); o=nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(a.outputs['Color'],e.inputs['Color']); nt.links.new(e.outputs[0],o.inputs[0])
    H.data.materials.clear(); H.data.materials.append(m)
# target material on Low
tm=bpy.data.materials.new('LututSkin'); tm.use_nodes=True
L.data.materials.clear(); L.data.materials.append(tm)
nt=tm.node_tree
imgs={}
def target(name,noncolor=False,fl=False):
    img=bpy.data.images.new(name,RES,RES,float_buffer=fl)
    if noncolor: img.colorspace_settings.name='Non-Color'
    imgs[name]=img
    nd=nt.nodes.new('ShaderNodeTexImage'); nd.image=img; nd.name=name
    for x in nt.nodes: x.select=False
    nd.select=True; nt.nodes.active=nd
    return img
sc=bpy.context.scene; sc.render.engine='CYCLES'; sc.cycles.device='CPU'; sc.cycles.samples=1
bk=sc.render.bake; bk.margin=6
def bake_sel(kind, **kw):
    bpy.ops.object.select_all(action='DESELECT'); H.select_set(True); L.select_set(True); bpy.context.view_layer.objects.active=L
    bk.use_selected_to_active=True; bk.cage_extrusion=0.012; bk.max_ray_distance=0.06
    t=time.time(); bpy.ops.object.bake(type=kind, **kw); print('bake',kind,time.time()-t)
for name,attr in [('col','Col'),('glow','Glow'),('rough','Rough'),('throat','Throat')]:
    srcmat(attr); img=target('lutut_'+name, noncolor=(name=='rough'))
    bake_sel('EMIT')
    img.filepath_raw=W+f'tex_{name}.png'; img.file_format='PNG'; img.save()
img=target('lutut_normal',noncolor=True)
bake_sel('NORMAL', normal_space='TANGENT')
img.filepath_raw=W+'tex_normal.png'; img.file_format='PNG'; img.save()
# AO on the low mesh itself
H.hide_render=True
sc.cycles.samples=64
img=target('lutut_ao',noncolor=True)
bpy.ops.object.select_all(action='DESELECT'); L.select_set(True); bpy.context.view_layer.objects.active=L
bk.use_selected_to_active=False
t=time.time(); bpy.ops.object.bake(type='AO'); print('bake AO',time.time()-t)
img.filepath_raw=W+'tex_ao.png'; img.file_format='PNG'; img.save()
H.hide_render=False
# ---- position + normal maps of the game mesh -> dotted bioluminescent lines, per texel ----
import numpy as np
from carve import carve
def geo_bake(out_name, socket):
    m=bpy.data.materials.get('GeoSrc') or bpy.data.materials.new('GeoSrc'); m.use_nodes=True
    t=m.node_tree; t.nodes.clear()
    g=t.nodes.new('ShaderNodeNewGeometry'); e=t.nodes.new('ShaderNodeEmission'); o=t.nodes.new('ShaderNodeOutputMaterial')
    t.links.new(g.outputs[socket],e.inputs['Color']); t.links.new(e.outputs[0],o.inputs[0])
    img=bpy.data.images.new(out_name,RES,RES,float_buffer=True); img.colorspace_settings.name='Non-Color'
    nd=t.nodes.new('ShaderNodeTexImage'); nd.image=img
    for x in t.nodes: x.select=False
    nd.select=True; t.nodes.active=nd
    keep=list(L.data.materials); L.data.materials.clear(); L.data.materials.append(m)
    bpy.ops.object.select_all(action='DESELECT'); L.select_set(True); bpy.context.view_layer.objects.active=L
    bk.use_selected_to_active=False; sc.cycles.samples=1; bk.margin=0
    bpy.ops.object.bake(type='EMIT')
    L.data.materials.clear(); [L.data.materials.append(k) for k in keep]
    a=np.array(img.pixels[:],dtype=np.float32).reshape(RES,RES,4)
    return a
Pm=geo_bake('posmap','Position'); Nm=geo_bake('normap','Normal')
valid=(np.abs(Pm[...,:3]).sum(-1)>1e-6)
Pv=Pm[...,:3][valid].astype(np.float64); Nv=Nm[...,:3][valid].astype(np.float64)
Nv/=np.linalg.norm(Nv,axis=1,keepdims=True)+1e-9
_,dot,dcol=carve(Pv,Nv)
out=np.zeros((RES,RES,4),np.float32); out[...,3]=1
out[...,:3][valid]=(dcol*np.clip(dot,0,1)[:,None]).astype(np.float32)
# grow the dots into the bake margin so seams don't cut them
im=bpy.data.images.new('dots',RES,RES,float_buffer=True); im.colorspace_settings.name='Non-Color'
im.pixels[:]=out.ravel()
im.filepath_raw=W+'tex_dots.exr'; im.file_format='OPEN_EXR'; im.save()
print('dot texels',int((dot>0.05).sum()))
bk.margin=6
bpy.ops.wm.save_as_mainfile(filepath=W+'stage4.blend')
