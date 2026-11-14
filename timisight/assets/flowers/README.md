# Flower icons

One PNG per flower, named after the flower's id in the `flowers` table.

```
assets/flowers/violinist-rose.png
assets/flowers/hop-flower.png
```

Then register it in `src/constants/flower-icons.ts` (one line per flower).

## Spec

- **512 x 512 px**, square, **PNG with a transparent background**.
  Image generators often paint a grey checkerboard into a JPEG instead of real
  transparency. Run those through the helper, which removes the background, trims, centres
  and shrinks the picture:

  ```
  python3 scripts/prepare-flower-icon.py assets/flowers/rose.jpeg assets/flowers/violinist-rose.png
  ```

  (needs `pip install pillow`). Look at the result on a coloured background before using
  it. The original `.jpeg` files are not bundled into the app (only files that are
  `require`d are), so you can delete them once converted.
- The flower **centred, with about 10% empty margin** on every side.
- Flat colours and a **thick dark outline (#12142b)**, matching the app. No text, no
  gradients, no photo-realism.
- Keep each file **under ~100 KB** (run it through a PNG compressor such as Squoosh).
- It has to stay readable at **40 px** (it appears that small in the bouquet row).

The statue photo shown on a flower's own page is not an icon. It is `FLOWER_IMAGES` in
`src/constants/flowers.ts`.
