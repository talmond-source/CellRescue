/* ---------- Story bosses: the viral DNA dragon ----------
   Nucleus: drive the dragon out of the genome. Hit its head when it dives low; at half strength it shields
            itself (station on the left); near the end it locks into a beam clash with your blaster, and each
            correct answer pushes your beam forward.
   CRISPR (the finale, unlocked after 7 other Rangers): type a guide RNA to target the dragon's heart and cut it;
            the dragon repairs itself; the Prime Editing exosuit rewrites its target gene, and the dragon turns on
            the virions. Keyboard players type; touchscreen players get a letter wheel. */
const BOSSES = {};
function bossDef() { return world && world.boss && BOSSES[ranger.id] || null; }
var UNLOCK_ALL = typeof location !== 'undefined' && /unlockall/.test(location.search || '');
function clearedOthers() { return new Set(profile.results.map(v => v.ranger).filter(id => id !== 'crispr')).size; }
function crisprLocked() { return !UNLOCK_ALL && clearedOthers() < 7; }

/* ---------- the dragon, drawn straight onto the game canvas ---------- */
const DRAGON_PAL = {
 virus: { a: '#ff4fd8', aD: '#7a1d6a', b: '#c4ff4f', bD: '#4f7a16', jaw: '#2a0f3a', jaw2: '#3d1554', eye: '#ff2266', spike: ['#ff4fd8', '#c4ff4f'] },
 cell: { a: '#ffd36b', aD: '#8a6a1a', b: '#6bf4dc', bD: '#1d6a62', jaw: '#0f2a3a', jaw2: '#163f54', eye: '#6bf4dc', spike: ['#ffd36b', '#6bf4dc'] }};
function drawHelixDragon(pts, t, pal, sc = 1, o = {}) {
 const d = ctx, N = pts.length; if (N < 4) return;
 const body = pts.map((p, i) => { const q = pts[Math.min(N - 1, i + 1)], nx = -(q[1] - p[1]), ny = q[0] - p[0], len = Math.hypot(nx, ny) || 1, taper = 1 - i / N, r = (5 + 17 * taper) * sc * Math.sin(i * .42 - t * 8), depth = Math.cos(i * .42 - t * 8);
  return { x: p[0], y: p[1], ax: p[0] + nx / len * r, ay: p[1] + ny / len * r, bx: p[0] - nx / len * r, by: p[1] - ny / len * r, w: (1.6 + 6 * taper) * sc, depth }; });
 const cutAt = o.cut ? Math.floor(N * .42) : -1, gap = o.cut || 0;
 const off = i => (cutAt >= 0 && i > cutAt ? gap : 0);
 const strand = (side, color, dark) => { for (let i = N - 2; i >= 0; i--) { if (i === cutAt && gap > 2) continue; const p = body[i], q = body[i + 1], front = (side > 0 ? p.depth : -p.depth) > 0, oy = off(i);
  const x1 = side > 0 ? p.ax : p.bx, y1 = (side > 0 ? p.ay : p.by) + oy, x2 = side > 0 ? q.ax : q.bx, y2 = (side > 0 ? q.ay : q.by) + oy;
  d.lineCap = 'round'; d.strokeStyle = '#07020c'; d.lineWidth = p.w + 4; d.beginPath(); d.moveTo(x1, y1); d.lineTo(x2, y2); d.stroke();
  d.strokeStyle = front ? color : dark; d.lineWidth = p.w; d.beginPath(); d.moveTo(x1, y1); d.lineTo(x2, y2); d.stroke();
  if (front && p.w > 4) { d.strokeStyle = '#ffffffaa'; d.lineWidth = 1.4; d.beginPath(); d.moveTo(x1, y1 - p.w * .25); d.lineTo(x2, y2 - p.w * .25); d.stroke(); } } };
 strand(-1, pal.a, pal.aD);
 body.forEach((p, i) => { if (i % 2 || i < 3) return; const oy = off(i); d.lineCap = 'butt'; d.strokeStyle = '#07020c'; d.lineWidth = p.w * .7 + 3; d.beginPath(); d.moveTo(p.ax, p.ay + oy); d.lineTo(p.bx, p.by + oy); d.stroke();
  d.strokeStyle = ['#ff5c6c', '#ffd23f', '#3ddc84', '#4aa3ff'][(i / 2) % 4]; d.lineWidth = p.w * .7; d.beginPath(); d.moveTo(p.ax, p.ay + oy); d.lineTo(p.bx, p.by + oy); d.stroke(); });
 strand(1, pal.b, pal.bD);
 for (let i = 4; i < N - 10; i += 5) { const p = body[i], q = body[i + 1], a = Math.atan2(q.y - p.y, q.x - p.x) - Math.PI / 2, h = 4 + p.w * 1.6, oy = off(i); d.fillStyle = pal.spike[(i / 5) % 2 | 0]; d.strokeStyle = '#07020c'; d.lineWidth = 2;
  d.beginPath(); d.moveTo(p.x + Math.cos(a + 1.2) * 5, p.y + oy + Math.sin(a + 1.2) * 5); d.lineTo(p.x + Math.cos(a) * (h + 18 * sc), p.y + oy + Math.sin(a) * (h + 18 * sc)); d.lineTo(p.x + Math.cos(a - 1.2) * 5, p.y + oy + Math.sin(a - 1.2) * 5); d.closePath(); d.fill(); d.stroke(); }
 // the heart: a glowing knot of code in the chest
 if (o.heart) { const hp = body[Math.floor(N * .42)], pulse = .6 + .4 * Math.sin(t * 6); const g2 = d.createRadialGradient(hp.x, hp.y, 2, hp.x, hp.y, 30 * sc); g2.addColorStop(0, 'rgba(255,255,255,' + pulse + ')'); g2.addColorStop(.3, o.heart + 'cc'); g2.addColorStop(1, o.heart + '00'); d.fillStyle = g2; d.beginPath(); d.arc(hp.x, hp.y, 30 * sc, 0, 7); d.fill(); }
 // the head
 const [hx, hy] = pts[0], [bx, by] = pts[3], a = Math.atan2(hy - by, hx - bx), open = o.open ?? (.5 + .5 * Math.sin(t * 11)), S = 2.3 * sc; d.save(); d.translate(hx, hy); d.rotate(a); if (Math.cos(a) < 0) d.scale(1, -1); d.scale(S, S);
 d.lineJoin = 'round'; d.lineWidth = 1.6; d.strokeStyle = '#07020c';
 d.fillStyle = pal.a; d.beginPath(); d.moveTo(-12, -6); d.lineTo(-34, -20); d.lineTo(-22, -8); d.closePath(); d.fill(); d.stroke();
 d.fillStyle = pal.b; d.beginPath(); d.moveTo(-8, -8); d.lineTo(-30, -28); d.lineTo(-16, -9); d.closePath(); d.fill(); d.stroke();
 d.fillStyle = pal.jaw; d.beginPath(); d.moveTo(-14, 4); d.lineTo(18, 6 + open * 7); d.lineTo(22, 9 + open * 8); d.lineTo(4, 12); d.lineTo(-12, 10); d.closePath(); d.fill(); d.stroke();
 d.fillStyle = '#fff'; for (let k = 0; k < 3; k++) { d.beginPath(); d.moveTo(2 + k * 6, 6 + open * (2 + k * 2)); d.lineTo(5 + k * 6, 1 + open * (2 + k * 2)); d.lineTo(8 + k * 6, 6 + open * (2 + k * 2)); d.fill(); }
 d.fillStyle = pal.jaw2; d.beginPath(); d.moveTo(-16, -9); d.lineTo(6, -11); d.lineTo(26, -4); d.lineTo(28, 1); d.lineTo(-2, 3); d.lineTo(-16, 4); d.closePath(); d.fill(); d.stroke();
 d.strokeStyle = pal.b; d.lineWidth = 1.2; d.beginPath(); d.moveTo(-12, -6); d.lineTo(6, -8); d.lineTo(24, -3); d.stroke(); d.strokeStyle = pal.a; d.beginPath(); d.moveTo(-12, 1); d.lineTo(26, 0); d.stroke();
 d.fillStyle = '#fff'; for (let k = 0; k < 4; k++) { d.beginPath(); d.moveTo(2 + k * 6, 2); d.lineTo(5 + k * 6, 7); d.lineTo(8 + k * 6, 2); d.fill(); }
 const eg = d.createRadialGradient(-2, -5, 0, -2, -5, 8); eg.addColorStop(0, '#ffffffff'); eg.addColorStop(.35, pal.eye + 'ee'); eg.addColorStop(1, pal.eye + '00'); d.fillStyle = eg; d.beginPath(); d.arc(-2, -5, 8, 0, 7); d.fill();
 d.fillStyle = '#fff'; d.beginPath(); d.moveTo(-6, -5); d.lineTo(-2, -7); d.lineTo(3, -5); d.lineTo(-2, -3.5); d.closePath(); d.fill();
 if (o.flash) { d.globalCompositeOperation = 'source-atop'; d.fillStyle = 'rgba(255,255,255,' + o.flash + ')'; d.fillRect(-40, -30, 80, 50); d.globalCompositeOperation = 'source-over'; }
 d.restore();
 if (o.glitch) for (let k = 0; k < 2; k++) { if (Math.random() < .6) continue; const y = Math.floor(hy - 60 + Math.random() * 120), h = 2 + Math.floor(Math.random() * 6); try { d.drawImage(canvas, 0, y * (canvas.height / H), canvas.width, h * (canvas.height / H), (Math.random() - .5) * 18, y, W, h); } catch (_) {} }
}
/* the body trails behind the head: sample its path history every few pixels */
function dragonTrail(e, spacing = 9, n = 52) {
 const pts = [[e.hx - camera, e.hy]]; let acc = 0, prev = e.trail[e.trail.length - 1];
 for (let i = e.trail.length - 2; i >= 0 && pts.length < n; i--) { const p = e.trail[i]; acc += Math.hypot(p[0] - prev[0], p[1] - prev[1]); prev = p; if (acc >= spacing) { acc = 0; pts.push([p[0] - camera, p[1]]); } }
 while (pts.length < n) { const l = pts[pts.length - 1]; pts.push([l[0] + (e.face < 0 ? spacing : -spacing), l[1] + 2]); }
 return pts;
}
function pushTrail(e) { e.trail.push([e.hx, e.hy]); if (e.trail.length > 900) e.trail.splice(0, 300); }
function makeDragon(x) { const e = makeEnemy(x, 3); Object.assign(e, { dragon: true, hx: x, hy: FLOOR - 190, face: -1, trail: [], state: 'fly', timer: 1.6, attackN: 0 }); for (let i = 0; i < 260; i++) e.trail.push([x + 260 - i, FLOOR - 190 + Math.sin(i / 20) * 20]); e.y = e.hy + 45; return e; }

/* boss-only pointer taps (choices in the clash, the letter wheel) */
let bossTapOn = false;
function bossPointer() { if (bossTapOn || !canvas.addEventListener) return; bossTapOn = true;
 canvas.addEventListener('pointerdown', ev => { if (!bossDef() || mode !== 'play') return; const r = canvas.getBoundingClientRect(); world.bossTap = { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H }; }); }

/* ======================= NUCLEUS: drive the dragon out ======================= */
const CLASH_Q = [
 ['Where is the cell’s DNA stored?', 'In the nucleus', 'In the ribosomes'],
 ['What lets mRNA leave the nucleus?', 'Nuclear pores', 'The cell wall'],
 ['The nucleolus builds…', 'Ribosomes', 'Lysosomes'],
 ['Copying DNA into mRNA is called…', 'Transcription', 'Translation'],
 ['The nuclear envelope has…', 'Two membranes', 'One membrane'],
 ['DNA wrapped around proteins is called…', 'Chromatin', 'Cytoplasm'],
 ['Why do only mRNA copies leave?', 'The DNA stays protected', 'DNA is too small'],
 ['What does the nucleus control?', 'Which proteins get made', 'How much glucose exists']];
BOSSES.nucleus = {
 name: 'VIRAL DNA DRAGON',
 lines: () => [['crispr', 'The viral DNA dragon has broken into the nucleus! If it reaches the chromosomes it will write itself into the genome.'], ['nucleus', 'Not in my archive. I’ll hit its head when it dives low. If it shields itself, I’ll use the control station on the left.']],
 setup() { const e = makeDragon(820); enemies.push(e); world.clash = null; bossPointer(); },
 ai(e, dt) {
  pushTrail(e); const p = player; e.timer -= dt; const fast = world.shieldUnlocked ? .75 : 1;
  const go = (tx, ty, sp) => { const dx = tx - e.hx, dy = ty - e.hy, d = Math.hypot(dx, dy); if (d > 1) { const m = Math.min(d, sp * dt); e.hx += dx / d * m; e.hy += dy / d * m; } return d < 4; };
  if (e.hurt <= 0 || e.state === 'ground') {
   if (e.state === 'fly') { const tx = clamp(p.x + Math.sin(e.clock * .6) * 230, 120, world.length - 120); go(tx, FLOOR - 190 + Math.sin(e.clock * 2) * 26, 170); if (e.timer <= 0) { e.attackN++; e.state = e.attackN % 3 === 0 ? 'breathMove' : 'windup'; e.timer = .7 * fast; e.tx = p.x; } }
   else if (e.state === 'windup') { go(e.tx - e.face * 40, FLOOR - 230, 120); if (e.timer <= 0) { e.state = 'dive'; e.tx = p.x; tone(140, .3, 'sawtooth', .03); } }
   else if (e.state === 'dive') { if (go(e.tx, FLOOR - 26, 560)) { e.state = 'ground'; e.timer = 1.6 * fast + .3; shake = 7; burst(e.hx, FLOOR - 4, '#c4ff4f', 22); if (Math.abs(p.x - e.hx) < 56 && p.y > FLOOR - 70) damagePlayer(1, e.hx); } }
   else if (e.state === 'ground') { if (e.timer <= 0) { e.state = 'fly'; e.timer = 2 * fast + Math.random(); } }
   else if (e.state === 'breathMove') { const side = p.x > world.length / 2 ? -1 : 1; e.bx = clamp(p.x + side * 270, 80, world.length - 80); if (go(e.bx, FLOOR - 62, 300)) { e.state = 'breath'; e.timer = .9; e.shots = 0; } }
   else if (e.state === 'breath') { if (e.timer <= 0) { if (e.shots < 3) { const dir = p.x > e.hx ? 1 : -1; bolts.push({ x: e.hx + dir * 30, y: FLOOR - 38, vx: dir * 230, life: 3, enemy: true, damage: 1 }); e.shots++; e.timer = .45; tone(95, .18, 'sawtooth'); } else { e.state = 'fly'; e.timer = 1.8 * fast; } } }
  }
  if (e.state !== 'dive') e.face = p.x > e.hx ? 1 : -1;
  e.x = e.hx; e.y = e.hy + 45;
  if (!world.toldHead && e.state === 'ground') { world.toldHead = true; toast('Its head is down! Punch it before it rises.', 3); }
 },
 hit(e, amount) { // returns true to swallow the hit
  if (world.clash) return true;
  if (world.shieldUnlocked && e.hp - amount <= e.max * .25) { e.hp = e.max * .25; this.startClash(e); return true; }
  return false;
 },
 startClash(e) { const p = player; bolts = []; world.clash = { k: .5, q: 0, sel: 0, order: CLASH_Q.map((_, i) => i).sort(() => Math.random() - .5), wrong: 0, flash: 0, t: 0, won: 0, swap: Math.random() < .5 };
  e.state = 'clash'; e.hx = clamp(p.x + p.face * 280, 90, world.length - 90); e.hy = FLOOR - 60; e.face = p.x > e.hx ? 1 : -1; p.face = e.hx > p.x ? 1 : -1; p.action = null; p.vx = 0;
  tone(60, .8, 'sawtooth', .04); shake = 10; toast('BEAM CLASH! Answer correctly to push your beam forward.', 4); },
 takeover(dt) {
  const c = world.clash; if (!c) return false; const e = enemies[0], p = player; c.t += dt; c.flash = Math.max(0, c.flash - dt); pushTrail(e);
  for (const m of particles) { m.life -= dt; m.x += m.vx * dt; m.y += m.vy * dt; m.vy += 250 * dt; } particles = particles.filter(m => m.life > 0); shake = Math.max(c.won ? 0 : 2.5, shake - dt * 22);
  const camTarget = clamp((p.x + e.hx) / 2 - W / 2, 0, world.length - W); camera += (camTarget - camera) * Math.min(1, dt * 6);
  if (c.won) { c.won += dt; e.hx += e.face * -1 * 0 + (e.hx > p.x ? 1 : -1) * 260 * dt * Math.min(1, c.won); e.hy -= 220 * dt * Math.min(1, c.won); if (c.won > 2.6) { world.clash = null; e.hp = 0; e.dead = .01; world.cleared = true; } return true; }
  c.k = Math.max(0, c.k - .018 * dt);
  const pick = n => { const qi = c.order[c.q % c.order.length], q = CLASH_Q[qi], right = c.swap ? 1 - n : n; if (right === 0) { c.k = Math.min(1, c.k + .16); c.q++; c.swap = Math.random() < .5; c.flash = .35; shake = 9; tone(700, .15, 'square', .03); rumble(.9, 220); burst(this.mid(c, e).x, this.mid(c, e).y, '#9fe8ff', 30);
    if (c.k >= 1) { c.won = .01; tone(1000, .6, 'triangle', .04); burst(e.hx, e.hy, '#ffffff', 60); shake = 14; toast('The dragon is blasted out of the genome! Wounded, it flees… this isn’t over.', 5); run.score += 1000; } }
   else { c.k = Math.max(0, c.k - .1); run.retries++; tone(110, .2, 'sawtooth', .03); toast('Not quite: ' + q[1].toLowerCase() + '. The dragon pushes back!', 3); c.q++; c.swap = Math.random() < .5; } };
  if (taps.has('ArrowLeft') || taps.has('KeyA')) c.sel = 0; if (taps.has('ArrowRight') || taps.has('KeyD')) c.sel = 1;
  if (taps.has('KeyZ') || taps.has('Space') || taps.has('KeyX') || taps.has('KeyE') || taps.has('ArrowUp')) pick(c.sel);
  if (world.bossTap) { const t = world.bossTap; world.bossTap = null; if (t.y > 60 && t.y < 120) pick(t.x < W / 2 ? 0 : 1); }
  if (c.k <= 0) { c.k = .5; run.retries++; world.rewind = 1.2; toast('◀◀ The dragon’s beam reached you! Back to the middle. Read each question carefully.', 4); }
  return true;
 },
 mid(c, e) { const p = player, x0 = p.x + p.face * 40, y0 = p.y - 48, x1 = e.hx - e.face * 30, y1 = e.hy; return { x: x0 + (x1 - x0) * c.k, y: y0 + (y1 - y0) * c.k }; },
 draw() {
  const e = enemies[0]; if (!e || !e.dragon) return; if (e.hp <= 0 && e.dead <= 0) return;
  const pts = dragonTrail(e); drawHelixDragon(pts, clock, DRAGON_PAL.virus, 1, { flash: e.hurt > 0 ? .7 : 0, glitch: true, open: e.state === 'breath' || e.state === 'clash' ? 1 : undefined });
  if (e.state === 'windup' || e.state === 'breathMove') text('!', e.hx - camera, e.hy - 60, 22, '#ffdb8a', 'center');
  if (e.state === 'windup') { ctx.strokeStyle = '#ff5d7888'; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(e.tx - camera, FLOOR); ctx.lineTo(e.tx - camera, FLOOR - 40); ctx.stroke(); ctx.setLineDash([]); }
  if (world.shieldActive && !world.shieldUnlocked) { ctx.strokeStyle = '#75e7ff'; ctx.lineWidth = 3; ctx.globalAlpha = .6 + .3 * Math.sin(clock * 8); ctx.beginPath(); ctx.arc(e.hx - camera, e.hy, 56, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
 },
 front() {
  const c = world.clash; if (!c) return; const e = enemies[0], p = player, m = this.mid(c, e), x0 = p.x + p.face * 40 - camera, y0 = p.y - 48, x1 = e.hx - e.face * 30 - camera, y1 = e.hy, mx = m.x - camera;
  if (!c.won) {
   const beam = (xa, ya, xb, yb, col, core) => { for (const [w, a] of [[22, .25], [12, .6], [5, 1]]) { ctx.strokeStyle = a === 1 ? core : col; ctx.globalAlpha = a; ctx.lineWidth = w + Math.sin(clock * 40) * 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke(); } ctx.globalAlpha = 1; ctx.lineCap = 'butt'; };
   beam(x0, y0, mx, m.y, '#48cde8', '#e1ffff'); beam(x1, y1, mx, m.y, '#ff4fd8', '#fff0fb');
   ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(mx, m.y, 2, mx, m.y, 46 + Math.sin(clock * 30) * 6); g.addColorStop(0, '#ffffff'); g.addColorStop(.3, '#c4a8ff'); g.addColorStop(1, '#c4a8ff00'); ctx.fillStyle = g; ctx.fillRect(mx - 60, m.y - 60, 120, 120); ctx.restore();
   for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28, r = 20 + Math.random() * 40; ctx.strokeStyle = Math.random() < .5 ? '#9fe8ff' : '#ff9ad8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, m.y); ctx.lineTo(mx + Math.cos(a) * r, m.y + Math.sin(a) * r); ctx.stroke(); }
   // the anime impact frame on a correct answer
   if (c.flash > 0) { const k = c.flash / .35, inv = Math.floor(c.flash * 20) % 2; ctx.fillStyle = inv ? 'rgba(0,0,0,' + .7 * k + ')' : 'rgba(255,255,255,' + .6 * k + ')'; ctx.fillRect(0, 0, W, H); ctx.save(); ctx.translate(mx, m.y); for (let i = 0; i < 40; i++) { const a = i / 40 * 6.28; ctx.fillStyle = inv ? '#fff' : '#000'; ctx.globalAlpha = k; ctx.beginPath(); ctx.moveTo(Math.cos(a - .02) * 40, Math.sin(a - .02) * 40); ctx.lineTo(Math.cos(a) * 700, Math.sin(a) * 700); ctx.lineTo(Math.cos(a + .02) * 40, Math.sin(a + .02) * 40); ctx.fill(); } ctx.restore(); ctx.globalAlpha = 1; }
   // the power meter and the question
   rect('#06101ef0', 40, 24, 560, 104); rect('#be86ff', 40, 24, 560, 3);
   rect('#2a1440', 60, 40, 520, 10); rect('#48cde8', 60, 40, 520 * c.k, 10); rect('#ff4fd8', 60 + 520 * c.k, 40, 520 * (1 - c.k), 10); rect('#ffffff', 58 + 520 * c.k, 36, 4, 18); text('YOU', 60, 64, 8, '#9fe8ff'); text('DRAGON', 580, 64, 8, '#ff9ad8', 'right');
   const q = CLASH_Q[c.order[c.q % c.order.length]], opts = c.swap ? [q[2], q[1]] : [q[1], q[2]];
   text(q[0], 320, 70, 11, '#ffffff', 'center');
   opts.forEach((o, i) => { const x = i ? 330 : 50, on = c.sel === i; rect(on ? '#be86ff' : '#1a2440', x, 82, 260, 32); rect(on ? '#fff0ff' : '#3a4a70', x, 82, 260, 2); text((i ? '→ ' : '← ') + o, x + 130, 103, 10, on ? '#1a0a2a' : '#e8f6ff', 'center'); });
  }
  if (world.rewind > 0) { world.rewind -= 1 / 60; text('◀◀', W / 2, H / 2, 22, '#ffffff', 'center'); }
 }
};

/* ======================= CRISPR: the finale ======================= */
const PAIR_RNA = { A: 'U', T: 'A', G: 'C', C: 'G' };
const GUIDE_TARGET = 'TACCGGAT', EDIT_NEW = 'ACGTTGCA';
BOSSES.crispr = {
 name: 'VIRAL DNA DRAGON', noBar: true,
 lines: () => [['crispr', 'This virus has had control long enough. The dragon’s heart is a stretch of its own DNA, and Cas9 can cut it.'], ['crispr', 'I need a guide RNA that pairs with the heart’s DNA. Remember: in RNA, U pairs with A.']],
 setup() {
  world.terminal.x = -999; world.terminal.done = true; world.dragonCut = 0; bossPointer();
  const e = makeDragon(760); e.ally = false; e.hp = e.max = 999; world.fin = { phase: 'intro', t: 0, d: e, killed: 0, spawned: 0, spawnT: 0, typed: '', sel: 0, wrong: 0 }; world.finDragon = e;
 },
 wheelOn() { return touchUI.on || (typeof PADUI !== 'undefined' && PADUI.on); },
 // the dragon is not in the enemy list: it flies on its own path
 fly(e, dt, mode) {
  pushTrail(e); e.clock += dt; const p = player;
  if (mode === 'circle') { const tx = camera + 380 + Math.cos(e.clock * .7) * 170, ty = FLOOR - 180 + Math.sin(e.clock * 1.4) * 50; e.hx += (tx - e.hx) * Math.min(1, dt * 1.6); e.hy += (ty - e.hy) * Math.min(1, dt * 1.6); }
  if (mode === 'hold') { const tx = camera + 300, ty = FLOOR - 170 + Math.sin(e.clock * 2) * 10; e.hx += (tx - e.hx) * Math.min(1, dt * 2); e.hy += (ty - e.hy) * Math.min(1, dt * 2); }
  if (mode === 'sweep') { e.sw = (e.sw || 0) + dt; const k = (e.sw % 4.2) / 4.2, dir = Math.floor(e.sw / 4.2) % 2 ? -1 : 1; const x = dir > 0 ? -150 + k * (world.length + 300) : world.length + 150 - k * (world.length + 300); e.hx = x; e.hy = k > .15 && k < .85 ? FLOOR - 40 + Math.sin(k * 20) * 10 : FLOOR - 200;
   for (const v of enemies) if (v.hp > 0 && v.drop === 0 && Math.abs(v.x - e.hx) < 50 && e.hy > FLOOR - 90) { v.hp = 1; damageEnemy(v, 9, 40); burst(v.x, v.y - 30, '#6bf4dc', 16); } }
  e.face = (e.trail.length > 2 ? e.hx - e.trail[e.trail.length - 3][0] : 0) >= 0 ? 1 : -1;
 },
 takeover(dt) {
  const f = world.fin; if (!f) return false; f.t += dt; const e = f.d;
  for (const m of particles) { m.life -= dt; m.x += m.vx * dt; m.y += m.vy * dt; m.vy += 250 * dt; } particles = particles.filter(m => m.life > 0); shake = Math.max(0, shake - dt * 22);
  if (f.phase === 'intro') { this.fly(e, dt, 'circle'); if (f.t > 1.4) this.go('type1'); return true; }
  if (f.phase === 'type1' || f.phase === 'type2') { this.fly(e, dt, 'hold'); this.typing(f); return true; }
  if (f.phase === 'cut') { this.fly(e, dt, 'hold'); world.dragonCut = Math.min(44, f.t > 1.1 ? (f.t - 1.1) * 60 : 0); if (f.t > 1.1 && !f.boom) { f.boom = 1; shake = 12; tone(1200, .3, 'square', .04); burst(this.heart(e).x + camera, this.heart(e).y, '#ffffff', 50); } if (f.t > 3) this.go('regen'); return true; }
  if (f.phase === 'regen') { this.fly(e, dt, 'hold'); world.dragonCut = Math.max(0, 44 - f.t * 18); if (f.t > .3 && !f.told) { f.told = 1; tone(80, .8, 'sawtooth', .04); toast('It’s repairing itself! The cell’s own repair enzymes patched the cut, and a mutation changed the heart’s code. The guide no longer matches!', 6); } if (f.t > 4.2) this.go('auth'); return true; }
  if (f.phase === 'auth') { this.fly(e, dt, 'hold'); if (!f.asked) { f.asked = 1; askQuestion(3, () => { closeQuestion(); this.go('suit'); }); } return true; }
  if (f.phase === 'suit') { this.fly(e, dt, 'hold'); if (f.t > .2 && !f.told2) { f.told2 = 1; tone(440, .5, 'triangle', .04); toast('BATTALIZER: PRIME EDITING EXOSUIT! Cas9 nickase + reverse transcriptase + a pegRNA: it rewrites DNA letters without a double cut.', 6); } if (f.t > 3.4) this.go('type2'); return true; }
  if (f.phase === 'turn') { this.fly(e, dt, 'hold'); if (f.t > .8 && !f.flip) { f.flip = 1; e.ally = true; shake = 10; tone(660, .6, 'triangle', .04); burst(e.hx, e.hy, '#6bf4dc', 60); toast('Its target gene now points at the virus! The dragon fights for the cell!', 5); } if (f.t > 3) this.go('battle'); return true; }
  if (f.phase === 'battle') { this.fly(e, dt, 'sweep'); f.spawnT -= dt;
   if (f.spawned < 16 && f.spawnT <= 0 && enemies.filter(v => v.hp > 0).length < 5) { f.spawnT = 1.2; f.spawned++; const v = makeEnemy(clamp(player.x + (Math.random() < .5 ? -1 : 1) * (180 + Math.random() * 120), 60, world.length - 60), Math.floor(Math.random() * 3)); v.drop = -260; v.fin = true; enemies.push(v); }
   for (const v of enemies) if (v.fin && v.hp <= 0 && !v.counted) { v.counted = true; f.killed++; }
   if (f.killed >= 16 && !world.cleared) { world.cleared = true; toast('The virions are gone. The cell is free!', 5); run.score += 1500; }
   return false; }
  return false;
 },
 go(ph) { const f = world.fin; f.phase = ph; f.t = 0; f.typed = ''; f.wrong = 0; if (ph === 'type1') toast('Build the guide RNA: type the letters that pair with the heart DNA.', 4); if (ph === 'type2') toast('Write the edit: type the pegRNA template that pairs with the NEW DNA.', 4); },
 strand() { const f = world.fin; return f.phase === 'type1' ? GUIDE_TARGET : EDIT_NEW; },
 enter(L) {
  const f = world.fin, want = PAIR_RNA[this.strand()[f.typed.length]];
  if (L === want) { f.typed += L; tone(520 + f.typed.length * 50, .07, 'triangle'); f.bad = 0;
   if (f.typed.length === this.strand().length) { if (f.phase === 'type1') { this.go('cut'); toast('Guide locked on! Cas9 cuts the heart DNA.', 3); } else { this.go('turn'); toast('Edit written: the new DNA letters are copied in and the old ones are flushed out.', 4); } } }
  else { f.wrong++; f.bad = .4; run.retries++; tone(110, .18, 'sawtooth', .03); const b = this.strand()[f.typed.length];
   toast(L === 'T' ? 'RNA has no T. It uses U (uracil) instead.' : f.wrong >= 2 ? b + ' pairs with ' + want + '.' : 'Not ' + L + '. Which RNA letter pairs with ' + b + '? (A–U, T–A, G–C, C–G)', 3); }
 },
 typing(f) {
  f.bad = Math.max(0, (f.bad || 0) - 1 / 60); const L = 'AUGC';
  if (this.wheelOn()) {
   if (taps.has('ArrowLeft')) f.sel = (f.sel + 3) % 4; if (taps.has('ArrowRight')) f.sel = (f.sel + 1) % 4; if (taps.has('ArrowUp')) f.sel = 0; if (taps.has('ArrowDown')) f.sel = 2;
   if (taps.has('KeyZ') || taps.has('Space') || taps.has('KeyE')) this.enter(L[f.sel]);
   if (world.bossTap) { const t = world.bossTap; world.bossTap = null; for (let i = 0; i < 4; i++) { const [x, y] = this.wheelPos(i); if (Math.hypot(t.x - x, t.y - y) < 30) { f.sel = i; this.enter(L[i]); } } }
  }
 },
 wheelPos(i) { const a = -Math.PI / 2 + i * Math.PI / 2; return [320 + Math.cos(a) * 60, 276 + Math.sin(a) * 40]; },
 heart(e) { const pts = dragonTrail(e); const p = pts[Math.floor(pts.length * .42)]; return { x: p[0], y: p[1] }; },
 draw() {
  const f = world.fin; if (!f) return; const e = f.d, ally = e.ally;
  drawHelixDragon(dragonTrail(e), clock, ally ? DRAGON_PAL.cell : DRAGON_PAL.virus, 1, { glitch: !ally, heart: f.phase === 'type1' || f.phase === 'cut' ? '#ff2266' : f.phase === 'regen' ? '#ffd36b' : null, cut: world.dragonCut });
  if (f.phase === 'cut' && f.t < 1.2) { const h = this.heart(e), k = clamp(f.t / 1.1, 0, 1), sx = player.x - camera + (h.x - (player.x - camera)) * k, sy = player.y - 60 + (h.y - (player.y - 60)) * k; dgEll(ctx, sx, sy, 22, 16, 0, '#0f6f69ee', '#6bf4dc', 2.5); dgLine(ctx, [[sx - 14, sy], [sx + 14, sy]], '#a86cff', 3); text('Cas9', sx, sy - 22, 8, '#9ffcef', 'center'); }
  if (f.phase === 'regen') { const h = this.heart(e); for (let i = 0; i < 8; i++) text('ATGC'[(i + Math.floor(clock * 12)) % 4], h.x + Math.sin(clock * 6 + i) * 30, h.y + Math.cos(clock * 5 + i * 2) * 24, 9, '#ffd36b', 'center'); text('REPAIRING…', h.x, h.y - 46, 10, '#ffd36b', 'center'); }
 },
 suit() { const f = world.fin; return f && !['intro', 'type1', 'cut', 'regen', 'auth'].includes(f.phase); },
 front() {
  const f = world.fin; if (!f) return; const p = player, px = p.x - camera;
  if (this.suit()) { // the exosuit: shoulder plates, a backpack with the pegRNA spool, a golden aura
   const k = f.phase === 'suit' ? clamp(f.t / 2, 0, 1) : 1; ctx.save(); ctx.globalAlpha = k;
   const g = ctx.createRadialGradient(px, p.y - 40, 10, px, p.y - 40, 70); g.addColorStop(0, '#ffd36b55'); g.addColorStop(1, '#ffd36b00'); ctx.fillStyle = g; ctx.fillRect(px - 70, p.y - 110, 140, 140);
   const F = p.face, poly = (pts, fill, edge) => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(px + x * F, p.y + y) : ctx.moveTo(px + x * F, p.y + y)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = edge; ctx.lineWidth = 1.4; ctx.stroke(); };
   poly([[-14, -76], [-30, -86], [-34, -60], [-22, -54]], '#c9a032', '#fff0b0'); poly([[-12, -72], [-26, -104], [-20, -68]], '#ffd36b', '#7a5a10');// jetpack fin
   dgCirc(ctx, px - F * 24, p.y - 66, 6, '#a86cff', '#e6c8ff', 1.5); dgLine(ctx, [[px - F * 24, p.y - 66], [px - F * 12, p.y - 58]], '#c4a6ff', 1.5);// pegRNA spool
   for (const sd of [-1, 1]) poly([[sd * 8, -66], [sd * 24, -70], [sd * 26, -58], [sd * 10, -56]], '#ffd36b', '#7a5a10');// pauldrons
   poly([[-8, -58], [8, -58], [6, -40], [-6, -40]], '#e8b84a', '#fff0b0'); dgCirc(ctx, px, p.y - 50, 3, '#6bf4dc');// chest plate + core
   dgRect(ctx, px + F * 16, p.y - 52, 16, 7, 3, '#6bf4dc', '#e8fff8', 1.2);// editor gauntlet
   ctx.strokeStyle = '#6bf4dc'; ctx.lineWidth = 2; ctx.globalAlpha = k * (.5 + .4 * Math.sin(clock * 6)); ctx.beginPath(); ctx.ellipse(px, p.y - 2, 30, 6, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = k;
   ctx.restore(); if (f.phase === 'suit') { for (let i = 0; i < 3; i++) particles.push({ x: px + camera + (Math.random() - .5) * 60, y: p.y - Math.random() * 90, vx: 0, vy: -60, life: .5, max: .5, color: '#ffd36b' }); text('PRIME EDITING EXOSUIT', px, p.y - 120, 11, '#ffd36b', 'center'); }
  }
  if (f.phase === 'type1' || f.phase === 'type2') this.drawTyping(f);
 },
 drawTyping(f) {
  const s = this.strand(), n = s.length, bw = 34, x0 = 320 - n * bw / 2, shake2 = f.bad > 0 ? Math.sin(clock * 80) * 3 : 0;
  const Y = 34; ctx.save(); ctx.translate(0, Y); rect('#06101ef0', 24, 18, 592, f.phase === 'type1' ? 162 : 182); rect(f.phase === 'type1' ? '#6bf4dc' : '#ffd36b', 24, 18, 592, 3);
  if (f.phase === 'type1') { text('TARGET THE DRAGON’S HEART', 320, 38, 11, '#6bf4dc', 'center'); text('Heart DNA', x0 - 10, 70, 9, '#ff9ad8', 'right'); }
  else { text('PRIME EDIT: REWRITE THE TARGET GENE', 320, 38, 11, '#ffd36b', 'center'); text('Old DNA', x0 - 10, 64, 8, '#a9c7d8', 'right'); dgBases(ctx, 'TGCATCGA', x0 + 4, 54, bw - 8, 16, 8); dgLine(ctx, [[x0, 62], [x0 + n * bw - 4, 62]], '#ff5d78', 2); text('NEW DNA', x0 - 10, 88, 9, '#ffd36b', 'right'); }
  const yT = f.phase === 'type1' ? 56 : 78; dgBases(ctx, s, x0 + 4, yT, bw - 8, 26, 8);
  const yG = yT + 40; text(f.phase === 'type1' ? 'Guide RNA' : 'pegRNA', x0 - 10, yG + 14, 9, '#c9b0ff', 'right');
  for (let i = 0; i < n; i++) { const x = x0 + 4 + i * bw + (i === f.typed.length ? shake2 : 0), L = f.typed[i]; if (L) dgBases(ctx, L, x, yG, bw - 8, 26, 0); else { dgRect(ctx, x, yG, bw - 8, 26, 3, '#102236', i === f.typed.length ? (f.bad > 0 ? '#ff5d78' : '#ffd36b') : '#3a4a70', 1.5, [4, 3]); } if (i === f.typed.length) text('▲', x + (bw - 8) / 2, yG + 40, 9, '#ffd36b', 'center'); }
  const help = f.phase === 'type1' ? 'Pair rule for RNA: A–U, T–A, G–C, C–G.  Cas9 cuts where the guide matches.' : 'The pegRNA carries a template that pairs with the new DNA, the way a guide pairs with its target.';
  text(help, 320, yG + 58, 8, '#cfe4f0', 'center');
  if (!this.wheelOn()) text('Type the letters on your keyboard: A  U  G  C', 320, yG + 72, 8, '#a9c7d8', 'center');
  else if (typeof PADUI !== 'undefined' && PADUI.on) text('D-pad: pick a letter on the wheel · A: enter it', 320, yG + 72, 8, '#a9c7d8', 'center');
  ctx.restore();
  if (this.wheelOn()) { const L = 'AUGC'; for (let i = 0; i < 4; i++) { const [x, y] = this.wheelPos(i), on = f.sel === i; dgCirc(ctx, x, y, 26, on ? '#ffd36b' : BASE_COL[L[i]], '#06101e', 3); text(L[i], x, y + 6, 18, on ? '#1a1000' : '#ffffff', 'center'); } text(typeof PADUI !== 'undefined' && PADUI.on ? 'A' : 'TAP', 320, 280, 8, '#a9c7d8', 'center'); }
 }
};
/* keyboard typing for the finale (captured before the game's own key handling, so C doesn't dodge) */
if (typeof addEventListener === 'function') addEventListener('keydown', ev => {
 const f = world && world.fin; if (mode !== 'play' || !f || !(f.phase === 'type1' || f.phase === 'type2') || ev.repeat) return;
 const m = /^Key([AUGCT])$/.exec(ev.code || ''); if (!m) return; ev.preventDefault(); if (ev.stopImmediatePropagation) ev.stopImmediatePropagation(); BOSSES.crispr.enter(m[1]);
}, true);
