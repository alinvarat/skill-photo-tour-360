# photo-tour-360

An agent skill for building a phone-first 360° photo walk-through of a homestay, hotel or other lodging from equirectangular panoramas.

- `SKILL.md` — the workflow: gather photos, prepare images, fill the template, verify with screenshots, publish
- `assets/template.html` — a working tour page (three.js r160): arrows between places, site plan, room list, book-by-chat sheet, auto tour, clear glass UI, fast preview-then-sharp loading. Demo data uses a fictional property.
- `references/data.md` — how to fill the scene, room and contact data
- `scripts/prep_panos.py` — makes full, preview, thumbnail and u/v-grid images from 2:1 panoramas (needs Pillow)
- `scripts/shot.mjs` — headless Chrome screenshot driver over the DevTools protocol (Node 20+)

The glass styling is described in the companion skill [clear-glass-ui](https://github.com/alinvarat/skill-clear-glass-ui).
