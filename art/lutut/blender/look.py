# © 2026 Isaac Flake. All Rights Reserved.
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import bpy, mathutils, math
from rh import *
src=sys.argv[sys.argv.index('--')+1]; out=sys.argv[sys.argv.index('--')+2]; eng=sys.argv[sys.argv.index('--')+3]
bpy.ops.wm.open_mainfile(filepath=W+src)
sc=bpy.context.scene
cam=setup(800, engine=eng)
if eng=='CYCLES': sc.cycles.samples=48; sc.cycles.use_denoising=True; sc.cycles.device='CPU'
else:
    try: sc.eevee.taa_render_samples=32
    except: pass
# lights: key, rim, fill; neutral grey bg
w=sc.world; w.use_nodes=True; bg=w.node_tree.nodes['Background']; bg.inputs[0].default_value=(0.16,0.17,0.19,1); bg.inputs[1].default_value=1.0
def lamp(name,typ,loc,energy,col=(1,1,1),size=2):
    l=bpy.data.lights.new(name,typ); l.energy=energy; l.color=col
    if typ=='AREA': l.size=size
    o=bpy.data.objects.new(name,l); sc.collection.objects.link(o); o.location=loc
    o.rotation_euler=(mathutils.Vector((0,0,0.4))-mathutils.Vector(loc)).to_track_quat('-Z','Y').to_euler()
lamp('key','AREA',(-3,-4,4),900,(1,0.96,0.9),3)
lamp('rim','AREA',(3,4,3),700,(0.75,0.8,1),3)
lamp('fill','AREA',(4,-3,0.5),200,(0.9,0.9,1),4)
sc.view_settings.view_transform='AgX' if 'AgX' in [x for x in ['AgX']] else 'Standard'
ps=[]
for nm,loc,tg,lens in [('a',(-2.6,-3.6,1.6),(0,0,0.45),45),('b',(0,-2.2,0.75),(0,-0.7,0.5),55),('c',(3.6,-1.2,1.4),(0,0.3,0.35),40),('d',(-2.5,3.2,2.4),(0,0.3,0.4),40)]:
    p=W+f'{out}_{nm}.png'; shot(p,loc,tg,lens=lens); ps.append(p)
sheet(ps,W+out+'.png',2,600)
