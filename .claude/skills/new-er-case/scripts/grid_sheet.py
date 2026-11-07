#!/usr/bin/env python3
"""Overlay a labelled 10% grid on an image so hotspot / box coordinates are READ, not guessed.

    python3 grid_sheet.py media/xr_free_air.jpg -o grid.png            # grid only
    python3 grid_sheet.py media/xr_free_air.jpg -o check.png --key xr_free_air \
        --hotspots media-hotspots.json                                   # also draw existing hotspots
    python3 grid_sheet.py scenes/room-young-m.jpg -o g.png --step 5      # finer grid for boxes

Coordinates are percentages of the image box (x from left, y from top), the same units as
media-hotspots.json {x,y,r} and ROOM_LAYERS box [left, top, width, height]. r is a % of width.
"""
import argparse
import json

from PIL import Image, ImageDraw, ImageFont


def font(size):
    for f in ("DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "/System/Library/Fonts/Supplemental/Arial Bold.ttf"):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--step", type=float, default=10, help="grid spacing in percent (default 10)")
    ap.add_argument("--hotspots", help="media-hotspots.json to draw (with --key)")
    ap.add_argument("--key", help="manifest key whose hotspots to draw")
    ap.add_argument("--box", action="append", default=[],
                    help="draw a box l,t,w,h in %% (repeatable), e.g. 42,43.6,15.9,15.4")
    a = ap.parse_args()

    im = Image.open(a.image).convert("RGB")
    W, H = im.size
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    f = font(max(12, W // 70))
    n = int(round(100 / a.step))
    for i in range(n + 1):
        p = i * a.step
        x, y = W * p / 100, H * p / 100
        major = abs(p % 10) < 1e-6
        col = (255, 230, 0, 200) if major else (255, 230, 0, 90)
        d.line([(x, 0), (x, H)], fill=col, width=2 if major else 1)
        d.line([(0, y), (W, y)], fill=col, width=2 if major else 1)
        if major and 0 < p < 100:
            lab = f"{p:g}"
            d.text((x + 3, 3), lab, font=f, fill=(255, 255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0, 255))
            d.text((3, y + 3), lab, font=f, fill=(255, 255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0, 255))

    if a.hotspots and a.key:
        spots = json.load(open(a.hotspots)).get(a.key, [])
        for s in spots:
            cx, cy, r = W * s["x"] / 100, H * s["y"] / 100, W * s["r"] / 100
            d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(0, 255, 160, 255), width=3)
            d.text((cx + r + 4, cy - 8), s.get("label", ""), font=f, fill=(0, 255, 160, 255),
                   stroke_width=2, stroke_fill=(0, 0, 0, 255))
        if not spots:
            print(f"no hotspots for '{a.key}' in {a.hotspots}")
    for b in a.box:
        l, t, w, h = (float(v) for v in b.split(","))
        d.rectangle([W * l / 100, H * t / 100, W * (l + w) / 100, H * (t + h) / 100],
                    outline=(255, 64, 160, 255), width=3)

    Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB").save(a.out)
    print(f"{a.out}  ({W}x{H}, grid {a.step:g}%)")


if __name__ == "__main__":
    main()
