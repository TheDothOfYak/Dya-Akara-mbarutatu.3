# © 2026 Isaac Flake. All Rights Reserved.
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import bpy, mathutils
from rh import *
args=sys.argv[sys.argv.index('--')+1:]; src,out,dim=args[0],args[1],float(args[2])
bpy.ops.wm.open_mainfile(filepath=W+src)
if 'LututHigh' in bpy.data.objects: bpy.data.objects['LututHigh'].hide_render=True
sc=bpy.context.scene; cam=setup(700, engine='BLENDER_EEVEE')
sc.view_settings.view_transform='Standard'
w=sc.world; w.use_nodes=True; bg=w.node_tree.nodes['Background']; bg.inputs[0].default_value=(0.05,0.05,0.07,1); bg.inputs[1].default_value=1.0*dim
def lamp(name,loc,energy,col):
    l=bpy.data.lights.new(name,'AREA'); l.energy=energy*dim; l.color=col; l.size=3
    o=bpy.data.objects.new(name,l); sc.collection.objects.link(o); o.location=loc
    o.rotation_euler=(mathutils.Vector((0,0,0.4))-mathutils.Vector(loc)).to_track_quat('-Z','Y').to_euler()
lamp('key',(-3,-4,4),700,(1,0.96,0.9)); lamp('rim',(3,4,3),400,(0.75,0.8,1)); lamp('fill',(4,-3,0.5),150,(0.9,0.9,1))
ps=[]
for nm,loc,tg,lens in [('flank',(-2.2,-0.6,0.9),(0,-0.1,0.45),50),('back',(1.4,0.2,2.6),(0,0.0,0.5),40),('tail',(1.9,1.4,0.9),(0,1.0,0.25),45),('face',(-0.9,-2.0,0.8),(0,-0.6,0.55),55)]:
    p=W+f'{out}_{nm}.png'; shot(p,loc,tg,lens=lens); ps.append(p)
sheet(ps,W+out+'.png',2,600)
