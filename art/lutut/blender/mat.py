# © 2026 Isaac Flake. All Rights Reserved.
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import bpy, numpy as np
from rh import W
from PIL import Image
c=np.asarray(Image.open(W+'tex_col.png').convert('RGB')).astype(float)/255
ao=np.asarray(Image.open(W+'tex_ao.png').convert('L')).astype(float)/255
# col is linear-ish emission baked into sRGB png already; multiply AO in linear
lin=c**2.2*(0.3+0.7*ao[...,None]**1.2)
bpy.ops.wm.open_mainfile(filepath=W+'stage4.blend')
di=bpy.data.images.load(W+'tex_dots.exr'); R_=di.size[0]
dots=np.array(di.pixels[:],dtype=np.float32).reshape(R_,R_,4)[::-1,:,:3]      # blender rows run bottom-up
# grow each dot a texel so UV seams don't nick them
dots=np.maximum.reduce([dots,np.roll(dots,1,0),np.roll(dots,1,1),np.roll(np.roll(dots,1,0),1,1)])
lin=lin*(1-np.clip(dots.max(-1,keepdims=True)*2.2,0,0.85)) + dots*0.35       # the grooves' dots read dark by day
Image.fromarray((np.clip(lin,0,1)**(1/2.2)*255).astype('uint8')).save(W+'tex_base.png')
gl=(np.asarray(Image.open(W+'tex_glow.png').convert('RGB')).astype(float)/255)**2.2
emit=np.maximum(gl, dots*0.32)
Image.fromarray((np.clip(emit,0,1)**(1/2.2)*255).astype('uint8')).save(W+'tex_emit.png')
L=bpy.data.objects['Lutut']
m=bpy.data.materials.new('Lutut'); m.use_nodes=True; nt=m.node_tree; nt.nodes.clear()
out=nt.nodes.new('ShaderNodeOutputMaterial'); bs=nt.nodes.new('ShaderNodeBsdfPrincipled')
nt.links.new(bs.outputs[0],out.inputs[0])
def tex(path,noncolor=False):
    n=nt.nodes.new('ShaderNodeTexImage'); n.image=bpy.data.images.load(W+path)
    if noncolor: n.image.colorspace_settings.name='Non-Color'
    return n
b=tex('tex_base.png'); nt.links.new(b.outputs['Color'],bs.inputs['Base Color'])
r=tex('tex_rough.png',True); sep=nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(r.outputs['Color'],sep.inputs[0]); nt.links.new(sep.outputs[0],bs.inputs['Roughness'])
nm=tex('tex_normal.png',True); nmn=nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(nm.outputs['Color'],nmn.inputs['Color']); nt.links.new(nmn.outputs[0],bs.inputs['Normal'])
g=tex('tex_emit.png'); nt.links.new(g.outputs['Color'],bs.inputs['Emission Color']); bs.inputs['Emission Strength'].default_value=2.5
bs.inputs['Metallic'].default_value=0.0
bs.inputs['Specular IOR Level'].default_value=0.5
L.data.materials.clear(); L.data.materials.append(m)
# the gullet gets its own material so the game can make it glow red when it screeches
mt=m.copy(); mt.name='LututThroat'; nt2=mt.node_tree
bs2=[n for n in nt2.nodes if n.type=='BSDF_PRINCIPLED'][0]
th=nt2.nodes.new('ShaderNodeTexImage'); th.image=bpy.data.images.load(W+'tex_throat.png')
nt2.links.new(th.outputs['Color'],bs2.inputs['Emission Color']); bs2.inputs['Emission Strength'].default_value=1.0
L.data.materials.append(mt)
import mathutils as _mu
nth=0
for poly in L.data.polygons:
    c=poly.center; r=((c.x-0.012)**2+(c.z-0.33)**2)**0.5
    if r<0.2 and -0.74<c.y<-0.22: poly.material_index=1; nth+=1
print('throat faces',nth)
# drop the hi-res sculpt from the working file's render
bpy.data.objects['LututHigh'].hide_render=True; bpy.data.objects['LututHigh'].hide_viewport=True
bpy.ops.wm.save_as_mainfile(filepath=W+'stage5.blend')
