/* ================= Game controllers (Xbox, PlayStation, Switch Pro: any "standard" pad) =================
   Browsers hide a controller until a button is pressed, then report it through the Gamepad API; we poll every
   frame. The keyboard and the controller work side by side, and the hints follow whichever was used last.

   Side-scroller:  stick / D-pad move · A jump · X attack (dive kick in the air) · Y blaster · B dodge
                   RB or LB use / pick up · Menu pause
   First-person, top-down, codon wheel, beam clash, letter wheel:  stick / D-pad aim or move or pick · A (or RT) fire / act
   Menus and pop-ups:  stick / D-pad choose · A select · B back
   Teacher override: on the locked CRISPR card, press A five times quickly. */
const PADUI = (() => {
 // Edge on Xbox: ask for real controller input instead of the browsing cursor (ignored by other browsers)
 try { if (typeof navigator !== 'undefined') navigator.gamepadInputEmulation = 'gamepad'; } catch (_) {}
 const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
 const S = { on: false, held: new Set(), prev: {}, dirPrev: {}, repeat: {}, index: -1, fake: null };
 const btn = (gp, i) => { const b = gp.buttons[i]; return !!b && (b.pressed || b.value > .5); };
 const key = (code) => { const k = { Enter: 'Enter', Escape: 'Escape', Space: ' ' }[code] || code; if (typeof dispatchEvent === 'function' && typeof KeyboardEvent === 'function') dispatchEvent(new KeyboardEvent('keydown', { code, key: k, bubbles: true, cancelable: true })); };
 function setOn(v) { if (S.on === v) return; S.on = v; document.body?.classList?.toggle('pad', v); if (v && typeof setTouch === 'function') setTouch(false); fitSelect(); }
 if (typeof addEventListener === 'function') {
  addEventListener('keydown', e => { if (e.isTrusted) setOn(false); }, true);
  addEventListener('pointerdown', e => { if (e.isTrusted) setOn(false); }, true);
  addEventListener('gamepadconnected', () => { if (typeof toast === 'function' && mode === 'play') toast('Controller connected'); });
 }
 function pick() {
  if (S.fake) return S.fake;
  const list = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
  if (S.index >= 0 && list[S.index] && list[S.index].connected) return list[S.index];
  for (const gp of list) if (gp && gp.connected && gp.buttons.some(b => b.pressed)) { S.index = gp.index; return gp; }
  for (const gp of list) if (gp && gp.connected) return gp;
  return null;
 }
 // what the controller drives right now
 function context() {
  if (typeof mode === 'undefined') return 'menu';
  if (mode === 'play' && !$('overlay')?.hidden) return 'overlay';
  if (mode !== 'play') return $('overlay') && !$('overlay').hidden ? 'overlay' : mode;
  if (world?.shooter) return 'aim';
  const f = world?.fin; if (world?.clash || (f && (f.phase === 'type1' || f.phase === 'type2'))) return 'aim';
  return 'side';
 }
 // the held-key set the game reads every frame
 function hold(want) { for (const k of [...S.held]) if (!want.has(k)) { keys.delete(k); S.held.delete(k); } for (const k of want) if (!S.held.has(k)) { keyDown(k); S.held.add(k); } }
 // move keyboard focus between the visible buttons of a pop-up, by direction
 function moveFocus(dx, dy) {
  const box = $('overlay'); if (!box || !box.querySelectorAll) return;
  const list = [...box.querySelectorAll('button')].filter(b => b.offsetParent !== null && !b.disabled); if (!list.length) return;
  const cur = list.includes(document.activeElement) ? document.activeElement : null;
  if (!cur) { (list.find(b => b.closest('#answers')) || list[0]).focus(); return; }
  const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let best = null, bd = 1e9;
  for (const b of list) { if (b === cur) continue; const q = b.getBoundingClientRect(), x = q.left + q.width / 2 - cx, y = q.top + q.height / 2 - cy; const along = x * dx + y * dy; if (along <= 4) continue; const side = Math.abs(x * dy - y * dx), d = along + side * 2.2; if (d < bd) { bd = d; best = b; } }
  (best || cur).focus();
 }
 function poll() {
  const gp = pick(); if (!gp) return;
  const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, dz = .45;
  const dir = { up: btn(gp, B.UP) || ay < -dz, down: btn(gp, B.DOWN) || ay > dz, left: btn(gp, B.LEFT) || ax < -dz, right: btn(gp, B.RIGHT) || ax > dz };
  const now = {}; for (const k in B) now[k] = btn(gp, B[k]);
  if (Object.values(now).some(Boolean) || Object.values(dir).some(Boolean)) setOn(true);
  if (!S.on) { S.prev = now; S.dirPrev = dir; return; }
  const ctx = context(), t = performance.now();
  // a button still held from the previous screen (the A that closed a dialog) is ignored until it is released
  if (ctx !== S.ctx) { S.ctx = ctx; S.block = new Set(Object.keys(now).filter(k => now[k] && S.prev[k])); }
  const raw = { ...now }; for (const k of [...(S.block || [])]) { if (!now[k]) S.block.delete(k); else now[k] = false; }
  const edge = k => now[k] && !S.prev[k], dEdge = k => dir[k] && !S.dirPrev[k];
  const rep = k => { if (dEdge(k)) { S.repeat[k] = t + 380; return true; } if (dir[k] && t >= S.repeat[k]) { S.repeat[k] = t + 150; return true; } return false; };
  if (ctx === 'side' || ctx === 'aim') {
   const want = new Set();
   if (dir.left) want.add('ArrowLeft'); if (dir.right) want.add('ArrowRight');
   if (ctx === 'aim') { if (dir.up) want.add('ArrowUp'); if (dir.down) want.add('ArrowDown'); if (now.A || now.RT) want.add('KeyZ'); if (now.RB || now.LB) want.add('KeyE'); }
   else { if (now.A) want.add('Space'); if (now.X) want.add('KeyZ'); if (now.Y) want.add('KeyX'); if (now.B) want.add('KeyC'); if (now.RB || now.LB || now.LT) want.add('KeyE'); if (now.RT) want.add('KeyX'); }
   hold(want);
   if (edge('MENU') || edge('VIEW')) key('Escape');
  } else {
   hold(new Set());
   if (ctx === 'overlay') {
    if (rep('up')) moveFocus(0, -1); if (rep('down')) moveFocus(0, 1); if (rep('left')) moveFocus(-1, 0); if (rep('right')) moveFocus(1, 0);
    if (edge('A')) { const el = document.activeElement; if (el && el.tagName === 'BUTTON' && $('overlay').contains(el)) el.click(); else moveFocus(0, 1); }
    if (edge('B') || edge('MENU')) { if (mode === 'pause') key('Escape'); }
   } else if (ctx === 'dialog') { if (edge('A') || edge('X') || edge('B')) key('Space'); if (edge('MENU')) key('Escape'); }
   else if (ctx === 'select') { for (const [d, code] of [['up', 'ArrowUp'], ['down', 'ArrowDown'], ['left', 'ArrowLeft'], ['right', 'ArrowRight']]) if (rep(d)) key(code); if (edge('A') || edge('MENU')) key('Enter'); if (edge('B')) key('Escape'); }
   else if (ctx === 'intro') { if (edge('A') || edge('B') || edge('MENU')) key('Escape'); }
   else if (ctx === 'introGate') { if (edge('A') || edge('MENU')) key('Enter'); if (edge('B')) $('skipGate')?.click(); }
   else if (ctx === 'title') { if (edge('A') || edge('MENU')) key('Enter'); if (edge('Y')) $('introBtn')?.click(); }
  }
  // the first question of a pop-up gets focus, so A works without moving first
  if (ctx === 'overlay' && !$('overlay').contains(document.activeElement)) moveFocus(0, 0);
  S.prev = raw; S.dirPrev = dir;
 }
 S.poll = poll;
 if (typeof requestAnimationFrame === 'function') (function loop() { try { poll(); } catch (_) {} requestAnimationFrame(loop); })();
 // a short buzz on hits and big moments (pads that support it)
 S.rumble = (strong, ms = 120) => { if (!S.on || strong <= 0) return; const gp = pick(), v = gp && gp.vibrationActuator; if (!v || !v.playEffect) return; try { v.playEffect('dual-rumble', { duration: ms, strongMagnitude: Math.min(1, strong), weakMagnitude: Math.min(1, strong * .7) }).catch(() => {}); } catch (_) {} };
 return S;
})();
const rumble = (s, ms) => { try { PADUI.rumble(s, ms); } catch (_) {} };
/* button names in messages, when the controller is in use */
function padWords(t) {
 const aim = !!(world?.shooter || world?.clash || world?.fin);
 t = t.replace(/with the mouse or the arrow keys and fire with a click or Z\. On a touchscreen, just tap where you want to fire\./, 'with the left stick and fire with A.')
  .replace(/\(aim and click, or arrows \+ Z\)/, '(aim with the stick, fire with A)').replace(/ ?On a touchscreen,[^.!]*[.!]/g, '').replace(/ \(or hold a finger on the screen\)/g, '')
  .replace(/the arrow keys/g, 'the left stick').replace(/Keys:/g, 'D-pad:').replace(/Mouse: click the amino acid on the rim/, 'Stick: pick an amino acid · A confirms')
  .replace(/\bX draws/g, 'Y draws').replace(/\bC dodges/g, 'B dodges').replace(/\(C\)/g, '(B)').replace(/\b([Pp])ress E\b/g, '$1ress RB').replace(/\bE picks/g, 'RB picks').replace(/\(E /g, '(RB ').replace(/\[E\]/g, '[RB]').replace(/^E · /, 'RB · ')
  .replace(/Press Z, tap or click/g, 'Press A').replace(/Fire, tap or press Z/g, 'Press A').replace(/Fire \(or press E\)/g, 'Press A').replace(/Fire, tap or press E/g, 'Press A').replace(/Fire, tap or press E to run/g, 'Press A to run');
 return t.replace(/\bZ\b/g, aim ? 'A' : 'X');
}

/* With a controller there is no way to scroll, so the Ranger select screen shrinks just enough to fit the screen
   (on Xbox it was a few pixels too tall). Keyboard and touch players keep the normal size. */
function fitSelect() {
 const ms = typeof $ === 'function' && $('missionSelect'); if (!ms || !ms.style || typeof innerHeight === 'undefined') return;
 ms.style.zoom = ''; if (!PADUI.on || ms.hidden) return;
 let z = 1;
 for (let k = 0; k < 4; k++) { const over = document.documentElement.scrollHeight - innerHeight; if (over <= 0) break; const h = ms.getBoundingClientRect().height; if (h <= 0) break; z = Math.max(.55, z * (h - over - 14) / h); ms.style.zoom = String(z); }
 scrollTo(0, 0);
}
if (typeof addEventListener === 'function') addEventListener('resize', () => { try { fitSelect(); } catch (_) {} });
