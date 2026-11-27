<script type="module">
const $ = (id) => document.getElementById(id);
document.documentElement.classList.add('js');
// The property's Facebook page username (m.me/<name>).
const MESSENGER = '';   // empty: the send button shows a demo message

// Each place is a strip of the page's own photos, left to right; start: the photo shown on arrival.
// Spots sit on a photo at x, y percent of its width and height.
// STRIP: { key: { start: 1, photos: [{ p: 'p001', w: 1600, h: 1200, spots: [{ go: 'room1', label: 'เข้าห้อง', x: 50, y: 60 }, { tag: 'text', x: 30, y: 40 }],
//   alts: { fog: 'p004', day: 'p001', dusk: 'p007', night: 'p021' }, mode: 'day' }] } }   (alts and mode optional)
const STRIP = __STRIP__;
const META = {   // one entry per place, same keys as STRIP; plan: dot position in the 120 x 120 site plan
  lawn: { group: 'out', name: 'สนามหน้าบ้าน', cap: 'one line about the place', plan: [16, 100] },
  room1: { group: 'rooms', room: 'room1', name: 'ห้องวิวสวน', cap: 'เตียงใหญ่ ห้องน้ำในตัว', plan: [20, 20] },
};
const SCENES = Object.keys(META).map((key) => ({ key, ...META[key], ...STRIP[key] }));
const ROOMS = [   // price: null when unknown (shows สอบถามราคา)
  { key: 'room1', name: 'ห้องวิวสวน', beds: 'เตียงใหญ่', guests: 2, price: null },
];
const GROUPS = [{ key: 'rooms', name: 'ห้องพัก' }, { key: 'common', name: 'ส่วนกลาง' }, { key: 'out', name: 'ภายนอก' }];
const byKey = Object.fromEntries(SCENES.map((s) => [s.key, s]));
const roomOf = (k) => ROOMS.find((r) => r.key === k);
const baht = (n) => n == null ? 'สอบถามราคา' : '฿' + n.toLocaleString('th-TH');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const src = (p) => 'ph/' + p + '.jpg';
let cur = null, moving = false, idx = 0;

/* site plan: where each place is; the one you are at is filled */
const NS = 'http://www.w3.org/2000/svg', planEl = $('plan');
const svg = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); planEl.append(e); return e; };
[[4, 2, 112, 34, 'ห้องพัก'], [4, 42, 112, 30, 'ส่วนกลาง'], [4, 78, 112, 38, 'ภายนอก', true]].forEach(([x, y, w, h, t, out]) => { svg('rect', { x, y, width: w, height: h, rx: 3, class: 'plan__room' + (out ? ' plan__room--out' : '') }); svg('text', { x: x + 4, y: y + 10, class: 'plan__label' }).textContent = t; });
const dots = SCENES.map((s) => svg('circle', { cx: s.plan[0], cy: s.plan[1], r: 3.5, class: 'plan__dot' }));

/* the strip: photos at their own size with their own edges, swiped left and right */
const strip = $('strip'), bgEl = $('bg'), dock = document.querySelector('.dock');
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
function hot(sp) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'hot ' + (sp.go ? 'hot--go' : 'hot--tag is-open');
  b.innerHTML = '<span class="hot__ring" aria-hidden="true">' + (sp.go ? ARROW : '') + '</span><span class="hot__label"></span>';
  b.querySelector('.hot__label').textContent = sp.go ? sp.label : sp.tag;
  b.style.left = sp.x + '%'; b.style.top = sp.y + '%';
  if (sp.x > 60) b.classList.add('is-left');
  if (sp.go) { b.setAttribute('aria-label', 'ไปที่ ' + byKey[sp.go].name); b.addEventListener('click', () => { stopAuto(); go(sp.go); }); }
  else { b.setAttribute('aria-label', sp.tag); b.tabIndex = -1; }
  return b;
}
// a photo with alts has real shots of the same view at other times of day; they sit on top and cross-fade
const MODES = { fog: 'หมอกเช้า', day: 'กลางวัน', dusk: 'เย็น', night: 'ค่ำ' };
let mode = null;   // null: every photo shows its own time
function build(s) {
  strip.replaceChildren();
  s.photos.forEach((ph, i) => {
    const f = document.createElement('figure'); f.className = 'ph';
    const inner = document.createElement('div'); inner.className = 'ph__in';
    const im = new Image(ph.w, ph.h); im.alt = s.name + ' มุมที่ ' + (i + 1); im.decoding = 'async'; im.src = src(ph.p);
    inner.append(im);
    if (ph.alts) Object.entries(ph.alts).forEach(([m, p]) => { if (p === ph.p) return; const a = new Image(); a.alt = ''; a.className = 'ph__alt'; a.dataset.mode = m; a.decoding = 'async'; a.src = src(p); inner.append(a); });
    ph.spots.forEach((sp) => inner.append(hot(sp)));
    f.append(inner); strip.append(f);
  });
  applyMode(); buildDots();
}
function applyMode() {
  [...strip.children].forEach((f, i) => { const ph = cur.photos[i]; if (!ph.alts) return; f.querySelectorAll('.ph__alt').forEach((a) => a.classList.toggle('is-on', mode === a.dataset.mode)); });
  const ph = cur.photos[idx], el = $('times');
  el.replaceChildren(); el.hidden = !ph.alts;
  if (ph.alts) Object.keys(MODES).filter((m) => ph.alts[m]).forEach((m) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = MODES[m];
    b.setAttribute('aria-pressed', String((mode && ph.alts[mode] ? mode : ph.mode) === m));
    b.addEventListener('click', () => { stopAuto(); mode = m === ph.mode ? null : m; applyMode(); }); el.append(b);
  });
  bgEl.style.backgroundImage = 'url("' + src(ph.alts && mode && ph.alts[mode] ? ph.alts[mode] : ph.p) + '")';
}
function buildDots() {
  const el = $('dots'); el.replaceChildren();
  cur.photos.forEach((_, i) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'รูปที่ ' + (i + 1)); b.addEventListener('click', () => { stopAuto(); centre(i, true); }); el.append(b); });
  markDot();
}
const markDot = () => [...$('dots').children].forEach((b, i) => b.setAttribute('aria-current', String(i === idx)));
// depth: photos away from the centre sit back a little; the one in the middle drifts slowly
function depth() {
  const mid = strip.scrollLeft + strip.clientWidth / 2, w = strip.clientWidth;
  [...strip.children].forEach((f, i) => {
    const d = Math.min(1, Math.abs(f.offsetLeft + f.offsetWidth / 2 - mid) / w);
    f.style.transform = 'scale(' + (1 - d * 0.1).toFixed(3) + ')'; f.style.opacity = (1 - d * 0.45).toFixed(3);
    f.classList.toggle('is-centre', i === idx);
  });
}
const centre = (i, smooth) => { const f = strip.children[i]; if (!f) return; strip.scrollTo({ left: f.offsetLeft + f.offsetWidth / 2 - strip.clientWidth / 2, behavior: smooth && !reduce ? 'smooth' : 'instant' }); };
function nearest() { const mid = strip.scrollLeft + strip.clientWidth / 2; let best = 0, d = 1e9; [...strip.children].forEach((f, i) => { const e = Math.abs(f.offsetLeft + f.offsetWidth / 2 - mid); if (e < d) { d = e; best = i; } }); return best; }
let scrollRaf = 0;
strip.addEventListener('scroll', () => { cancelAnimationFrame(scrollRaf); scrollRaf = requestAnimationFrame(() => { if (!cur) return; const i = nearest(); if (i !== idx) { idx = i; applyMode(); markDot(); } depth(); }); }, { passive: true });
// the dock floats over the bottom; keep the photos above it so nothing hides behind it
const fit = () => { const b = innerHeight - dock.getBoundingClientRect().top; $('under').style.bottom = (b + 8) + 'px'; strip.style.bottom = (b + 84) + 'px'; if (cur) { centre(idx); depth(); } };
new ResizeObserver(fit).observe(dock); addEventListener('resize', fit);
strip.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); strip.scrollLeft += e.deltaY; } }, { passive: false });
let downX = 0;
strip.addEventListener('pointerdown', () => { stopAuto(); hint.classList.add('is-gone'); downX = strip.scrollLeft; });
// tap a photo (not a swipe, not a hotspot) to see it full screen
strip.addEventListener('click', (e) => { if (e.target.closest('.hot') || Math.abs(strip.scrollLeft - downX) > 6) return; const f = e.target.closest('.ph'); if (!f) return; const i = [...strip.children].indexOf(f); if (i !== idx) { centre(i, true); return; } const on = f.querySelector('.ph__alt.is-on'); openLb((on || f.querySelector('img')).src); });

/* full-screen photo: double-tap or pinch to zoom, drag to look around */
const lb = $('lb'), lbImg = new Image(); lbImg.alt = ''; lb.prepend(lbImg); const z = { s: 1, x: 0, y: 0 }; const lbPts = new Map(); let lbPinch = null, lbLast = 0;
const lbApply = () => { lbImg.style.transform = 'translate(' + z.x + 'px,' + z.y + 'px) scale(' + z.s + ')'; };
const lbClamp = () => { if (z.s <= 1) { z.s = 1; z.x = 0; z.y = 0; return; } const mx = lb.clientWidth * (z.s - 1) / 2, my = lb.clientHeight * (z.s - 1) / 2; z.x = Math.max(-mx, Math.min(mx, z.x)); z.y = Math.max(-my, Math.min(my, z.y)); };
function openLb(u) { opener = document.activeElement; lbImg.src = u; z.s = 1; z.x = 0; z.y = 0; lbApply(); lb.hidden = false; stopAuto(); lb.querySelector('[data-lbclose]').focus(); }
function closeLb() { lb.hidden = true; if (opener && opener.focus) opener.focus(); }
lb.querySelector('[data-lbclose]').addEventListener('click', closeLb);
lb.addEventListener('pointerdown', (e) => {
  if (e.target.closest('[data-lbclose]')) return; lb.setPointerCapture(e.pointerId); lbPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (lbPts.size === 2) { const [a, b] = [...lbPts.values()]; lbPinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: z.s }; }
  const now = performance.now();
  if (lbPts.size === 1 && now - lbLast < 300) { if (z.s > 1) { z.s = 1; z.x = 0; z.y = 0; } else { z.s = 2.5; z.x = -(e.clientX - lb.clientWidth / 2) * 1.5; z.y = -(e.clientY - lb.clientHeight / 2) * 1.5; lbClamp(); } lbImg.classList.add('is-ease'); lbApply(); }
  lbLast = now;
});
lb.addEventListener('pointermove', (e) => {
  const p = lbPts.get(e.pointerId); if (!p) return; lbImg.classList.remove('is-ease');
  if (lbPinch && lbPts.size >= 2) { lbPts.set(e.pointerId, { x: e.clientX, y: e.clientY }); const [a, b] = [...lbPts.values()]; z.s = Math.max(1, Math.min(4, lbPinch.s * Math.hypot(a.x - b.x, a.y - b.y) / lbPinch.d)); lbClamp(); lbApply(); return; }
  if (z.s > 1) { z.x += e.clientX - p.x; z.y += e.clientY - p.y; lbClamp(); lbApply(); }
  lbPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
const lbUp = (e) => { lbPts.delete(e.pointerId); if (lbPts.size < 2) lbPinch = null; };
lb.addEventListener('pointerup', lbUp); lb.addEventListener('pointercancel', lbUp);
lb.addEventListener('wheel', (e) => { e.preventDefault(); z.s = Math.max(1, Math.min(4, z.s * (e.deltaY < 0 ? 1.15 : 0.87))); lbClamp(); lbApply(); }, { passive: false });

const preload = (p) => { const im = new Image(); im.src = src(p); return im.decode().catch(() => {}); };
function warm() { const near = cur.photos.flatMap((p) => p.spots).filter((s) => s.go).map((s) => byKey[s.go]); near.forEach((n, k) => setTimeout(() => preload(n.photos[n.start].p), 200 + k * 250)); }

/* dock: tabs for rooms / common / outside, and the places in the open tab */
const roomsEl = $('rooms'), tabsEl = $('tabs');
let tab = 'rooms';
const printBtn = (key, name, n) => {
  const b = document.createElement('button'); b.type = 'button'; b.dataset.key = key; b.setAttribute('aria-label', name);
  b.innerHTML = '<span class="print"></span><span class="wall"><b></b><span></span></span>';
  const im = new Image(); im.alt = ''; im.src = 'ph/t-' + key + '.jpg'; b.querySelector('.print').append(im);
  b.querySelector('.wall b').textContent = String(n); b.querySelector('.wall span').textContent = name;
  return b;
};
GROUPS.forEach((g) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.group = g.key; b.textContent = g.name; b.addEventListener('click', () => showTab(g.key)); tabsEl.append(b); });
function showTab(g) {
  tab = g;
  tabsEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.group === g)));
  roomsEl.replaceChildren();
  const items = g === 'rooms' ? ROOMS.map((r) => ({ key: r.key, name: r.name })) : SCENES.filter((x) => x.group === g).map((x) => ({ key: x.key, name: x.name }));
  items.forEach((it, i) => { const b = printBtn(it.key, it.name, i + 1); b.addEventListener('click', () => { stopAuto(); go(it.key); }); roomsEl.append(b); });
  markCurrent();
}
function markCurrent() { if (!cur) return; const here = cur.room || cur.key; roomsEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.key === here))); }
const dockCta = $('dock-cta');
dockCta.addEventListener('click', () => { if (cur && cur.room) { book.room = cur.room; openSheet('book'); } else openSheet('roomlist'); });

let arriveT = 0;
function arrive(s) { $('arrive-name').textContent = s.name; $('arrive-cap').textContent = s.cap; const a = $('arrive'); a.classList.add('is-on'); clearTimeout(arriveT); arriveT = setTimeout(() => a.classList.remove('is-on'), 2000); }

/* moving between places: fade the strip out, swap in the next place's photos, fade back in on its best photo */
async function go(key) {
  if (moving || (cur && cur.key === key)) return;
  const s = byKey[key]; moving = true;
  const first = !cur;
  const ready = preload(s.photos[s.start].p);
  if (!first) { strip.classList.add('is-out'); await Promise.all([sleep(reduce ? 0 : 200), Promise.race([ready, sleep(1500)])]); }
  else await ready;
  cur = s; idx = s.start; build(s); centre(idx); depth();
  strip.classList.remove('is-out');
  $('cap').textContent = s.cap;
  if (s.group !== tab) showTab(s.group); else markCurrent();
  const rt = s.room && roomOf(s.room);
  $('cap-name').textContent = rt ? rt.name + ' ' + baht(rt.price) + (rt.price == null ? '' : ' ต่อคืน') : s.name;
  dockCta.textContent = rt ? 'จองห้องนี้' : 'ดูห้องพัก';
  dots.forEach((d, i) => d.classList.toggle('is-on', SCENES[i] === s));
  moving = false;
  if (!document.body.classList.contains('is-cover')) arrive(s);
  warm();
}

/* auto tour: show each photo of a place, then on to the next place */
let auto = false, autoTimer = 0;
const AUTO = Object.keys(META);   // auto-tour order
const autoBtn = $('auto'), hint = $('hint');
function startAuto() { auto = true; autoBtn.setAttribute('aria-pressed', 'true'); document.body.classList.add('is-auto'); hint.classList.add('is-gone'); autoStep(); }
function stopAuto() { if (!auto) return; auto = false; clearTimeout(autoTimer); autoBtn.setAttribute('aria-pressed', 'false'); document.body.classList.remove('is-auto'); }
function autoStep() {
  clearTimeout(autoTimer);
  autoTimer = setTimeout(async () => {
    if (!auto) return;
    const ph = cur.photos[idx], ms = ph.alts ? Object.keys(MODES).filter((m) => ph.alts[m]) : [];
    const shown = mode && ph.alts && ph.alts[mode] ? mode : ph.mode, at = ms.indexOf(shown);
    if (ms.length && at < ms.length - 1) { mode = ms[at + 1]; applyMode(); }
    else if (idx < cur.photos.length - 1) { mode = null; centre(idx + 1, true); }
    else await go(AUTO[(AUTO.indexOf(cur.key) + 1) % AUTO.length]);
    if (auto) autoStep();
  }, 2800);
}
autoBtn.addEventListener('click', () => (auto ? stopAuto() : startAuto()));

const fullBtn = $('full');
if (!document.fullscreenEnabled) fullBtn.hidden = true;
fullBtn.addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => toast('เบราว์เซอร์นี้ไม่รองรับเต็มจอ')); });

/* sheets, booking and toast */
const sheets = { info: $('info'), book: $('book'), roomlist: $('roomlist') };
let opener = null;
function openSheet(name) { opener = document.activeElement; Object.values(sheets).forEach((s) => { s.hidden = true; }); sheets[name].hidden = false; stopAuto(); if (name === 'book') fillBook(); sheets[name].querySelector('[data-close]').focus(); }
function closeSheets() { Object.values(sheets).forEach((s) => { s.hidden = true; }); if (opener && opener.focus) opener.focus(); }
$('info-open').addEventListener('click', () => openSheet('info'));
Object.values(sheets).forEach((s) => s.addEventListener('click', (e) => { if (e.target === s || e.target.closest('[data-close]')) closeSheets(); }));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!lb.hidden) closeLb(); else closeSheets(); } });
document.querySelectorAll('[data-rooms]').forEach((b) => b.addEventListener('click', () => openSheet('roomlist')));
const rlist = $('rlist');
ROOMS.forEach((r, i) => {
  const li = document.createElement('li'); li.className = 'rrow';
  li.innerHTML = '<span class="print"></span><div class="rrow__text"><p class="rrow__name"></p><p class="rrow__meta"></p><p class="rrow__price"></p></div><div class="rrow__acts"><button class="cta cta--ghost" type="button" data-see>ดูรูป</button><button class="cta" type="button" data-pick>จองห้องนี้</button></div>';
  const im = new Image(); im.alt = ''; im.src = 'ph/t-' + r.key + '.jpg'; li.querySelector('.print').append(im);
  li.querySelector('.rrow__name').textContent = (i + 1) + ' ' + r.name;
  li.querySelector('.rrow__meta').textContent = r.beds + ' พักได้ ' + r.guests + ' ท่าน';
  li.querySelector('.rrow__price').textContent = baht(r.price) + (r.price == null ? ' ในแชท' : ' ต่อคืน');
  li.querySelector('[data-see]').addEventListener('click', () => { closeSheets(); go(r.key); });
  li.querySelector('[data-pick]').addEventListener('click', () => { book.room = r.key; openSheet('book'); });
  rlist.append(li);
});
const pickEl = $('pick');
ROOMS.forEach((r) => {
  const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.room = r.key;
  b.innerHTML = '<span></span><small></small>'; b.querySelector('span').textContent = r.name; b.querySelector('small').textContent = baht(r.price);
  b.addEventListener('click', () => { book.room = r.key; book.g = Math.min(book.g, r.guests); fillBook(); }); pickEl.append(b);
});
const book = { n: 2, g: 2, room: 'roomA' }, DAY = 86400000;
const iso = (t) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const dateIn = $('in-date'); dateIn.value = iso(Date.now() + 7 * DAY); dateIn.min = iso(Date.now());
const thDate = (s) => new Date(s + 'T12:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
function fillBook() {
  if (!dateIn.value) dateIn.value = iso(Date.now() + 7 * DAY);
  $('n-out').textContent = book.n; $('g-out').textContent = book.g;
  const rt = roomOf(book.room);
  pickEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.room === book.room)));
  $('total').textContent = rt.price == null ? 'สอบถามในแชท' : baht(rt.price * book.n);
  const out = iso(new Date(dateIn.value + 'T12:00:00').getTime() + book.n * DAY);
  $('msg').textContent = 'สวัสดีค่ะ สนใจ' + rt.name + '\nเข้าพัก ' + thDate(dateIn.value) + ' ถึง ' + thDate(out) + ' (' + book.n + ' คืน)\nผู้เข้าพัก ' + book.g + ' ท่าน ห้องว่างไหมคะ';
}
dateIn.addEventListener('change', fillBook);
document.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => { const [k, d] = b.dataset.step.split(':'); book[k] = Math.min(k === 'n' ? 14 : roomOf(book.room).guests, Math.max(1, book[k] + Number(d))); fillBook(); }));
let toastT = 0;
function toast(t) { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 4200); }
$('send').addEventListener('click', () => { if (MESSENGER) { window.open('https://m.me/' + MESSENGER + '?text=' + encodeURIComponent($('msg').textContent), '_blank', 'noopener'); closeSheets(); return; } closeSheets(); toast('ของจริง ปุ่มนี้จะเปิดแชทเพจของที่พักพร้อมข้อความนี้'); });

/* cover */
const cover = $('cover');
function enter(withAuto) {
  cover.classList.add('is-gone'); document.body.classList.remove('is-cover'); if (cur) arrive(cur);
  if (withAuto) startAuto(); else { hint.classList.remove('is-gone'); setTimeout(() => hint.classList.add('is-gone'), 3500); }
  strip.focus({ preventScroll: true });
}
$('start').addEventListener('click', () => enter(false));
$('start-auto').addEventListener('click', () => enter(true));
document.body.classList.add('is-cover');
(async () => {
  try {
    $('bar').style.transform = 'scaleX(0.35)';
    fit(); await go(SCENES[0].key); $('bar').style.transform = 'scaleX(1)';
    document.querySelector('.cover .bar').hidden = true; $('start').disabled = false; $('start-auto').disabled = false; $('cover-meta').textContent = SCENES.length + ' จุด';
    window.__ready = true;
  } catch (e) { $('cover-meta').textContent = 'โหลดภาพไม่สำเร็จ ลองเปิดใหม่อีกครั้ง'; window.__err = String(e); }
})();
window.__tour = { go, enter, startAuto, openSheet, centre, openLb, setMode: (m) => { mode = m; applyMode(); }, scenes: SCENES, state: () => ({ cur: cur && cur.key, idx, mode, moving, auto }) };
</script>
