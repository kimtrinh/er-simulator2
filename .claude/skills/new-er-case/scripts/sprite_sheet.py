#!/usr/bin/env python3
"""Assemble procedure keyframes into a horizontal sprite strip + CSS for a steps() animation.

    python3 sprite_sheet.py raw/pericardio_*.png --name pericardiocentesis \
        --out media/game/sprite-pericardiocentesis-v1.webp --css work/sprite.css \
        [--height 512] [--fps 8] [--chroma 00ff00] [--loops 2]
    python3 sprite_sheet.py --from-video clip.mp4 --every 3 --name ... --out ...   # frames from a video

All frames are cropped to ONE shared bounding box of their non-transparent pixels, so the
anatomical anchor (needle tip / hands) never jumps between frames, then scaled to --height.
Frames are used in the order given (shell globs sort by name: name them 01, 02, …).
Prints the frame size, aspect and the rig values to paste into roomProcedureOverlayHTML.
Requires Pillow; --chroma also needs numpy; --from-video needs ffmpeg.
"""
import argparse
import glob
import os
import subprocess
import sys
import tempfile

from PIL import Image


def chroma_key(im, hexcol, tol=60):
    """Make pixels near hexcol transparent, with a soft, de-spilled fringe."""
    import numpy as np
    key = np.array([int(hexcol[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.int32)
    a = np.asarray(im.convert("RGBA")).astype(np.int32)
    dist = np.abs(a[..., :3] - key).sum(axis=2)
    alpha = np.clip((dist - tol) / (tol * 1.2), 0, 1) * a[..., 3]
    fringe = (dist >= tol) & (dist < tol * 2.2)
    dom = int(np.argmax(key))  # remove spill of the key's dominant channel in the fringe
    others = [c for c in range(3) if c != dom]
    cap = np.maximum(a[..., others[0]], a[..., others[1]])
    a[..., dom] = np.where(fringe, np.minimum(a[..., dom], cap), a[..., dom])
    a[..., 3] = alpha.astype(np.int32)
    return Image.fromarray(a.astype("uint8"), "RGBA")


def frames_from_video(path, every):
    tmp = tempfile.mkdtemp(prefix="sprite_")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-vf", f"select=not(mod(n\\,{every}))",
                    "-vsync", "vfr", os.path.join(tmp, "f%03d.png")], check=True)
    return sorted(glob.glob(os.path.join(tmp, "f*.png")))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("frames", nargs="*")
    ap.add_argument("--from-video")
    ap.add_argument("--every", type=int, default=3, help="with --from-video: keep every Nth frame")
    ap.add_argument("--name", required=True, help="procedure kind, e.g. pericardiocentesis")
    ap.add_argument("--out", required=True, help=".webp (alpha) or .png")
    ap.add_argument("--css", help="write the CSS snippet here")
    ap.add_argument("--height", type=int, default=512)
    ap.add_argument("--fps", type=float, default=8)
    ap.add_argument("--loops", default="2", help="CSS iteration count (number or 'infinite')")
    ap.add_argument("--chroma", help="hex colour to key out, e.g. 00ff00")
    ap.add_argument("--pad", type=int, default=6, help="px padding kept around the shared bbox")
    a = ap.parse_args()

    paths = frames_from_video(a.from_video, a.every) if a.from_video else a.frames
    if len(paths) < 2:
        print("Need at least 2 frames.", file=sys.stderr)
        return 1
    ims = [Image.open(p).convert("RGBA") for p in paths]
    size0 = ims[0].size
    if any(im.size != size0 for im in ims):
        print("Frames differ in canvas size — regenerate them as edits of one canvas "
              "(the anchor would jump). Sizes: " + ", ".join(f"{i.size}" for i in ims), file=sys.stderr)
        return 1
    if a.chroma:
        ims = [chroma_key(im, a.chroma.lstrip("#")) for im in ims]

    boxes = [im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox() for im in ims]
    boxes = [b for b in boxes if b]
    if not boxes:
        print("All frames are fully transparent.", file=sys.stderr)
        return 1
    l = max(0, min(b[0] for b in boxes) - a.pad)
    t = max(0, min(b[1] for b in boxes) - a.pad)
    r = min(size0[0], max(b[2] for b in boxes) + a.pad)
    btm = min(size0[1], max(b[3] for b in boxes) + a.pad)
    cw, ch = r - l, btm - t
    fh = a.height
    fw = max(1, round(cw * fh / ch))
    n = len(ims)
    sheet = Image.new("RGBA", (fw * n, fh), (0, 0, 0, 0))
    for i, im in enumerate(ims):
        sheet.paste(im.crop((l, t, r, btm)).resize((fw, fh), Image.LANCZOS), (i * fw, 0))

    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    if a.out.lower().endswith(".webp"):
        sheet.save(a.out, "WEBP", quality=88, method=6)
    else:
        sheet.save(a.out, optimize=True)
    kb = os.path.getsize(a.out) / 1024

    dur = n / a.fps
    url = a.out.replace(os.sep, "/")
    for marker in ("media/", "scenes/"):
        if marker in url:
            url = url[url.index(marker):]
            break
    css = (
        f".rmSprite--{a.name}{{display:block;width:100%;height:100%;"
        f"background:url({url}) 0 0/{n * 100}% 100% no-repeat;"
        f"animation:rmSprite-{a.name} {dur:.2f}s steps({n},jump-none) var(--sprite-loops,{a.loops}) both;"
        f"filter:drop-shadow(0 6px 5px rgba(2,6,23,.58))}}\n"
        f"@keyframes rmSprite-{a.name}{{from{{background-position:0 0}}to{{background-position:100% 0}}}}\n"
        f"@media (prefers-reduced-motion:reduce){{.rmSprite--{a.name}{{animation:none;background-position:100% 0}}}}\n"
    )
    if a.css:
        open(a.css, "w").write(css)
    print(css)
    print(f"{a.out}: {n} frames of {fw}x{fh}px, {kb:.0f} KB, {dur:.2f}s per loop at {a.fps:g} fps")
    print(f"rig: aspect:{fw}/{fh}  (crop box in source px: l={l} t={t} w={cw} h={ch})")
    print("Set ax/ay = the working point (needle tip / hands) as a 0–1 fraction of ONE frame; "
          "measure it on frame 1 with grid_sheet.py.")
    if kb > 400:
        print("WARNING: > 400 KB — lower --height or the frame count.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
