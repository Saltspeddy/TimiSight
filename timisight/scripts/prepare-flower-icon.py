#!/usr/bin/env python3
"""Turn a flower icon from an image generator into a clean, transparent 512x512 PNG.

Image generators often "fake" transparency by painting a grey/white checkerboard into a
JPEG. A JPEG can't be transparent, so the squares end up in the app. This removes that
background, trims the picture to the flower, centres it on a square with an even margin and
saves a small PNG.

    python3 scripts/prepare-flower-icon.py assets/flowers/rose.jpeg assets/flowers/violinist-rose.png

Needs Pillow only (pip install pillow). Check the result on a coloured background before
using it: the script removes the white "sticker" outline too, because it is the same colour
as the checkerboard and cannot be told apart from it.
"""
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter

WORK = 1024  # process at this size, then shrink to the final size
FINAL = 512
MARGIN = 0.06  # empty space around the flower, as a fraction of its size
ERODE = 7  # odd number; (ERODE - 1) / 2 px of the edge is trimmed to drop the light halo
SAT_MAX = 16  # of 255: pixels this grey-ish ...
VAL_MIN = 184  # ... and this light count as "background"


def main(src: str, dst: str) -> None:
    im = Image.open(src).convert("RGB")
    im = im.resize((WORK, WORK), Image.LANCZOS)

    # 1. Which pixels look like checkerboard (nearly colourless and light)?
    _, sat, val = im.convert("HSV").split()
    grey = ImageChops.darker(
        sat.point(lambda p: 255 if p < SAT_MAX else 0),
        val.point(lambda p: 255 if p > VAL_MIN else 0),
    )

    # 2. Keep only the grey that is connected to the picture's edge. Light areas INSIDE the
    #    flower (highlights, pale petals) are not connected to the edge, so they stay.
    for x in range(WORK):
        for y in (0, WORK - 1):
            if grey.getpixel((x, y)) == 255:
                ImageDraw.floodfill(grey, (x, y), 128)
    for y in range(WORK):
        for x in (0, WORK - 1):
            if grey.getpixel((x, y)) == 255:
                ImageDraw.floodfill(grey, (x, y), 128)
    outside = grey.point(lambda p: 255 if p == 128 else 0)

    # 3. Alpha = everything that is not outside; trim the fringe, then soften the edge.
    alpha = ImageChops.invert(outside)
    alpha = alpha.filter(ImageFilter.MinFilter(ERODE)).filter(ImageFilter.GaussianBlur(1.2))

    rgba = im.convert("RGBA")
    rgba.putalpha(alpha)

    # 4. Crop to the flower, centre it on a square with an even margin, shrink.
    box = alpha.point(lambda p: 255 if p > 8 else 0).getbbox()
    if not box:
        sys.exit(f"{src}: nothing left after removing the background. Is it already transparent?")
    rgba = rgba.crop(box)
    side = int(max(rgba.size) * (1 + 2 * MARGIN))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(rgba, ((side - rgba.width) // 2, (side - rgba.height) // 2))
    canvas = canvas.resize((FINAL, FINAL), Image.LANCZOS)
    canvas.save(dst, optimize=True)
    print(f"{src} -> {dst}  ({FINAL}x{FINAL})")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
