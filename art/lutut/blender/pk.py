# © 2026 Isaac Flake. All Rights Reserved.
import bpy, mathutils, math
def Q(axis,deg): return mathutils.Quaternion(mathutils.Vector(axis).normalized(), math.radians(deg))
def wq(pb, qw):
    """world-space (rest-frame) rotation -> bone-local quaternion"""
    R=pb.bone.matrix_local.to_3x3().to_quaternion()
    return R.inverted() @ qw @ R
def setrot(pb, *rots):
    q=mathutils.Quaternion()
    for axis,deg in rots: q = Q(axis,deg) @ q
    pb.rotation_mode='QUATERNION'; pb.rotation_quaternion = wq(pb,q)
def side_axis(axis, s):
    # mirror an axis for the .R side (mirror across X): rotation axis (pseudo-vector) mirrors as (x,-y,-z)
    return axis if s=='.L' else (axis[0],-axis[1],-axis[2])
