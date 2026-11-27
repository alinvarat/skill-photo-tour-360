# Filling the template with a property's data

All data lives in the module script of `template.html`. Search for each constant by name.

## SCENES (one entry per panorama)
```js
{ id: 'hotel_room',          // file stem in pano/ (pano/<id>.jpg, pano/lo/<id>.jpg, pano/t-<id>.jpg)
  key: 'suite',              // short unique key used by go:, AUTO and room links
  group: 'rooms',            // tab: 'rooms' | 'common' | 'out' (see GROUPS)
  room: 'suite',             // only for bedrooms and their bathrooms: the ROOMS key it books
  name: 'ห้องสวีทวิวดอย',      // place name (dock, arrival card)
  cap: 'เตียงคิงไซซ์ ...',      // one line under the name
  look: [0.83, 0.56],        // u, v the camera faces on arrival
  plan: [16, 22],            // dot on the site plan, 120 x 120 viewBox
  spots: [
    { go: 'lounge', label: 'ออกไปเลานจ์', u: 0.36, v: 0.52 },  // arrow to another scene
    { tag: 'เตียงเดี่ยว 2 เตียง', u: 0.62, v: 0.62 },           // info label on an object
  ] }
```
- `u` is 0 at the left edge of the panorama and 1 at the right; `v` is 0 at the top and 1 at the bottom. Read both from `pano/grid/<id>.jpg`.
- Put a `go` arrow on the door or path that leads to that place, at about `v` 0.5 to 0.55 (eye level), not on the floor.
- Every scene needs at least one `go` arrow back, so no place is a dead end.
- Choose `look` so the first view shows the room's best side. Check it in a screenshot; the first complaint is usually a tripod, clutter or a bare wall.

## The site plan
The plan's three group boxes come from the array that starts `[[4, 2, 112, 34, 'ห้องพัก']` (`[x, y, w, h, label, outdoor?]`). Place each scene's `plan` dot inside its group's box, in roughly the real layout. The view cone is calibrated from the arrows automatically.

## ROOMS (what a guest books)
`{ key, name, beds, guests, price }`. Use the owner's real prices. When prices are invented for a demo, the info sheet must say they are examples.

## GROUPS and AUTO
- `GROUPS` names the dock tabs. Keep the keys; change only the Thai names when needed.
- `AUTO` is the order for the auto tour. Start outside, end at the best view, visit each room type once.

## Contact
The `send` button handler (search `$('send')`) shows a demo toast. For a real property, open the page's chat with the message filled in:
- Messenger: `https://m.me/<PAGE_USERNAME>?text=<encodeURIComponent(message)>`
- LINE OA: `https://line.me/R/oaMessage/<@LINE_ID>/?<encodeURIComponent(message)>`
Use only the IDs the owner gives you.

## Text to replace
Search the markup for the demo property name (`เรือนพักริมดอย`) and replace it everywhere: `<title>`, brand, cover heading and lead, cover meta line, info sheet facts (address, check-in times, contact), and the note that marks demo data.
