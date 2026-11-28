# © 2026 Isaac Flake. All Rights Reserved.
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import bpy; from rh import *
args=sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.open_mainfile(filepath=W+'stage6.blend')
A=bpy.data.objects['LututRig']
for tr in A.animation_data.nla_tracks: tr.mute=True
sc=bpy.context.scene; setup(320,light='STUDIO'); sc.display.shading.color_type='TEXTURE'
sc.world.color=(0.55,0.58,0.62)
rows=[]
view=(args[1] if len(args)>1 else 'q')
V={'q':((-3.0,-3.4,1.5),(0,0.1,0.35)),'s':((4.2,0.2,0.6),(0,0.2,0.35)),'f':((0,-4.2,0.6),(0,0,0.5)),'t':((0.3,0.2,5),(0,0.2,0.3))}
for name in args[0].split(','):
    act=bpy.data.actions[name]; A.animation_data.action=act
    f0,f1=[int(x) for x in act.frame_range]
    fr=[round(f0+(f1-f0)*k/5) for k in range(6)]
    for f in fr:
        sc.frame_set(f); p=W+f'af_{name}_{f}.png'; shot(p,*V[view],lens=32); rows.append(p)
sheet(rows,W+'asheet_'+args[0].replace(',','_')+'_'+view+'.png',6,300)
