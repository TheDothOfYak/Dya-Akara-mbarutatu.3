# © 2026 Isaac Flake. All Rights Reserved.
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import bpy, mathutils
from rh import W
bpy.ops.wm.open_mainfile(filepath=W+'Lutut.blend')
for o in bpy.data.objects:
    if o.type=='EMPTY' or o.name=='Lutut_LOD1': o.hide_render=True
A=bpy.data.objects['LututRig']
for tr in A.animation_data.nla_tracks: tr.mute=True
sc=bpy.context.scene; sc.render.engine='BLENDER_EEVEE'; sc.render.film_transparent=True
sc.view_settings.view_transform='Standard'
sc.render.resolution_x=sc.render.resolution_y=360
w=sc.world or bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[0].default_value=(0.25,0.25,0.3,1)
def lamp(loc,e,col):
    l=bpy.data.lights.new('l','AREA'); l.energy=e; l.size=3; l.color=col; o=bpy.data.objects.new('l',l); sc.collection.objects.link(o); o.location=loc
    o.rotation_euler=(mathutils.Vector((0,0,0.5))-mathutils.Vector(loc)).to_track_quat('-Z','Y').to_euler()
lamp((3,-3,4),900,(1,0.95,0.9)); lamp((-3,3,3),500,(0.7,0.8,1))
cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera=cam
cam.data.type='ORTHO'; cam.data.ortho_scale=4.4
# side view: the Lútut faces left of frame (camera on its right side, +X)
cam.location=(8,0.3,0.6); cam.rotation_euler=mathutils.Vector((-1,0,0)).to_track_quat('-Z','Y').to_euler()
ROWS=[('Fly',4),('Idle',4),('Glide',2),('Walk',4),('Stand',2),('Dive',4),('Suck',3),('TailSmack',4),('TailSwipeL',3),('Screech',3),('TakeOff',5),('LandBarrel',4)]
out=[]
for name,n in ROWS:
    act=bpy.data.actions[name]; A.animation_data.action=act
    f0,f1=[int(x) for x in act.frame_range]
    row=[]
    for i in range(n):
        f=round(f0+(f1-f0)*i/max(1,n-(0 if name in ('Fly','Idle','Walk') else 1)))
        sc.frame_set(min(f,f1)); p=W+f'sp_{name}_{i}.png'; sc.render.filepath=p; bpy.ops.render.render(write_still=True); row.append(p)
    out.append((name,row))
import json; json.dump(out,open(W+'sprites.json','w'))
