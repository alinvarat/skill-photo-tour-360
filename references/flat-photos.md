# Tour from ordinary photos (no 360° photos)

Use this when the property has only normal photos, for example on its Facebook page. There are two ways to show them. Use the photo strip unless the user asks for the sphere.

- **Photo strip (default).** Each place is a row of its photos at their real size with their real edges, swiped left and right; hotspots sit on the photos. Nothing is zoomed or invented. Build it as in "Photo strip" below.
- **Photo sphere.** Several photos placed around the viewer in the three.js template, with blur filling the gaps (sections 2 to 4). The photos only fill the screen when zoomed in and the view is held almost level; a user rejected this as zooming to hide the edges. Use it only on request.

Either way it is not a real 360° capture. Say so on the page and in the report.

## Photo strip
1. Collect and choose photos as in sections 1 and 2 (3 to 4 photos per place, left to right as you would turn; `start` is the arrival photo).
2. Resize the chosen photos to at most 1600 px on the long side (quality 80) into `<project>/ph/<id>.jpg`, and make one 240 × 150 thumbnail per place, `ph/t-<place>.jpg`, from its start photo.
3. Copy `assets/template.html` to `<project>/index.html`, then:
   - replace everything from `<script type="importmap">` to the last `</script>` with `assets/strip-viewer.js`, filling `STRIP` (JSON with each photo's `w`, `h` and spots at `x`, `y` percent), `META`, `ROOMS`, `MESSENGER`;
   - replace the `<canvas id="c" …>` line with `<div class="bg" id="bg" aria-hidden="true"></div><div class="strip" id="strip" tabindex="0" aria-label="…"></div>`, delete the gyro button, and change the hint text to "ปัดซ้ายขวาดูรูปอื่น";
   - add `references/strip-css.css` to the stylesheet and delete the `canvas` rules.
   - add the time switch, dots and full-screen viewer markup: `<div class="under" id="under"><div class="times" id="times" role="group" aria-label="ช่วงเวลา" hidden></div><div class="dots" id="dots"></div></div>` after the strip, and `<div class="lb" id="lb" role="dialog" aria-modal="true" aria-label="ดูรูปเต็มจอ แตะสองครั้งเพื่อซูม" hidden><button class="round lb__x" type="button" data-lbclose aria-label="ปิด">…</button></div>` before the toast.
4. What the viewer does: keeps the photos above the dock (it measures the dock); centres the start photo on arrival; fades between places; photos beside the centre sit back (smaller, dimmer) and the centre photo drifts slowly; dots show and jump between photos; a tap opens the photo full screen with double-tap, pinch and wheel zoom and drag to pan; a vertical mouse wheel scrolls sideways; the auto tour steps through each photo (and each time of day) before moving on.
5. Time of day: look in the contact sheets for photos of the same view taken in fog, daylight, at sunset and at night. Owners often post these ("same place, 3 times of day"). Add them to that photo as `alts: { fog, day, dusk, night }` with `mode` set to the photo's own time; the switch appears only on photos that have alts and cross-fades between the real shots. Never fake a time of day with filters.
6. Verify with `shot.mjs`; `__tour.centre(i)` scrolls to photo i, `__tour.setMode('night')` switches the time, `__tour.openLb(url)` opens the viewer, and `state()` reports `idx` and `mode`. A synthetic `click()` on a photo does nothing unless a `pointerdown` is dispatched first (the tap check compares the scroll position). Shoot every place at 412 × 860 and 1440 × 900 and check that each arrow sits on what its label names.
7. Publish `index.html` with every `ph/*.jpg`, including the time-of-day photos.

## 1. Collect the photos
1. When the owner can send photos, use those. Otherwise, with the user's go-ahead, use the photos on the property's public page.
2. Facebook page photos with Claude in Chrome (the user's own signed-in browser):
   - Open `https://www.facebook.com/<page>/photos`. Grid thumbnails are only 206 px; the full image (up to 2048 px) is in the photo viewer.
   - In `javascript_tool`, loop: click the grid link at index i (`a[href*="photo"]` that contains an `img`), wait until the visible image inside `[role="dialog"]` (`getBoundingClientRect().width > 200`) has a new `src` and `complete`, `fetch()` it to a data URL, store it on `window` with its `alt` text, then `history.back()`. Picking "the largest image on the page" returns a stale photo again and again; always take the visible dialog image and check the `src` changed.
   - Keep each `javascript_tool` call under about 40 s (about 40 photos), and continue from the stored index.
   - Do not return image URLs from `javascript_tool`; the tool blocks URLs with query strings. Return only counts and sizes.
   - Getting the data to disk: the first scripted download works (an `<a download>` of a JSON blob goes to the user's Downloads folder, `xdg-user-dir DOWNLOAD`). Chrome blocks later automatic downloads from the same site without showing a prompt. For a second transfer, run a small local receiver on `127.0.0.1` that serves a page and accepts POSTs, add a button to the Facebook page whose click calls `window.open` on the receiver and then `postMessage`s the data in parts of about 10 photos, and click that button with the `computer` tool (a real click is needed, or the popup is blocked).
   - Decode the data URLs, drop exact duplicates (md5), and number the files `p000.jpg`, `p001.jpg`, and so on.
3. Make contact sheets (7 × 6 thumbnails with file names) and read them. Note which photos show the same place from different angles.
4. Read the page's posts for prices, room names and facts (search the post text for บาท, ราคา, ห้อง). Use only what the page states. A price found in one post is a single data point; say where it came from. Use `price: null` for rooms without a stated price; the page then shows "สอบถามราคา".

## 2. Choose places and photos
- One place = 3 to 5 photos of the same spot taken from different angles. Skip photos with text overlays, people, or a red circle or arrow drawn on them.
- Do not mix day and night photos in one place.
- Use at most 4 photos per place. The script draws each photo wider than the real lens (90° landscape, 70° portrait) so it fills a phone screen from top to bottom; 4 photos then go most of the way round.
- Put the best photo at `u: 0.5` (the arrival view) and space neighbours about 0.19 (portrait) to 0.25 (landscape) apart, so turning moves from one photo straight into the next. The fourth photo goes behind, at `u: 0.0` or `0.12`.
- A tall facade can use `"v": 0.44, "hfov": 62` to show the whole building.

## 3. Build the spheres
Write `spec.json` (format at the top of `scripts/collage.py`), then run:
```bash
python3 -I "<skill-dir>/scripts/collage.py" spec.json "<photos-dir>" "<project>/panos_src"
python3 -I "<skill-dir>/scripts/prep_panos.py" "<project>/panos_src" "<project>/pano"
```
The gaps are filled by push-pull averaging, so each gap continues the colours at the photo edges (sky above, floor below). Look at `pano/grid/<id>.jpg` for every place: no flat grey bands or coloured rings, photos in the order you meant. Place the hotspots on those grids.

## 4. Page settings for photo spheres
In the template's module script set `FOV_PORTRAIT = 64, FOV_LANDSCAPE = 52, LAT_MAX = 0.12`. With looser values the viewer sees the photo's top and bottom edges and the blur beyond them; a user on a phone reported those edges as the first problem.

Verify by shooting each place turned left and right and tilted to the limit (`__tour.view.lat = -LAT_MAX`, never beyond, since the drag clamps there).

## 5. Honesty and publishing
- Put "เดโม" in `<title>`, "เดโมจากรูปในเพจ" in the brand line, and a note in the info sheet: built from the page's photos, not real 360°, where each price came from.
- The page uses a real business's name and photos. Build it as local files first and let the user decide before publishing. Publish only as a private Claude artifact, and tell the user that the owner can open it only after they share it.
- Set `MESSENGER` to the page's username only when the user wants the send button to message the real page.
