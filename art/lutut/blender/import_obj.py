# © 2026 Isaac Flake. All Rights Reserved.
import bpy
import sys as _s; _s.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__))); from rh import W
OBJ=__import__('os').environ.get('LUTUT_OBJ', W+'lutut.obj')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=OBJ, use_split_groups=False)
bpy.ops.wm.save_as_mainfile(filepath=W+'raw.blend')
