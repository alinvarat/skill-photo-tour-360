// Usage: node --experimental-websocket shot.mjs URL OUT.png WIDTH HEIGHT ['js to run after window.__ready'] [waitMs]
// Needs google-chrome (or set CHROME). Prints the tour state and any page errors.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const [url, out, W, H, js = '', waitMs = '3000'] = process.argv.slice(2);
const ud = mkdtempSync(join(tmpdir(), 'tourshot-'));
const port = 9300 + Math.floor(Math.random() * 500);
const ch = spawn(process.env.CHROME || 'google-chrome', ['--headless=new', `--user-data-dir=${ud}`, `--remote-debugging-port=${port}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--window-size=${W},${H}`, '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 50; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const p = l.find((t) => t.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch (_) {} await sleep(200); }
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pend = new Map(); const logs = [];
ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } if (d.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 300)); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') logs.push('ERR ' + JSON.stringify(d.params.args.map((a) => a.value ?? a.description)).slice(0, 300)); });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 2, mobile: +W < 600 });
await send('Page.navigate', { url });
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
for (let i = 0; i < 300 && !(await ev('!!window.__ready')); i++) await sleep(200);
if (js) await ev(`(async () => { ${js} })()`);
await sleep(+waitMs);
const st = await ev("JSON.stringify(window.__tour && __tour.state()) + ' ' + document.title");
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
console.log(out.split('/').pop(), st, logs.join(' | '));
ws.close(); ch.kill(); await sleep(300); rmSync(ud, { recursive: true, force: true });
