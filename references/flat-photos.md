# Tour from ordinary photos (no 360° photos)

Use this when the property has only normal photos, for example on its Facebook page. The result is a "photo sphere": several photos of one place placed around the viewer, with soft blur filling the gaps. It looks good on a phone, but it is not a real 360° capture. Say so on the page and in the report.

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
- Put the best photo at `u: 0.5` (the arrival view). Space neighbours about 0.17 to 0.19 apart (one photo width), so turning moves from one photo straight into the next. A bathroom or a view out of the window can sit further round.
- A tall facade can use `"v": 0.44, "hfov": 48` to show the whole building.

## 3. Build the spheres
Write `spec.json` (format at the top of `scripts/collage.py`), then run:
```bash
python3 -I "<skill-dir>/scripts/collage.py" spec.json "<photos-dir>" "<project>/panos_src"
python3 -I "<skill-dir>/scripts/prep_panos.py" "<project>/panos_src" "<project>/pano"
```
Look at `pano/grid/<id>.jpg` for every place: no coloured rings or bands in the gaps, photos in the order you meant. Place the hotspots on those grids.

## 4. Page settings for photo spheres
In the template's module script set `FOV_PORTRAIT = 62, FOV_LANDSCAPE = 50, LAT_MAX = 0.42`. With the 360° values the photos fill only the middle of the screen and the top and bottom show blur.

## 5. Honesty and publishing
- Put "เดโม" in `<title>`, "เดโมจากรูปในเพจ" in the brand line, and a note in the info sheet: built from the page's photos, not real 360°, where each price came from.
- The page uses a real business's name and photos. Build it as local files first and let the user decide before publishing. Publish only as a private Claude artifact, and tell the user that the owner can open it only after they share it.
- Set `MESSENGER` to the page's username only when the user wants the send button to message the real page.
