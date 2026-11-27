---
name: photo-tour-360
description: Build a phone-first 360° photo walk-through for a homestay, hotel or other lodging from equirectangular panoramas, with arrows between places, a site plan, room list and a book-by-chat (Messenger/LINE) sheet, styled with clear see-through glass UI. Use when the user wants a 360/VR photo tour, virtual walk-through or "ทัวร์ 360" of a real place, or a sales demo of one. Not for code-built 3D rooms (threejs-archviz).
---

# 360° photo tour for a lodging

Done means: every place loads and links both ways, every arrow lands where its label says, the page has zero JS errors, it was checked in screenshots at phone and desktop size, and the report lists what is still unverified (real phone, real prices, real contact link).

## 1. Gather
1. Get 2:1 equirectangular panoramas, one per place: the owner's own 360 photos (360 camera or phone panorama app). For a sales demo without owner photos, use CC0 panoramas (for example Poly Haven HDRI JPG previews) and say in the page and the report that they are stand-ins. Ask before downloading: list file names, source and total size.
2. Write the place list: name, group (rooms / common / outside), which room type a bedroom belongs to, and which places connect to which. Get room types with beds, guests and prices, and the property's Messenger or LINE ID. Mark any value you invent as an example.

## 2. Prepare the images
Put the panoramas in one folder named by place id (`hotel_room.jpg`), then run:
```bash
python3 -I "<skill-dir>/scripts/prep_panos.py" "<photos-dir>" "<project>/pano"
```
It writes the full image, the fast preview (`lo/`), the dock thumbnail (`t-`) and a labelled grid copy (`grid/`) for each photo. It skips files that are not 2:1. Do not publish `grid/`.

## 3. Build from the template
1. Copy `assets/template.html` to `<project>/index.html`. Keep its loading code unchanged: it shows the 1024 px preview at once, decodes images off the main thread (`ImageBitmapLoader`), turns toward the target while loading, swaps in the 4096 px image after arrival, preloads neighbours and frees textures that are far away. These keep a tap-to-move under about 0.9 s.
2. Fill the data as described in [data.md](references/data.md). Read each spot's `u`, `v` from `pano/grid/<id>.jpg`.
3. The UI is clear smoked glass. When restyling or changing it, follow the `clear-glass-ui` skill. When the page keeps its Hallmark stamp, run `sloplint` until clean after every edit.

## 4. Verify
1. Serve the project folder: `python3 -m http.server 8777 --bind 127.0.0.1` (run in the background).
2. The template has no `<!doctype>` or charset because the Claude artifact host adds them. For local tests make a wrapper: `(printf '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'; cat index.html) > _t.html`. Delete `_t.html` afterwards.
3. Shoot with `node --experimental-websocket "<skill-dir>/scripts/shot.mjs" URL OUT.png W H "js" waitMs`. The page exposes `window.__tour` (`enter()`, `go(key)`, `openSheet('book'|'info'|'rooms')`, `startAuto()`, `state()`). Run at most 3 shots at once.
4. Shoot at 412×860 and 1440×900: the cover, every scene's arrival view, the booking sheet, and the room list. Check each: the arrow labels match what is behind them, nothing faces a tripod or bare wall, all text is readable. Every shot's printed state must show the expected scene and no `EXC`/`ERR`.
5. Time a few moves when speed matters (headless SwiftShader numbers are slower than a real phone and are not phone results).

## 5. Publish and report
1. Publish as a Claude artifact: the page is `index.html`; add every `pano/<id>.jpg`, `pano/lo/<id>.jpg` and `pano/t-<id>.jpg` in the `files` map at the same paths. Republish to the same URL for later versions, and back up the page (`index.vN.html`) before each change.
2. Report in at most three lines: the link and what changed, what was verified (screenshots, errors, timings), and what is unverified (real-phone smoothness, gyro inside the artifact frame, stand-in photos or example prices).
