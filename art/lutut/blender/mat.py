# © 2026 Isaac Flake. All Rights Reserved.
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import bpy, numpy as np
from rh import W
from PIL import Image
c=np.asarray(Image.open(W+'tex_col.png').convert('RGB')).astype(float)/255
ao=np.asarray(Image.open(W+'tex_ao.png').convert('L')).astype(float)/255
# col is linear-ish emission baked into sRGB png already; multiply AO in linear
lin=c**2.2*(0.3+0.7*ao[...,None]**1.2)
Image.fromarray((np.clip(lin,0,1)**(1/2.2)*255).astype('uint8')).save(W+'tex_base.png')
bpy.ops.wm.open_mainfile(filepath=W+'stage4.blend')
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
g=tex('tex_glow.png'); nt.links.new(g.outputs['Color'],bs.inputs['Emission Color']); bs.inputs['Emission Strength'].default_value=1.0
bs.inputs['Metallic'].default_value=0.0
bs.inputs['Specular IOR Level'].default_value=0.5
L.data.materials.clear(); L.data.materials.append(m)
# drop the hi-res sculpt from the working file's render
bpy.data.objects['LututHigh'].hide_render=True; bpy.data.objects['LututHigh'].hide_viewport=True
bpy.ops.wm.save_as_mainfile(filepath=W+'stage5.blend')
