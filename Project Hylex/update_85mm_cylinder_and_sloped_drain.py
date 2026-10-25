import bpy
import bmesh
import math
import os
from mathutils import Vector

def bool_op(target, other, op='UNION'):
    mod = target.modifiers.new(name="Bool", type='BOOLEAN')
    mod.operation = op
    mod.solver = 'EXACT'
    mod.object = other
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(other, do_unlink=True)

# ==============================================================================
# 1. UPDATE 01_Tier1_Archimedean_Triple_Helix_Insert:
#    Resize XY outer diameter from 84.0mm -> 80.0mm (fits inside 85-86mm OD / 81-82mm ID rolled PVC cylinder!)
# ==============================================================================
obj1 = bpy.data.objects.get("01_Tier1_Archimedean_Triple_Helix_Insert")
if obj1:
    cur_dx = obj1.dimensions.x
    if cur_dx > 0.1:
        scale_xy = 80.0 / cur_dx
        bm = bmesh.new()
        bm.from_mesh(obj1.data)
        for v in bm.verts:
            v.co.x *= scale_xy
            v.co.y *= scale_xy
        bm.to_mesh(obj1.data)
        bm.free()
        obj1.data.update()
        print(f"Updated 01_Triple_Helix to {obj1.dimensions.x:.2f} x {obj1.dimensions.y:.2f} x {obj1.dimensions.z:.2f} mm")

# ==============================================================================
# 2. REBUILD 02_Tier1_Top_Intake_Manifold_Cap FOR 85.0-86.0mm OD CYLINDER:
#    - Outer cap OD: 92.0mm (r=46.0mm), Height: 24.0mm
#    - Cylinder seat groove (z=10..24mm): Outer wall ID = 86.4mm (r=43.2mm), Inner plug OD = 80.4mm (r=40.2mm) -> 3.0mm groove for 85-86mm OD cylinder!
#    - Two 15-degree tangential intake sockets on top (z=0..18mm): 12.20mm ID (r=6.10mm) for direct 12mm OD / 8mm ID silicone tube plug-in!
# ==============================================================================
old_obj2 = bpy.data.objects.get("02_Tier1_Top_Intake_Manifold_Cap")
loc2 = old_obj2.location.copy() if old_obj2 else Vector((-35.0, 75.78, 0.0))
mats2 = list(old_obj2.data.materials) if old_obj2 else []
if old_obj2:
    bpy.data.objects.remove(old_obj2, do_unlink=True)

bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=46.0, depth=24.0, location=(0, 0, 12.0))
cap2 = bpy.context.active_object
cap2.name = "02_Tier1_Top_Intake_Manifold_Cap"

bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=43.20, depth=16.0, location=(0, 0, 18.0))
c_outer = bpy.context.active_object
bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=40.20, depth=18.0, location=(0, 0, 18.0))
c_inner = bpy.context.active_object
bool_op(c_outer, c_inner, 'DIFFERENCE')
bool_op(cap2, c_outer, 'DIFFERENCE')

bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=36.0, depth=20.0, location=(0, 0, 16.0))
c_dome = bpy.context.active_object
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=7.30, depth=10.0, location=(0, 0, 10.5))
c_boss = bpy.context.active_object
bool_op(c_dome, c_boss, 'DIFFERENCE')
bool_op(cap2, c_dome, 'DIFFERENCE')

for sign in [1.0, -1.0]:
    px = 24.0 * sign
    tilt = math.radians(15.0 * sign)
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=8.30, depth=18.0, location=(px, 0, 9.0))
    col = bpy.context.active_object
    col.rotation_euler = (tilt, 0, 0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bool_op(cap2, col, 'UNION')

bpy.ops.mesh.primitive_cube_add(size=200.0, location=(0, 0, -100.0))
bool_op(cap2, bpy.context.active_object, 'DIFFERENCE')

for sign in [1.0, -1.0]:
    px = 24.0 * sign
    tilt = math.radians(15.0 * sign)
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=6.10, depth=36.0, location=(px, 0, 9.0))
    bore = bpy.context.active_object
    bore.rotation_euler = (tilt, 0, 0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bool_op(cap2, bore, 'DIFFERENCE')

cap2.location = loc2
for m in mats2:
    cap2.data.materials.append(m)
print("Rebuilt 02_Tier1_Top_Intake_Manifold_Cap for 85-86mm OD cylinder.")

# ==============================================================================
# 3. REBUILD 03_Tier1_Concentric_Bullseye_Splitter_Base FOR 85.0-86.0mm OD CYLINDER
#    WITH SLOPED FUNNEL/DRAIN FLOORS AND ZERO INTERIOR BOSS BUMP:
#    - Outer OD: 92.0mm (r=46.0mm), Total Height: 30.0mm (z=0..30mm)
#    - Top Cylinder Seat Groove (z=18..30mm): Outer wall ID = 86.4mm (r=43.2mm), Inner wall = 80.4mm (r=40.2mm)
#    - REMOVED the raised interior nozzle bump around the outer brine hole!
#    - Sloped Annular Drain Floor: Tilts smoothly downward toward the +X Outer Brine Drain Hole (x=+27.5, y=0) like a sloped sink/funnel drain!
#    - Conical Funnel Floor inside the Center Bullseye Cup: Slopes downward toward the center (0,0) clean-water hole!
#    - Bottom Tube Sockets (z=0..8.0mm): 12.20mm ID push-in sockets underneath the floor with flush 8.00mm ID drain mouths!
# ==============================================================================
old_obj3 = bpy.data.objects.get("03_Tier1_Concentric_Bullseye_Splitter_Base")
loc3 = old_obj3.location.copy() if old_obj3 else Vector((75.0, 75.0, 0.0))
mats3 = list(old_obj3.data.materials) if old_obj3 else []
if old_obj3:
    bpy.data.objects.remove(old_obj3, do_unlink=True)

bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=46.0, depth=30.0, location=(0, 0, 15.0))
base3 = bpy.context.active_object
base3.name = "03_Tier1_Concentric_Bullseye_Splitter_Base"

# 1. Cut top cylinder seat groove (z=18..31mm): Outer ID = 86.4mm (r=43.20mm)
bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=43.20, depth=14.0, location=(0, 0, 25.0))
bool_op(base3, bpy.context.active_object, 'DIFFERENCE')

# 2. Cut outer brine basin with a SLOPED FUNNEL FLOOR tilting downward toward (x=+27.5, y=0)
bm_basin = bmesh.new()
n_seg = 96
r_basin = 40.20
bot_v = []
top_v = []
for i in range(n_seg):
    ang = (2.0 * math.pi * i) / n_seg
    x = r_basin * math.cos(ang)
    y = r_basin * math.sin(ang)
    z_floor = 12.25 - 2.75 * (x / r_basin) + 1.20 * (abs(y) / r_basin)
    bot_v.append(bm_basin.verts.new((x, y, z_floor)))
    top_v.append(bm_basin.verts.new((x, y, 32.0)))

v_drain_focus = bm_basin.verts.new((27.5, 0.0, 9.0))
v_top_center = bm_basin.verts.new((0.0, 0.0, 32.0))
for i in range(n_seg):
    ni = (i + 1) % n_seg
    bm_basin.faces.new((bot_v[i], bot_v[ni], top_v[ni], top_v[i]))
    bm_basin.faces.new((v_drain_focus, bot_v[ni], bot_v[i]))
    bm_basin.faces.new((top_v[i], top_v[ni], v_top_center))

bmesh.ops.recalc_face_normals(bm_basin, faces=bm_basin.faces)
m_basin = bpy.data.meshes.new("SlopedBasinCutter")
bm_basin.to_mesh(m_basin)
bm_basin.free()
obj_basin = bpy.data.objects.new("SlopedBasinCutter", m_basin)
bpy.context.collection.objects.link(obj_basin)
bool_op(base3, obj_basin, 'DIFFERENCE')

# 3. Add the Concentric Bullseye Divider Ring (35.0mm OD, r=17.5mm, from z=8.0..24.0mm)
bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=17.50, depth=16.0, location=(0, 0, 16.0))
bool_op(base3, bpy.context.active_object, 'UNION')

# 4. Cut the inner Bullseye Clean-Water Conical Funnel Cup (r=14.5mm at top, sloping down from z=14.5mm to z=9.0mm at center (0,0)!)
bm_cone = bmesh.new()
r_cup = 14.50
rim_bot = []
rim_top = []
for i in range(n_seg):
    ang = (2.0 * math.pi * i) / n_seg
    x = r_cup * math.cos(ang)
    y = r_cup * math.sin(ang)
    rim_bot.append(bm_cone.verts.new((x, y, 14.5)))
    rim_top.append(bm_cone.verts.new((x, y, 26.0)))
v_cone_tip = bm_cone.verts.new((0.0, 0.0, 9.0))
v_cone_top = bm_cone.verts.new((0.0, 0.0, 26.0))
for i in range(n_seg):
    ni = (i + 1) % n_seg
    bm_cone.faces.new((rim_bot[i], rim_bot[ni], rim_top[ni], rim_top[i]))
    bm_cone.faces.new((v_cone_tip, rim_bot[ni], rim_bot[i]))
    bm_cone.faces.new((rim_top[i], rim_top[ni], v_cone_top))
bmesh.ops.recalc_face_normals(bm_cone, faces=bm_cone.faces)
m_cone = bpy.data.meshes.new("ConeFunnelCutter")
bm_cone.to_mesh(m_cone)
bm_cone.free()
obj_cone = bpy.data.objects.new("ConeFunnelCutter", m_cone)
bpy.context.collection.objects.link(obj_cone)
bool_op(base3, obj_cone, 'DIFFERENCE')

# 5. Cut the 2 Bottom Tube Push-In Sockets FROM UNDERNEATH (z=0..8.0mm at 12.20mm ID for 12mm OD tube)
#    and the 8.00mm ID (r=4.00mm) drain throats opening FLUSH at the bottom of both sloped funnels (ZERO raised interior bump!)
for px in [0.0, 27.5]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=6.10, depth=9.0, location=(px, 0.0, 3.5))
    bool_op(base3, bpy.context.active_object, 'DIFFERENCE')
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=4.00, depth=7.0, location=(px, 0.0, 10.5))
    bool_op(base3, bpy.context.active_object, 'DIFFERENCE')

bm3 = bmesh.new()
bm3.from_mesh(base3.data)
bmesh.ops.remove_doubles(bm3, verts=bm3.verts, dist=0.001)
bmesh.ops.recalc_face_normals(bm3, faces=bm3.faces)
bm3.to_mesh(base3.data)
bm3.free()
base3.location = loc3
for m in mats3:
    base3.data.materials.append(m)

# ==============================================================================
# 4. ALSO ENSURE CAROUSEL (09) AND ELECTROLYSIS PODS (10, 11, 12) ARE UPDATED
# ==============================================================================
old_c = bpy.data.objects.get("09_Tier3_3Slot_Rotating_Carousel_Gear")
loc_c = old_c.location.copy() if old_c else Vector((25.0, -55.0, 0.0))
mats_c = list(old_c.data.materials) if old_c else []
if old_c:
    bpy.data.objects.remove(old_c, do_unlink=True)

bm_gear = bmesh.new()
n_teeth, r_tip, r_root, r_inner_rim, height = 72, 70.0, 67.2, 62.5, 12.0
pts_2d = []
for i in range(n_teeth):
    b_ang = (2.0 * math.pi * i) / n_teeth
    step = (2.0 * math.pi) / n_teeth
    pts_2d.extend([
        (r_root * math.cos(b_ang), r_root * math.sin(b_ang)),
        (r_tip * math.cos(b_ang + 0.22 * step), r_tip * math.sin(b_ang + 0.22 * step)),
        (r_tip * math.cos(b_ang + 0.50 * step), r_tip * math.sin(b_ang + 0.50 * step)),
        (r_root * math.cos(b_ang + 0.72 * step), r_root * math.sin(b_ang + 0.72 * step)),
    ])
n_pts = len(pts_2d)
bot_o = [bm_gear.verts.new((x, y, 0.0)) for (x, y) in pts_2d]
top_o = [bm_gear.verts.new((x, y, height)) for (x, y) in pts_2d]
bot_i = [bm_gear.verts.new((r_inner_rim * math.cos(2*math.pi*i/n_pts), r_inner_rim * math.sin(2*math.pi*i/n_pts), 0.0)) for i in range(n_pts)]
top_i = [bm_gear.verts.new((r_inner_rim * math.cos(2*math.pi*i/n_pts), r_inner_rim * math.sin(2*math.pi*i/n_pts), height)) for i in range(n_pts)]
for i in range(n_pts):
    ni = (i + 1) % n_pts
    bm_gear.faces.new((bot_o[i], bot_o[ni], top_o[ni], top_o[i]))
    bm_gear.faces.new((bot_i[ni], bot_i[i], top_i[i], top_i[ni]))
    bm_gear.faces.new((top_i[i], top_o[i], top_o[ni], top_i[ni]))
    bm_gear.faces.new((bot_o[i], bot_i[i], bot_i[ni], bot_o[ni]))
bmesh.ops.recalc_face_normals(bm_gear, faces=bm_gear.faces)
mesh_c = bpy.data.meshes.new("09_Tier3_3Slot_Rotating_Carousel_Gear")
bm_gear.to_mesh(mesh_c)
bm_gear.free()

carousel = bpy.data.objects.new("09_Tier3_3Slot_Rotating_Carousel_Gear", mesh_c)
bpy.context.collection.objects.link(carousel)
bpy.context.view_layer.objects.active = carousel

bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=13.0, depth=height, location=(0, 0, height/2))
bool_op(carousel, bpy.context.active_object, 'UNION')

for i in range(3):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, height/2))
    sp = bpy.context.active_object
    sp.scale = (128.0, 7.0, height)
    sp.rotation_euler = (0, 0, math.radians(i * 120.0))
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bool_op(carousel, sp, 'UNION')

pod_angles = [math.radians(30.0), math.radians(150.0), math.radians(270.0)]
R_c = 38.0
for ang in pod_angles:
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=26.0, depth=height, location=(R_c*math.cos(ang), R_c*math.sin(ang), height/2))
    bool_op(carousel, bpy.context.active_object, 'UNION')

for ang in pod_angles:
    px, py = R_c * math.cos(ang), R_c * math.sin(ang)
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=22.80, depth=10.0, location=(px, py, 8.0))
    bool_op(carousel, bpy.context.active_object, 'DIFFERENCE')
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=21.00, depth=6.0, location=(px, py, 2.0))
    bool_op(carousel, bpy.context.active_object, 'DIFFERENCE')

bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=4.10, depth=height+4.0, location=(0, 0, height/2))
bool_op(carousel, bpy.context.active_object, 'DIFFERENCE')
carousel.location = loc_c
for m in mats_c:
    carousel.data.materials.append(m)

pod_names = [
    "10_Tier3_60mm_Pod_Base_1_Cretacolor7x7",
    "11_Tier3_60mm_Pod_Base_2_Cretacolor7x7",
    "12_Tier3_60mm_Pod_Base_3_Cretacolor7x7",
]
for idx, pname in enumerate(pod_names):
    old_p = bpy.data.objects.get(pname)
    loc_p = old_p.location.copy() if old_p else Vector((155.0 + idx*55.0, 55.0, 0.0))
    mats_p = list(old_p.data.materials) if old_p else []
    if old_p:
        bpy.data.objects.remove(old_p, do_unlink=True)

    bpy.ops.mesh.primitive_cylinder_add(vertices=72, radius=22.50, depth=20.0, location=(0, 0, 10.0))
    pod = bpy.context.active_object
    pod.name = pname
    bpy.ops.mesh.primitive_cylinder_add(vertices=72, radius=24.50, depth=6.0, location=(0, 0, 23.0))
    bool_op(pod, bpy.context.active_object, 'UNION')

    bpy.ops.mesh.primitive_cylinder_add(vertices=72, radius=20.00, depth=24.0, location=(0, 0, 15.0))
    bool_op(pod, bpy.context.active_object, 'DIFFERENCE')

    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=6.00, depth=6.0, location=(0, 0, 6.0))
    bool_op(pod, bpy.context.active_object, 'UNION')

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 6.5))
    sq = bpy.context.active_object
    sq.scale = (7.20, 7.20, 7.0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bool_op(pod, sq, 'DIFFERENCE')

    for h_i in range(4):
        hang = (2.0 * math.pi * h_i) / 4.0
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=1.50, depth=8.0, location=(17.5*math.cos(hang), 17.5*math.sin(hang), 1.5))
        bool_op(pod, bpy.context.active_object, 'DIFFERENCE')

    pod.location = loc_p
    for m in mats_p:
        pod.data.materials.append(m)

# Save master blend, master STL, and all affected printer plate STLs
bpy.ops.wm.save_mainfile()
base_dir = os.path.dirname(bpy.data.filepath)
bpy.ops.wm.stl_export(filepath=os.path.join(base_dir, "Untitled.stl"))

plates_dir = os.path.join(base_dir, "STL_5_Printers_For_Sir")
if os.path.isdir(plates_dir):
    mesh_objs = [o for o in bpy.data.objects if o.type == 'MESH']
    orig_locs = {o.name: o.location.copy() for o in mesh_objs}
    for fn, items in [
        ("Printer1_Big_Enclosed_Tier1_Helix_and_Caps.stl", [
            ("01_Tier1_Archimedean_Triple_Helix_Insert", (-55.0, 0.0, 0.0)),
            ("02_Tier1_Top_Intake_Manifold_Cap", (50.0, 52.0, 0.0)),
            ("03_Tier1_Concentric_Bullseye_Splitter_Base", (50.0, -52.0, 0.0)),
        ]),
        ("Printer2_Medium_Open1_Tier3_Carousel_and_Pinion.stl", [
            ("09_Tier3_3Slot_Rotating_Carousel_Gear", (-18.0, 0.0, 0.0)),
            ("08_Tier3_28BYJ48_Stepper_Spur_Pinion_Gear", (75.0, 0.0, 0.0)),
        ]),
        ("Printer3_Medium_Open2_Tier3_3x_Mineral_Pods.stl", [
            ("10_Tier3_60mm_Pod_Base_1_Cretacolor7x7", (-30.0, 28.0, 0.0)),
            ("11_Tier3_60mm_Pod_Base_2_Cretacolor7x7", (30.0, 28.0, 0.0)),
            ("12_Tier3_60mm_Pod_Base_3_Cretacolor7x7", (0.0, -28.0, 0.0)),
        ]),
    ]:
        bpy.ops.object.select_all(action='DESELECT')
        for name, loc in items:
            o = bpy.data.objects.get(name)
            if o:
                o.location = Vector(loc)
                o.select_set(True)
        bpy.context.view_layer.update()
        bpy.ops.wm.stl_export(filepath=os.path.join(plates_dir, fn), export_selected_objects=True)
    for o in mesh_objs:
        o.location = orig_locs[o.name]
    bpy.context.view_layer.update()
    bpy.ops.wm.save_mainfile()
print("ALL PARTS UPDATED FOR 85-86MM CYLINDER + SLOPED DRAIN FLOOR AND SAVED!")
