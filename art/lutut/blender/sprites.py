# © 2026 Isaac Flake. All Rights Reserved.
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
# Renders the Lútut for the 2D games, from the finished model:
#   stryx  - seen from above, facing right (Stryx Pilot)
#   pixel  - side view facing right, rendered big for the 4 Brothers pixel sprites, plus an eyes-only mask
#   skaar  - side view turned a little toward the viewer (Skaar Uverkhron)
import bpy, mathutils, os, json
from rh import W
OUT=W+'sprites/'; os.makedirs(OUT,exist_ok=True)
ONLY_PIXEL='pixel' in sys.argv
bpy.ops.wm.open_mainfile(filepath=W+'Lutut.blend')
for o in bpy.data.objects:
    if o.type=='EMPTY' or o.name=='Lutut_LOD1': o.hide_render=True
A=bpy.data.objects['LututRig']
for tr in A.animation_data.nla_tracks: tr.mute=True
sc=bpy.context.scene; sc.render.engine='BLENDER_EEVEE'; sc.render.film_transparent=True
try: sc.eevee.taa_render_samples=24
except Exception: pass
sc.view_settings.view_transform='Standard'
w=sc.world or bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; bgn=w.node_tree.nodes['Background']
skin=bpy.data.materials['Lutut']; throat=bpy.data.materials['LututThroat']
def bsdf(m): return [n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'][0]
def throat_glow(v): bsdf(throat).inputs['Emission Strength'].default_value=v
lights=[]
def lamp(loc,e,col,size=3):
    l=bpy.data.lights.new('l','AREA'); l.energy=e; l.size=size; l.color=col; o=bpy.data.objects.new('l',l); sc.collection.objects.link(o); o.location=loc
    o.rotation_euler=(mathutils.Vector((0,0.2,0.5))-mathutils.Vector(loc)).to_track_quat('-Z','Y').to_euler(); lights.append(o); return o
cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera=cam; cam.data.type='ORTHO'
def look(loc,target,up=(0,0,1)):
    cam.location=loc; f=(mathutils.Vector(target)-mathutils.Vector(loc)).normalized()
    r=f.cross(mathutils.Vector(up)).normalized(); u=r.cross(f)
    m=mathutils.Matrix((r,u,-f)).transposed(); cam.rotation_euler=m.to_euler()
def pose(clip,t):
    act=bpy.data.actions[clip]; A.animation_data.action=act
    f0,f1=act.frame_range; sc.frame_set(int(round(f0+(f1-f0)*t)))
def shot(path):
    sc.render.filepath=path; bpy.ops.render.render(write_still=True)
def lighting(kind):
    for o in lights: bpy.data.objects.remove(o)
    lights.clear()
    bgn.inputs[0].default_value=(0.32,0.30,0.38,1); bgn.inputs[1].default_value=1.0
    if kind=='top':
        lamp((-2,-2,6),900,(1,0.95,0.9),4); lamp((3,3,3),500,(0.75,0.65,1.0),3)
    else:
        lamp((-4,-3,4),900,(1,0.95,0.9),4); lamp((3,4,3),700,(0.75,0.65,1.0),3); lamp((-2,3,-1),200,(0.6,0.6,0.8),3)
JOBS=[]
# ---- Stryx Pilot: from above, facing right (model front is -Y), 320 px
sc.render.resolution_x=sc.render.resolution_y=320; cam.data.ortho_scale=4.0; lighting('top')
look((0,0.35,8),(0,0.35,0),up=(1,0,0))
for clip,t,name in ([] if ONLY_PIXEL else [('Fly',0,'fly0'),('Fly',1/6,'fly1'),('Fly',2/6,'fly2'),('Fly',3/6,'fly3'),('Fly',4/6,'fly4'),('Fly',5/6,'fly5'),
                    ('Glide',0.25,'glide'),('Dive',0.3,'dive0'),('Dive',0.5,'dive1'),('Screech',0.5,'screech')]):
    throat_glow(2.0 if clip=='Screech' else 0.0); pose(clip,t); shot(OUT+f'stryx_{name}.png'); JOBS.append(('stryx',name))
# ---- 4 Brothers: side view facing right, rendered at 512 then reduced to pixels; plus an eyes-only mask
sc.render.resolution_x=512; sc.render.resolution_y=384; cam.data.ortho_scale=3.6; lighting('side')
look((-7.2,-1.6,3.0),(0,0.3,0.45))
PIX=[('Fly',0,'fly_up'),('Fly',0.5,'fly_down'),('Walk',0.25,'walk0'),('Walk',0.75,'walk1'),('Stand',0.3,'rest'),('Suck',0.5,'suck'),('TailSmack',0.5,'tail'),('TailSwipeL',0.5,'swipe')]
throat_glow(0.0)
for clip,t,name in PIX:
    pose(clip,t); shot(OUT+f'pixel_{name}.png'); JOBS.append(('pixel',name))
# ---- Skaar Uverkhron: side view turned a little toward the viewer, a touch from above, 360 px
sc.render.resolution_x=sc.render.resolution_y=360; cam.data.ortho_scale=4.2; lighting('side')
look((-6.5,-3.2,2.4),(0,0.25,0.55))
for clip,t,name in ([] if ONLY_PIXEL else [('Idle',0,'idle0'),('Idle',0.25,'idle1'),('Idle',0.5,'idle2'),('Idle',0.75,'idle3'),
                    ('Suck',0.5,'suck'),('TailSwipeR',0.5,'swipe'),('TailSmack',0.5,'smack'),('Screech',0.5,'screech'),('Hurt',0.25,'hurt')]):
    throat_glow(2.0 if clip=='Screech' else 0.0); pose(clip,t); shot(OUT+f'skaar_{name}.png'); JOBS.append(('skaar',name))
throat_glow(0.0)
look((-7.2,-1.6,3.0),(0,0.3,0.45)); sc.render.resolution_x=512; sc.render.resolution_y=384; cam.data.ortho_scale=3.6
# eyes-only mask: everything black but the eyes, no lights
for o in lights: o.hide_render=True
bgn.inputs[1].default_value=0.0
skin_bs=bsdf(skin); base_link=[l for l in skin.node_tree.links if l.to_socket==skin_bs.inputs['Base Color']]
for l in base_link: skin.node_tree.links.remove(l)
skin_bs.inputs['Base Color'].default_value=(0,0,0,1); skin_bs.inputs['Emission Strength'].default_value=8.0
spec=skin_bs.inputs.get('Specular IOR Level'); spec and setattr(spec,'default_value',0.0)
for clip,t,name in PIX:
    pose(clip,t); shot(OUT+f'pixeleye_{name}.png')
bpy.ops.wm.revert_mainfile() if False else None
json.dump(JOBS,open(OUT+'jobs.json','w'))
