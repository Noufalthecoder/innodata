"""
SpatialGrid path-traced renderer (Blender Cycles).

Reads task definitions written by the TypeScript pipeline (scene layout + camera + style), renders a
photoreal image for each, and measures EXACT visibility from flat-colour object-mask renders.
The answers (ground truth) are never read or touched here: they stay in tasks.json.

  blender -b --python scripts/blender/render.py -- --tasks public/bench/tasks.json \
      --out public/bench/images --assets assets/polyhaven --result public/bench/render-result.json \
      [--ids s1,s2] [--samples 96]

Coordinates: pipeline is x right, y up, z toward the camera. Blender is Z up, so  (x, y, z) -> (x, -z, y).
"""
import json
import math
import os
import sys
import time
import traceback

import bpy
import numpy as np


# ---------- args ----------
def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    a = {"samples": "96", "ids": ""}
    i = 0
    while i < len(argv):
        if argv[i].startswith("--"):
            a[argv[i][2:]] = argv[i + 1]
            i += 2
        else:
            i += 1
    return a


ARGS = parse_args()
for _k in ("tasks", "out", "assets", "result"):
    ARGS[_k] = os.path.abspath(ARGS[_k])
ASSETS = ARGS["assets"]
OUT = ARGS["out"]
SAMPLES = int(ARGS["samples"])

COLOR_SRGB = {
    "red": (229, 72, 77), "blue": (70, 120, 245), "teal": (18, 165, 148),
    "amber": (245, 165, 36), "violet": (150, 95, 215), "grey": (170, 172, 184),
}
# pure linear 0/1 channel codes for object masks (exact to classify)
MASK_CODES = [(1, 0, 0), (0, 1, 0), (0, 0, 1), (1, 1, 0), (0, 1, 1), (1, 0, 1)]


def srgb_to_linear(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def B(v):
    """pipeline coords -> Blender coords"""
    return (v[0], -v[2], v[1])


def rot_y(p, pivot, ang):
    x, y, z = p[0] - pivot[0], p[1] - pivot[1], p[2] - pivot[2]
    c, s = math.cos(ang), math.sin(ang)
    return (x * c + z * s + pivot[0], y + pivot[1], -x * s + z * c + pivot[2])


# ---------- scene helpers ----------
def setup_cycles(scene, w, h, samples):
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.02
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
    scene.cycles.max_bounces = 4
    scene.render.resolution_x, scene.render.resolution_y = w, h
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "None"


def principled(name, srgb, material, roughness_jitter=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n = m.node_tree.nodes["Principled BSDF"]
    r, g, b = (srgb_to_linear(c) for c in srgb)
    n.inputs["Base Color"].default_value = (r, g, b, 1)
    if material == "metal":
        n.inputs["Metallic"].default_value = 0.9
        n.inputs["Roughness"].default_value = 0.28 + roughness_jitter
    elif material == "plastic":
        n.inputs["Metallic"].default_value = 0.0
        n.inputs["Roughness"].default_value = 0.22 + roughness_jitter
        n.inputs["Coat Weight"].default_value = 0.6
    else:  # matte
        n.inputs["Metallic"].default_value = 0.0
        n.inputs["Roughness"].default_value = 0.65 + roughness_jitter
    return m


def emission(name, code):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    t = m.node_tree
    for n in list(t.nodes):
        t.nodes.remove(n)
    e = t.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (code[0], code[1], code[2], 1)
    e.inputs["Strength"].default_value = 1.0
    o = t.nodes.new("ShaderNodeOutputMaterial")
    t.links.new(e.outputs["Emission"], o.inputs["Surface"])
    return m


def make_floor(style):
    bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 0))
    floor = bpy.context.object
    floor.name = "floor"
    m = bpy.data.materials.new("floor")
    m.use_nodes = True
    t = m.node_tree
    bsdf = t.nodes["Principled BSDF"]
    name = style.get("floor", "plain")
    folder = os.path.join(ASSETS, "floor", name)
    if name != "plain" and os.path.isdir(folder):
        uv = t.nodes.new("ShaderNodeTexCoord")
        mp = t.nodes.new("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (190, 190, 1)
        t.links.new(uv.outputs["UV"], mp.inputs["Vector"])

        def tex(fn, colorspace):
            n = t.nodes.new("ShaderNodeTexImage")
            n.image = bpy.data.images.load(os.path.join(folder, fn))
            n.image.colorspace_settings.name = colorspace
            t.links.new(mp.outputs["Vector"], n.inputs["Vector"])
            return n

        d = tex("diff.jpg", "sRGB")
        r = tex("rough.jpg", "Non-Color")
        nr = tex("nor.jpg", "Non-Color")
        nm = t.nodes.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = 0.8
        t.links.new(d.outputs["Color"], bsdf.inputs["Base Color"])
        t.links.new(r.outputs["Color"], bsdf.inputs["Roughness"])
        t.links.new(nr.outputs["Color"], nm.inputs["Color"])
        t.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    else:
        bsdf.inputs["Base Color"].default_value = (0.55, 0.56, 0.6, 1)
        bsdf.inputs["Roughness"].default_value = 0.55
    floor.data.materials.append(m)
    return floor


def make_world(style, dim):
    w = bpy.data.worlds.new("world")
    w.use_nodes = True
    t = w.node_tree
    for n in list(t.nodes):
        t.nodes.remove(n)
    path = os.path.join(ASSETS, "hdri", style.get("hdri", "") + ".hdr")
    out = t.nodes.new("ShaderNodeOutputWorld")
    bg = t.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = (0.22 if dim else 1.0) * style.get("exposure", 1.0)
    if os.path.exists(path):
        tc = t.nodes.new("ShaderNodeTexCoord")
        mp = t.nodes.new("ShaderNodeMapping")
        mp.inputs["Rotation"].default_value = (0, 0, math.radians(style.get("hdriRotation", 0)))
        env = t.nodes.new("ShaderNodeTexEnvironment")
        env.image = bpy.data.images.load(path)
        t.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
        t.links.new(mp.outputs["Vector"], env.inputs["Vector"])
        t.links.new(env.outputs["Color"], bg.inputs["Color"])
    else:
        bg.inputs["Color"].default_value = (0.05, 0.05, 0.09, 1)
    t.links.new(bg.outputs["Background"], out.inputs["Surface"])
    return w


def add_object(o, style, idx):
    """Creates one primitive. size = [w, h, d] in pipeline axes; returns the Blender object."""
    w_, h_, d_ = o["size"]
    shape = o["shape"]
    if shape == "box":
        bpy.ops.mesh.primitive_cube_add(size=1)
        ob = bpy.context.object
        ob.scale = (w_, d_, h_)
        bpy.ops.object.transform_apply(scale=True)
        bev = ob.modifiers.new("bevel", "BEVEL")
        bev.width = 0.025
        bev.segments = 3
        bev.limit_method = "ANGLE"
    elif shape == "cylinder":
        bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=w_ / 2, depth=h_)
        ob = bpy.context.object
        bev = ob.modifiers.new("bevel", "BEVEL")
        bev.width = 0.02
        bev.segments = 3
        bev.limit_method = "ANGLE"
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))
    elif shape == "sphere":
        bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=w_ / 2)
        ob = bpy.context.object
        bpy.ops.object.shade_smooth()
    else:  # cone
        bpy.ops.mesh.primitive_cone_add(vertices=96, radius1=w_ / 2, radius2=0, depth=h_)
        ob = bpy.context.object
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(50))
    ang = o.get("rotY", 0.0)
    pivot = o.get("pivot") or o["center"]
    c = rot_y(o["center"], pivot, ang) if ang else o["center"]
    ob.location = B(c)
    ob.rotation_euler = (0, 0, ang)
    ob.name = f"obj{o['id']}_{idx}"
    ob["sg_id"] = o["id"]
    ob.data.materials.append(principled(f"m{idx}", COLOR_SRGB[o["color"]], style.get("material", "matte"), 0.03 * (idx % 3)))
    return ob


def make_camera(cam, w, h):
    bpy.ops.object.camera_add(location=B(cam["pos"]))
    c = bpy.context.object
    c.data.sensor_fit = "VERTICAL"
    c.data.angle = math.radians(cam["fov"])
    c.data.dof.use_dof = True
    c.data.dof.aperture_fstop = 11.0
    bpy.ops.object.empty_add(location=B(cam["look"]))
    target = bpy.context.object
    c.data.dof.focus_object = target
    con = c.constraints.new("TRACK_TO")
    con.target = target
    con.track_axis = "TRACK_NEGATIVE_Z"
    con.up_axis = "UP_Y"
    bpy.context.scene.camera = c
    return c


# ---------- mask / visibility ----------
def mask_render(scene, objs, floor, visible_ids, tmp_png):
    """Flat-colour render: object id -> pure linear colour code. Returns {id: pixel count} and border-touch set."""
    s = scene
    s.render.engine = "CYCLES"
    s.cycles.samples = 1
    s.cycles.use_adaptive_sampling = False
    s.cycles.use_denoising = False
    s.render.filter_size = 0.01
    s.view_settings.view_transform = "Standard"
    s.render.image_settings.file_format = "PNG"
    s.render.image_settings.color_mode = "RGB"
    s.render.image_settings.color_depth = "8"
    s.render.filepath = tmp_png
    floor.hide_render = True
    for ob in objs:
        ob.hide_render = ob["sg_id"] not in visible_ids
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(tmp_png)
    img.colorspace_settings.name = "Non-Color"
    w, h = img.size
    arr = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(arr)
    bpy.data.images.remove(img)
    arr = arr.reshape(h, w, 4)[:, :, :3] > 0.5
    counts, touches = {}, set()
    for oid in visible_ids:
        code = MASK_CODES[oid % len(MASK_CODES)]
        m = (arr[:, :, 0] == bool(code[0])) & (arr[:, :, 1] == bool(code[1])) & (arr[:, :, 2] == bool(code[2]))
        if code == (0, 0, 0):
            continue
        counts[oid] = int(m.sum())
        if m.any() and (m[0, :].any() or m[-1, :].any() or m[:, 0].any() or m[:, -1].any()):
            touches.add(oid)
    return counts, touches


def measure_visibility(scene, objs, floor, subject_ids, all_ids, tmp_png):
    # world -> black so only emission shows
    black = bpy.data.worlds.new("black")
    black.use_nodes = True
    black.node_tree.nodes["Background"].inputs["Color"].default_value = (0, 0, 0, 1)
    scene.world = black
    for ob in objs:
        oid = ob["sg_id"]
        ob.data.materials.clear()
        ob.data.materials.append(emission(f"mask{oid}", MASK_CODES[oid % len(MASK_CODES)]))
    full, _ = mask_render(scene, objs, floor, set(all_ids), tmp_png)
    report = []
    for sid in subject_ids:
        alone, touches = mask_render(scene, objs, floor, {sid}, tmp_png)
        a = alone.get(sid, 0)
        report.append({"id": sid, "alonePixels": a, "seenPixels": full.get(sid, 0), "inFrame": sid not in touches and a > 0})
    return report


# ---------- one task ----------
def render_task(task, tmp_dir):
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    w, h = task["width"], task["height"]
    style = task.get("render") or {}
    dim = task["difficulty"]["lighting"] == "dim"
    setup_cycles(sc, w, h, SAMPLES)
    sc.world = make_world(style, dim)
    floor = make_floor(style)
    objs = [add_object(o, style, i) for i, o in enumerate(task["objects"])]
    make_camera(task["camera"], w, h)

    sc.render.image_settings.file_format = "JPEG"
    sc.render.image_settings.quality = 93
    sc.render.filepath = os.path.join(OUT, f"{task['id']}.jpg")
    t1 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"[timing] beauty render {time.time() - t1:.1f}s (setup {t1 - t0:.1f}s)", flush=True)
    t2 = time.time()

    # visibility subjects: every object id (the pipeline asks about all of them or the single container)
    ids = sorted({o["id"] for o in task["objects"]})
    vis = measure_visibility(sc, objs, floor, ids, ids, os.path.join(tmp_dir, "mask.png"))
    print(f"[timing] masks {time.time() - t2:.1f}s", flush=True)
    return {"id": task["id"], "ok": True, "seconds": round(time.time() - t0, 1), "visibility": vis}


def main():
    tasks = json.load(open(ARGS["tasks"], encoding="utf8"))
    want = set(i for i in ARGS["ids"].split(",") if i)
    if want:
        tasks = [t for t in tasks if t["id"] in want]
    os.makedirs(OUT, exist_ok=True)
    tmp_dir = os.path.join(os.path.dirname(ARGS["result"]) or ".", ".mask-tmp")
    os.makedirs(tmp_dir, exist_ok=True)
    results = []
    for n, t in enumerate(tasks, 1):
        try:
            r = render_task(t, tmp_dir)
        except Exception as e:  # keep going; report the failure
            traceback.print_exc()
            r = {"id": t["id"], "ok": False, "error": str(e)}
        results.append(r)
        print(f"[render] {n}/{len(tasks)} {t['id']} {r.get('seconds', '')}s ok={r['ok']}", flush=True)
        json.dump(results, open(ARGS["result"], "w", encoding="utf8"), indent=1)


main()
