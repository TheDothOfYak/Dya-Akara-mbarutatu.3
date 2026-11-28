# © 2026 Isaac Flake. All Rights Reserved.
import bpy, mathutils
import os
W=os.environ.get('LUTUT_WORK',os.path.join(os.path.dirname(os.path.abspath(__file__)),'work'))+'/'
def setup(res=600, engine='BLENDER_WORKBENCH', light='MATCAP'):
    sc=bpy.context.scene
    sc.render.engine=engine
    if engine=='BLENDER_WORKBENCH':
        sc.display.shading.light=light; sc.display.shading.show_cavity=False
    if not sc.world: sc.world=bpy.data.worlds.new('w')
    sc.world.color=(0.55,0.6,0.7)
    sc.render.resolution_x=sc.render.resolution_y=res
    cam=bpy.data.objects.get('cam')
    if not cam:
        cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam')); sc.collection.objects.link(cam)
    sc.camera=cam; return cam
def shot(path, loc, target, ortho=None, lens=50):
    sc=bpy.context.scene; cam=sc.camera
    cam.location=loc; d=mathutils.Vector(target)-mathutils.Vector(loc)
    up='Y'
    q=d.to_track_quat('-Z','Y')
    if abs(d.normalized().z)<0.99: 
        # keep world Z up
        m=mathutils.Matrix.Identity(3); f=-d.normalized(); r=mathutils.Vector((0,0,1)).cross(f).normalized(); u=f.cross(r)
        m.col[0]=r; m.col[1]=u; m.col[2]=f; q=m.to_quaternion()
    cam.rotation_euler=q.to_euler()
    if ortho: cam.data.type='ORTHO'; cam.data.ortho_scale=ortho
    else: cam.data.type='PERSP'; cam.data.lens=lens
    sc.render.filepath=path; bpy.ops.render.render(write_still=True)
def sheet(paths, out, cols=3, size=500):
    import subprocess, json
    subprocess.run(['python3','-c',f'''
from PIL import Image
ps={paths!r}; c={cols}; s={size}
rows=(len(ps)+c-1)//c; o=Image.new("RGB",(c*s,rows*s),"white")
for i,p in enumerate(ps): o.paste(Image.open(p).convert("RGB").resize((s,s)),((i%c)*s,(i//c)*s))
o.save({out!r})'''])
