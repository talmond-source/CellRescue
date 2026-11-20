/* ---------- Top-down zones: Lysosome, Smooth ER and Mitochondria ----------
   Built on the shooter framework (stages, guide cards, station, rewind) with a top-down control layer:
   arrows / D-pad move, Z (or B) is the action; on a touchscreen, holding a finger on the screen moves toward it.
   - Lysosome: hole.io. Engulf debris to digest it and grow; bigger rival lysosomes can fuse with you.
   - Smooth ER: spray detox enzymes to turn toxic floor clean while bacteria leak more toxins.
   - Mitochondria: defend the circular mtDNA ring from virions trying to hack it. */
function tdInput(s, stopAt = 6) {
 let mx = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft')), my = Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp'));
 if (s.held && !mx && !my) { const dx = s.aim.x - s.p.x, dy = s.aim.y - s.p.y, d = Math.hypot(dx, dy); if (d > stopAt) { mx = dx / d; my = dy / d; } }
 const l = Math.hypot(mx, my); return l > 0 ? [mx / l, my / l] : [0, 0];
}
function tdRanger(x, y, face, frame, sc, alpha = 1) {
 const art = atlases[ranger.id]?.[frame]; ctx.fillStyle = '#03060c77'; ctx.beginPath(); ctx.ellipse(x, y + 1, 30 * sc, 8 * sc, 0, 0, 7); ctx.fill();
 if (!art || art.width === undefined) return; ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = alpha; ctx.translate(Math.round(x), Math.round(y)); ctx.scale(face * sc, sc); ctx.drawImage(art, -64, -102); ctx.restore();
}
function tdEnemy(id, frame, x, y, face, sc, alpha = 1) {
 const art = atlases[id]?.[frame]; ctx.fillStyle = '#03060c66'; ctx.beginPath(); ctx.ellipse(x, y + 1, 26 * sc, 7 * sc, 0, 0, 7); ctx.fill();
 if (!art || art.width === undefined) { ctx.fillStyle = '#c58cff'; ctx.beginPath(); ctx.arc(x, y - 20 * sc, 18 * sc, 0, 7); ctx.fill(); return; }
 ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = alpha; ctx.translate(Math.round(x), Math.round(y)); ctx.scale(-face * sc, sc); ctx.drawImage(art, -64, -102); ctx.restore();
}
function tdFloor(c0, c1, speck) {
 if (environment && environment.width) { const bgW = H * environment.width / environment.height; ctx.globalAlpha = .28; ctx.drawImage(environment, (W - bgW) / 2, 0, bgW, H); ctx.globalAlpha = 1; }
 const gr = ctx.createRadialGradient(320, 190, 40, 320, 190, 420); gr.addColorStop(0, c0); gr.addColorStop(1, c1); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
 const R = dgSeeded(5); for (let i = 0; i < 140; i++) { ctx.fillStyle = speck; ctx.globalAlpha = .25 + R() * .35; ctx.fillRect(R() * W, R() * H, 1.5, 1.5); } ctx.globalAlpha = 1;
}
function tdGuide(s, color, title, lines, demo) {
 rect('#050c1aee', 60, 40, 520, 280); rect(color, 60, 40, 520, 3); text('STAGE ' + (s.stage + 1) + ' OF 3 · ' + title, 320, 66, 11, color, 'center');
 if (demo) demo();
 lines.forEach((l, i) => text(l, 320, 236 + i * 16, 9, '#e8f6ff', 'center'));
 text('Press Z, tap or click to start', 320, 304, 9, color, 'center');
}
const tdFloat = (s, x, y, msg, color) => s.fx.push({ kind: 'float', x, y, msg, color, t: 0, dur: 1.4 });
function tdFloats(s) { for (const f of s.fx) if (f.kind === 'float') { const k = f.t / f.dur; ctx.globalAlpha = 1 - k; text(f.msg, f.x, f.y - k * 24, 9, f.color, 'center'); ctx.globalAlpha = 1; } }

/* ======================= LYSOSOME: engulf and grow ======================= */
const LYSO_STAGES = [
 { target: 30, rivals: 0, debris: 22, big: 2, mid: 5, guide: ['THE CLEANUP CREW', 'You are a lysosome. Roll over debris to engulf and digest it.', 'Small pieces first: you can only swallow things smaller than you.'] },
 { target: 38, rivals: 2, debris: 24, big: 3, mid: 6, guide: ['OTHER LYSOSOMES', 'Other lysosomes are cleaning up too, and lysosomes can fuse.', 'Bigger than you (red ring)? Stay away. Smaller (green)? You absorb it.'] },
 { target: 46, rivals: 3, debris: 26, big: 5, mid: 7, guide: ['THE BIG CLEANUP', 'Whole dead bacteria are lying around. Grow big enough to digest them.', 'Z gives a quick burst of speed.'] }];
const DEBRIS = [
 [{ key: 'oldProtein', name: 'worn-out protein', made: 'amino acids' }, { key: 'oldDNA', name: 'broken DNA', made: 'nucleotides' }, { key: 'oldMembrane', name: 'old membrane', made: 'fatty acids' }],
 [{ key: 'mito', name: 'worn-out mitochondrion', made: 'recycled parts' }],
 [{ key: 'bacterium', name: 'dead bacterium', made: 'building blocks' }]];
SHOOTERS.lysosome = {
 noBreach: true,
 controls: 'Top-down mode! Move with the arrow keys (or hold a finger on the screen). Z gives a burst of speed.',
 line: 'Cell death everywhere! Pieces of dead bacteria and worn-out parts litter the cell. You are a lysosome: engulf debris to digest it and grow. Other lysosomes are hungry too, and a bigger one can fuse with you and take half your load.',
 stageIntro(s) { s.phase = 'card'; },
 begin(s) { s.phase = 'fight'; this.setup(s); },
 rewind(s) { this.setup(s); },
 setup(s) {
  const st = LYSO_STAGES[s.stage]; s.p = { x: 320, y: 196, r: 14 + s.stage * 3, face: 1, walk: 0, dash: 0, cool: 0, hurt: 0 }; s.debris = []; s.rivals = [];
  for (let i = 0; i < st.debris; i++) s.debris.push(this.makeDebris(s, i < st.big ? 2 : i < st.big + st.mid ? 1 : 0));
  for (let i = 0; i < st.rivals; i++) s.rivals.push(this.makeRival(s, i));
 },
 makeDebris(s, size) {
  const kinds = DEBRIS[size], k = kinds[Math.floor(Math.random() * kinds.length)], r = [7, 15, 26][size] * (.85 + Math.random() * .3);
  // keep pieces apart, so nothing edible ends up hidden under something too big to eat
  let x, y, tries = 0; do { x = 30 + Math.random() * (W - 60); y = 50 + Math.random() * (H - 90); tries++; } while (tries < 60 && (Math.hypot(x - s.p.x, y - s.p.y) < 70 || (s.debris || []).some(o => !o.eaten && Math.hypot(o.x - x, o.y - y) < o.r + r + 10)));
  return { ...k, size, r, x, y, rot: Math.random() * 6, ph: Math.random() * 6 };
 },
 makeRival(s, i) { const side = i % 4; return { x: [30, W - 30, 320, 320][side], y: [190, 190, 50, H - 30][side], r: 13 + i * 3 + s.stage * 2, tx: 320, ty: 190, t: 0, seed: i, gone: 0 }; },
 control(s, dt) {
  const p = s.p, [mx, my] = tdInput(s, p.r * .6); p.cool = Math.max(0, p.cool - dt); p.dash = Math.max(0, p.dash - dt); p.hurt = Math.max(0, p.hurt - dt);
  const sp = (190 - p.r * 1.6) * (p.dash > 0 ? 2.2 : 1);
  p.x = clamp(p.x + mx * sp * dt, p.r, W - p.r); p.y = clamp(p.y + my * sp * dt, 34 + p.r, H - 6 - p.r); if (mx) p.face = mx > 0 ? 1 : -1; if (mx || my) p.walk += dt * 9;
 },
 press(s) { const p = s.p; if (s.phase !== 'fight' || p.cool > 0) return; p.dash = .28; p.cool = 1.2; tone(380, .08, 'triangle'); burst(p.x, p.y, '#ff9ab8', 8); },
 grow(p, r) { p.r = Math.sqrt(p.r * p.r + r * r * .55); },
 update(s, dt) {
  if (s.phase !== 'fight') return; const p = s.p, st = LYSO_STAGES[s.stage];
  for (const d of s.debris) {
   if (d.eaten) continue; d.ph += dt; const dist = Math.hypot(d.x - p.x, d.y - p.y);
   if (dist < p.r * .9 + d.r * .5 && d.r < p.r * .92) { d.eaten = true; this.grow(p, d.r); tone(300 + d.size * 80, .07, 'triangle'); tdFloat(s, d.x, d.y - 10, '→ ' + d.made, '#ffd0dc'); run.score += 20 * (d.size + 1);
    tellOnceSh(s, 'ate' + d.size, ['Digested! Lysosome enzymes break molecules into building blocks the cell reuses.', 'A worn-out mitochondrion! Digesting your own worn-out parts is called autophagy ("self-eating").', 'A whole dead bacterium, digested. White blood cells use lysosomes this way to destroy bacteria.'][d.size]); }
   else if (dist < p.r + d.r && d.r >= p.r * .92) { tellOnceSh(s, 'big' + d.size, 'Too big to engulf yet. Digest smaller pieces to grow first.'); const a = Math.atan2(p.y - d.y, p.x - d.x); p.x = d.x + Math.cos(a) * (p.r + d.r); p.y = d.y + Math.sin(a) * (p.r + d.r); }
  }
  s.debris = s.debris.filter(d => !d.eaten); while (s.debris.length < st.debris - 4) s.debris.push(this.makeDebris(s, Math.random() < .2 ? 2 : Math.random() < .4 ? 1 : 0));
  // catch-up: if you haven't grown in a while, a few small pieces drift in near you
  p.still = (p.lastR === p.r ? (p.still || 0) + dt : 0); p.lastR = p.r;
  if (p.still > 15) { p.still = 0; for (let i = 0; i < 3; i++) { const a = Math.random() * 6.28, d = p.r + 40 + Math.random() * 40, x = clamp(p.x + Math.cos(a) * d, 30, W - 30), y = clamp(p.y + Math.sin(a) * d, 50, H - 40); s.debris.push({ ...DEBRIS[0][i], size: 0, r: 7, x, y, rot: 0, ph: 0 }); } tellOnceSh(s, 'assist', 'Some small debris drifted in nearby. Grab the small pieces first!'); }
  // never run out of things you can actually eat
  if (s.debris.filter(d => d.r < p.r * .9).length < 4 && s.debris.length < st.debris + 6) s.debris.push(this.makeDebris(s, p.r > 26 ? 1 : 0));
  for (const r of s.rivals) {
   if (r.gone > 0) { r.gone -= dt; if (r.gone <= 0) Object.assign(r, this.makeRival(s, r.seed), { r: 12 + s.stage * 2 }); continue; }
   r.t -= dt; const bigger = r.r > p.r * 1.08;
   if (r.t <= 0) { r.t = 1 + Math.random(); const food = s.debris.filter(d => d.r < r.r * .9).sort((a, b) => Math.hypot(a.x - r.x, a.y - r.y) - Math.hypot(b.x - r.x, b.y - r.y))[0]; const chase = bigger && Math.hypot(p.x - r.x, p.y - r.y) < 170 && Math.random() < .55; r.tx = chase ? p.x : food ? food.x : 60 + Math.random() * 520; r.ty = chase ? p.y : food ? food.y : 60 + Math.random() * 260; }
   const dx = r.tx - r.x, dy = r.ty - r.y, dd = Math.hypot(dx, dy), sp = 92 - r.r * .6; if (dd > 4) { r.x += dx / dd * sp * dt; r.y += dy / dd * sp * dt; }
   for (const d of s.debris) if (!d.eaten && d.r < r.r * .9 && Math.hypot(d.x - r.x, d.y - r.y) < r.r * .85) { d.eaten = true; r.r = Math.min(70, Math.sqrt(r.r * r.r + d.r * d.r * .5)); }
   const touch = Math.hypot(p.x - r.x, p.y - r.y) < (p.r + r.r) * .82;
   if (touch && p.hurt <= 0) {
    if (r.r > p.r * 1.08) { const lost = p.r / Math.SQRT2; r.r = Math.min(70, Math.sqrt(r.r * r.r + (p.r * p.r - lost * lost))); p.r = Math.max(12, lost); p.hurt = 1.6; const a = Math.atan2(p.y - r.y, p.x - r.x); p.x = clamp(p.x + Math.cos(a) * 60, p.r, W - p.r); p.y = clamp(p.y + Math.sin(a) * 60, 34 + p.r, H - 6 - p.r); shake = 6; tone(120, .25, 'sawtooth', .03); run.retries++;
     toast('A bigger lysosome fused with you and took half your load! (Lysosomes really do fuse.) Stay away from red rings.', 4); }
    else if (p.r > r.r * 1.08) { this.grow(p, r.r * 1.1); r.gone = 3; burst(r.x, r.y, '#ff9ab8', 20); tone(700, .15, 'triangle'); tellOnceSh(s, 'fuse', 'You absorbed a smaller lysosome. When lysosomes fuse, their contents combine.'); }
    else { const a = Math.atan2(p.y - r.y, p.x - r.x); p.x += Math.cos(a) * 6; p.y += Math.sin(a) * 6; }
   }
  }
  if (p.r >= st.target) shooterStageClear(s);
 },
 hud(s) { return s.p ? 'Size ' + Math.round(s.p.r) + ' / ' + LYSO_STAGES[Math.min(2, s.stage)].target : ''; },
 drawDebris(d) {
  const g = ctx; if (d.size === 0) { g.save(); g.imageSmoothingEnabled = true; g.translate(d.x, d.y); g.rotate(Math.sin(d.ph) * .2); g.drawImage(moleculeIcon(d.key), -d.r * 1.6, -d.r * 1.6, d.r * 3.2, d.r * 3.2); g.restore(); return; }
  if (d.size === 1) { dgMito(g, d.x, d.y, d.r * 2.6, d.r * 1.1, d.rot, { worn: true }); return; }
  // a dead bacterium: a rod with a cracked wall and leaking contents
  g.save(); g.translate(d.x, d.y); g.rotate(d.rot); dgRect(g, -d.r * 1.25, -d.r * .55, d.r * 2.5, d.r * 1.1, d.r * .55, '#56604a', '#9aa58a', 2);
  dgRect(g, -d.r * 1.05, -d.r * .38, d.r * 2.1, d.r * .76, d.r * .38, '#3c4434'); dgLine(g, [[-d.r * .2, -d.r * .55], [0, -d.r * .1], [-d.r * .3, d.r * .25]], '#1d2318', 2);
  for (let i = 0; i < 5; i++) dgCirc(g, d.r * (.6 + i * .18), d.r * (.5 + Math.sin(i) * .2), 2, '#b8c49a'); g.restore();
 },
 draw(s) {
  tdFloor('#1d3a4a', '#0a1622', '#7ab8c8');
  if (s.phase === 'card') { const st = LYSO_STAGES[s.stage]; tdGuide(s, '#ff9ab8', st.guide[0], st.guide.slice(1), () => { dgLyso(ctx, 230, 150, 26); text('YOU', 230, 196, 9, '#7cf7df', 'center'); this.drawDebris({ size: 0, key: 'oldProtein', r: 9, x: 330, y: 150, ph: 0 }); dgMito(ctx, 410, 150, 40, 17, .2, { worn: true }); this.drawDebris({ size: 2, r: 20, x: 500, y: 150, rot: -.3, ph: 0 }); text('small · medium · big', 415, 196, 9, '#cfe4f0', 'center'); }); return; }
  if (!s.p) return; const p = s.p;
  for (const d of s.debris) this.drawDebris(d);
  for (const r of s.rivals) { if (r.gone > 0) continue; dgLyso(ctx, r.x, r.y, r.r); const big = r.r > p.r * 1.08; ctx.strokeStyle = big ? '#ff5d78' : '#9effc4'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(r.x, r.y, r.r + 5, 0, 7); ctx.stroke(); ctx.setLineDash([]); text(big ? 'BIGGER!' : 'smaller', r.x, r.y - r.r - 10, 8, big ? '#ffb0c0' : '#c8ffe0', 'center'); }
  // the player: a lysosome with the Ranger riding inside
  ctx.globalAlpha = p.hurt > 0 && Math.floor(clock * 12) % 2 ? .5 : 1; dgLyso(ctx, p.x, p.y, p.r); ctx.strokeStyle = '#7cf7df'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 3, 0, 7); ctx.stroke();
  tdRanger(p.x, p.y + p.r * .45, p.face, p.dash > 0 ? 11 : [0, 1, 2, 3][Math.floor(p.walk) % 4], clamp(p.r / 70, .22, .55), .95); ctx.globalAlpha = 1;
  if (p.dash > 0) burst(p.x - p.face * p.r, p.y, '#ffd0dc', 1);
  tdFloats(s);
  const st = LYSO_STAGES[Math.min(2, s.stage)], k = clamp(p.r / st.target, 0, 1); rect('#06101ecc', W - 196, H - 30, 188, 22); text('SIZE', W - 188, H - 15, 8, '#ffd0dc'); rect('#26364f', W - 154, H - 23, 138, 8); rect('#ff9ab8', W - 154, H - 23, 138 * k, 8);
 }
};

/* ======================= SMOOTH ER: detox spray ======================= */
const TD_TILE = 20, TD_COLS = 32, TD_ROWS = 15, TD_TOP = 40;
const SER_STAGES = [
 { target: 75, spill: 3, spreaders: 1, seep: .02, hp: 4, guide: ['DETOX', 'Toxins from dead bacteria are spilling across the cell.', 'Hold Z to spray detox enzymes and turn the goo clean.'] },
 { target: 82, spill: 5, spreaders: 2, seep: .03, hp: 5, guide: ['STOP THE LEAKS', 'Dying bacteria keep leaking toxins. Spray them until they break apart.', 'Smooth ER enzymes make toxins dissolve in water so they can be flushed out.'] },
 { target: 88, spill: 7, spreaders: 3, seep: .045, hp: 6, guide: ['LIVER CELL ON OVERTIME', 'Liver cells are packed with smooth ER because they clean the blood.', 'Alcohol and many drugs are broken down the same way.'] }];
SHOOTERS.smoother = {
 noBreach: true,
 controls: 'Top-down mode! Move with the arrow keys and hold Z to spray. On a touchscreen, hold a finger on the goo: you walk to it and spray it.',
 line: 'You step onto the battlefield and the stench of cell death hits you. Toxins from slain bacteria are everywhere. Smooth ER enzymes change toxins so they dissolve in water and can be flushed out. Spray the cell clean!',
 stageIntro(s) { s.phase = 'card'; },
 begin(s) { s.phase = 'fight'; this.setup(s); },
 rewind(s) { this.setup(s); },
 setup(s) {
  const st = SER_STAGES[s.stage]; s.p = { x: 320, y: 200, face: 1, walk: 0, dir: [1, 0], spray: false }; s.tiles = new Float32Array(TD_COLS * TD_ROWS); s.spark = [];
  for (let k = 0; k < st.spill; k++) { const cx = 2 + Math.floor(Math.random() * (TD_COLS - 4)), cy = 1 + Math.floor(Math.random() * (TD_ROWS - 2)), rad = 2 + Math.random() * 2.5; for (let j = 0; j < TD_ROWS; j++) for (let i = 0; i < TD_COLS; i++) if (Math.hypot(i - cx, (j - cy) * 1.3) < rad + Math.random()) s.tiles[j * TD_COLS + i] = 1; }
  s.spreaders = []; for (let i = 0; i < st.spreaders; i++) s.spreaders.push({ x: 60 + Math.random() * 520, y: 70 + Math.random() * 240, hp: st.hp, max: st.hp, tx: 320, ty: 200, t: 0, walk: 0, face: 1, hurt: 0 });
 },
 tileAt(x, y) { const i = Math.floor(x / TD_TILE), j = Math.floor((y - TD_TOP) / TD_TILE); return i >= 0 && j >= 0 && i < TD_COLS && j < TD_ROWS ? j * TD_COLS + i : -1; },
 cleanPct(s) { let c = 0; for (const v of s.tiles) if (v < .05) c++; return c / s.tiles.length * 100; },
 control(s, dt) {
  const p = s.p, [mx, my] = tdInput(s, 64); p.x = clamp(p.x + mx * 140 * dt, 14, W - 14); p.y = clamp(p.y + my * 140 * dt, TD_TOP + 18, H - 8); if (mx || my) { p.walk += dt * 10; if (!s.held) p.dir = [mx, my]; } if (mx) p.face = mx > 0 ? 1 : -1;
  if (s.held) { const dx = s.aim.x - p.x, dy = s.aim.y - (p.y - 26), d = Math.hypot(dx, dy) || 1; p.dir = [dx / d, dy / d]; if (Math.abs(dx) > 4) p.face = dx > 0 ? 1 : -1; }
  p.spray = keys.has('KeyZ') || keys.has('Space') || s.held;
 },
 press() {},
 update(s, dt) {
  if (s.phase !== 'fight' || !s.p) return; const p = s.p, st = SER_STAGES[s.stage];
  // the spray: a cone of enzyme droplets that cleans tiles and hurts the leaking bacteria
  if (p.spray) {
   const ox = p.x + p.dir[0] * 16, oy = p.y - 26 + p.dir[1] * 16, ang = Math.atan2(p.dir[1], p.dir[0]);
   for (let n = 0; n < 3; n++) { const a = ang + (Math.random() - .5) * .5, sp = 220 + Math.random() * 80; s.spark.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: .42 }); }
   for (let j = 0; j < TD_ROWS; j++) for (let i = 0; i < TD_COLS; i++) { const k = j * TD_COLS + i; if (s.tiles[k] <= 0) continue; const tx = i * TD_TILE + 10, ty = TD_TOP + j * TD_TILE + 10, dx = tx - p.x, dy = ty - (p.y - 26), d = Math.hypot(dx, dy); if (d > 124) continue; let da = Math.abs(Math.atan2(dy, dx) - ang); if (da > Math.PI) da = 2 * Math.PI - da; if (da < .42 || d < 34) { s.tiles[k] = Math.max(0, s.tiles[k] - 2.6 * dt); } }
   for (const b of s.spreaders) { if (b.hp <= 0) continue; const dx = b.x - p.x, dy = (b.y - 20) - (p.y - 26), d = Math.hypot(dx, dy); let da = Math.abs(Math.atan2(dy, dx) - ang); if (da > Math.PI) da = 2 * Math.PI - da; if (d < 130 && da < .4) { b.hurt = .1; b.hp -= 2.2 * dt; if (b.hp <= 0) { burst(b.x, b.y - 20, '#9effc4', 24); tone(240, .2, 'square', .02); run.score += 150; tellOnceSh(s, 'leak', 'Leak stopped! Now clean up what it spilled.'); } } }
   if (Math.floor(clock * 8) % 2) tone(900 + Math.random() * 200, .02, 'triangle', .004);
  }
  for (const sp of s.spark) { sp.life -= dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt; } s.spark = s.spark.filter(x => x.life > 0);
  // leaking bacteria wander and leave toxin behind them
  for (const b of s.spreaders) {
   if (b.hp <= 0) continue; b.t -= dt; b.hurt = Math.max(0, b.hurt - dt); if (b.t <= 0) { b.t = 1.5 + Math.random() * 1.5; b.tx = 40 + Math.random() * 560; b.ty = TD_TOP + 30 + Math.random() * 260; }
   const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy); if (d > 3) { b.x += dx / d * 46 * dt; b.y += dy / d * 46 * dt; b.walk += dt * 8; b.face = dx > 0 ? 1 : -1; }
   const k = this.tileAt(b.x, b.y - 4); if (k >= 0) s.tiles[k] = Math.min(1, s.tiles[k] + 1.5 * dt);
   if (Math.random() < dt * .25) { const ci = Math.floor(b.x / TD_TILE), cj = Math.floor((b.y - TD_TOP) / TD_TILE); for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) if (i >= 0 && j >= 0 && i < TD_COLS && j < TD_ROWS) s.tiles[j * TD_COLS + i] = 1; }
  }
  // toxins slowly seep into clean floor next to them
  if (Math.random() < .5) for (let n = 0; n < 6; n++) { const k = Math.floor(Math.random() * s.tiles.length); if (s.tiles[k] > .6 && Math.random() < st.seep * 20 * dt * 2) { const nb = [k - 1, k + 1, k - TD_COLS, k + TD_COLS][Math.floor(Math.random() * 4)]; if (nb >= 0 && nb < s.tiles.length && s.tiles[nb] < .3) s.tiles[nb] = .5; } }
  s.pct = this.cleanPct(s);
  if (s.pct >= st.target && s.spreaders.every(b => b.hp <= 0)) shooterStageClear(s);
  else if (s.pct >= st.target) tellOnceSh(s, 'stillleak', 'Clean enough, but a bacterium is still leaking. Spray it until it breaks apart.');
 },
 hud(s) { return s.pct !== undefined ? 'Clean ' + Math.round(s.pct) + '%' : ''; },
 draw(s) {
  tdFloor('#173a44', '#0a1622', '#7ab8c8');
  if (s.phase === 'card') { const st = SER_STAGES[s.stage]; tdGuide(s, '#7ff1e2', st.guide[0], st.guide.slice(1), () => { for (let i = 0; i < 5; i++) { rect('#5a2a6a', 200 + i * 22, 130, 20, 20); rect('#7a3a8a', 202 + i * 22, 132, 6, 6); } text('toxin', 255, 168, 9, '#e6c8ff', 'center'); text('→', 320, 145, 18, '#7ff1e2', 'center'); for (let i = 0; i < 5; i++) rect('#1c4a52', 345 + i * 22, 130, 20, 20); text('clean', 400, 168, 9, '#9effc4', 'center'); dgSmoothER(ctx, 250, 186, 140, 30); }); return; }
  if (!s.tiles) return; const p = s.p;
  // clean floor: faint tiles; toxins: overlapping blobs that merge into goo puddles, with bubbles
  for (let j = 0; j < TD_ROWS; j++) for (let i = 0; i < TD_COLS; i++) rect('#13404755', i * TD_TILE, TD_TOP + j * TD_TILE, TD_TILE - 1, TD_TILE - 1);
  const goo = (rad, col) => { ctx.fillStyle = col; ctx.beginPath(); for (let j = 0; j < TD_ROWS; j++) for (let i = 0; i < TD_COLS; i++) { const v = s.tiles[j * TD_COLS + i]; if (v <= .05) continue; const x = i * TD_TILE + 10 + Math.sin(i * 2.1 + j) * 2, y = TD_TOP + j * TD_TILE + 10 + Math.cos(i + j * 1.7) * 2, r = rad * (.55 + .45 * v); ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 7); } ctx.fill(); };
  goo(18, '#2a0f36'); goo(16, '#6a2a86'); ctx.save(); ctx.translate(-3, -3); goo(6, '#a85cc444'); ctx.restore();
  for (let j = 0; j < TD_ROWS; j++) for (let i = 0; i < TD_COLS; i++) { const v = s.tiles[j * TD_COLS + i]; if (v <= .4 || (i * 7 + j * 3) % 3) continue; const x = i * TD_TILE, y = TD_TOP + j * TD_TILE, b = Math.abs(Math.sin(clock * 2.4 + i * 1.7 + j)); ctx.fillStyle = '#a8e05a'; ctx.globalAlpha = .55 + .4 * b; ctx.beginPath(); ctx.arc(x + 7, y + 8, 2 + b * 1.6, 0, 7); ctx.fill(); ctx.fillStyle = '#d8a8ff'; ctx.beginPath(); ctx.arc(x + 14, y + 13, 1.4 + (1 - b) * 1.4, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.strokeStyle = '#7ff1e255'; ctx.lineWidth = 1; ctx.strokeRect(.5, TD_TOP + .5, W - 1, TD_ROWS * TD_TILE - 1);
  const ents = [...s.spreaders.filter(b => b.hp > 0).map(b => ({ y: b.y, d: () => { tdEnemy('bacteria', Math.floor(b.walk) % 2, b.x, b.y, b.face, .5, b.hurt > 0 ? .6 : 1); rect('#17233c', b.x - 16, b.y - 58, 32, 3); rect('#d0ed8e', b.x - 16, b.y - 58, 32 * b.hp / b.max, 3); if (Math.floor(clock * 2) % 2) text('LEAKING', b.x, b.y - 64, 7, '#e6c8ff', 'center'); } })), { y: p.y, d: () => tdRanger(p.x, p.y, p.face, p.spray ? 13 : (Math.abs(p.walk % 4) > 0 && (keys.size || s.held) ? [1, 2, 3][Math.floor(p.walk) % 3] : 0), .5) }];
  ents.sort((a, b) => a.y - b.y).forEach(e => e.d());
  for (const sp of s.spark) { ctx.globalAlpha = sp.life / .42; rect(Math.random() < .5 ? '#7ff1e2' : '#e8fff8', sp.x, sp.y, 3, 3); } ctx.globalAlpha = 1;
  if (s.held) shooterCrosshair(s, '#7ff1e2');
  const st = SER_STAGES[Math.min(2, s.stage)], k = (s.pct || 0) / 100; rect('#06101ecc', W - 216, H - 30, 208, 22); text('CLEAN', W - 208, H - 15, 8, '#9effc4'); rect('#26364f', W - 166, H - 23, 150, 8); rect('#7ff1e2', W - 166, H - 23, 150 * k, 8); rect('#ffd36b', W - 166 + 150 * st.target / 100, H - 26, 2, 14);
 }
};

/* ======================= MITOCHONDRIA: defend the mtDNA ring ======================= */
const RING = { x: 320, y: 194, rIn: 92, rOut: 152 }, SEGS = 12;
const MITO_STAGES = [
 { count: 6, every: 2.6, hp: 2, guide: ['MITOCHONDRIA HAVE THEIR OWN DNA', 'A small, circular chromosome: 37 genes, many for making ATP.', 'It is circular because mitochondria were once free-living bacteria.'] },
 { count: 10, every: 1.8, hp: 2, guide: ['THE HACK', 'Virions are landing on the ring to rewrite it so its ATP feeds them.', 'Punch them off (Z) before a section turns fully red.'] },
 { count: 14, every: 1.35, hp: 2, boss: 2, guide: ['FULL ASSAULT', 'Big "hacker" virions take four hits.', 'If four sections get hacked, the mitochondrion switches sides: rewind.'] }];
SHOOTERS.mito = {
 noBreach: true,
 controls: 'Top-down mode! Run around the ring with the arrow keys (or hold a finger on the screen) and punch with Z.',
 line: 'This virus is relentless! It is going after the mitochondria too, trying to hack their DNA so they power the virus instead of the cell. Defend the ring!',
 stageIntro(s) { s.phase = 'card'; },
 begin(s) { s.phase = 'fight'; this.setup(s); },
 rewind(s) { this.setup(s); },
 setup(s) { const st = MITO_STAGES[s.stage]; s.p = { x: RING.x, y: RING.y + (RING.rIn + RING.rOut) / 2, face: 1, walk: 0, act: 0, hit: false }; s.seg = new Array(SEGS).fill(0); s.hacked = new Array(SEGS).fill(false); s.vir = []; s.toSpawn = st.count; s.spawnT = .8; s.bosses = st.boss || 0; },
 polar(x, y) { return [Math.atan2(y - RING.y, x - RING.x), Math.hypot(x - RING.x, y - RING.y)]; },
 control(s, dt) {
  const p = s.p, [mx, my] = tdInput(s, 30); p.act = Math.max(0, p.act - dt);
  if (p.act <= 0) { p.x += mx * 150 * dt; p.y += my * 150 * dt; if (mx || my) p.walk += dt * 10; if (mx) p.face = mx > 0 ? 1 : -1; }
  const [a, r] = this.polar(p.x, p.y), rc = clamp(r, RING.rIn + 14, RING.rOut - 8); p.x = RING.x + Math.cos(a) * rc; p.y = RING.y + Math.sin(a) * rc;
  if (s.held) { const near = s.vir.find(v => v.state === 'on' && Math.hypot(v.x - p.x, v.y - p.y) < 40); if (near && p.act <= 0) this.press(s); }
 },
 press(s) { const p = s.p; if (s.phase !== 'fight' || p.act > 0) return; p.act = .32; p.hit = false; tone(240, .07, 'triangle');
  // turn toward the nearest virion in reach, so a punch never whiffs behind you
  const t = s.vir.filter(v => v.hp > 0 && v.state !== 'fly' && Math.hypot(v.x - p.x, v.y - p.y) < 56).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (t && Math.abs(t.x - p.x) > 2) p.face = t.x > p.x ? 1 : -1; },
 update(s, dt) {
  if (s.phase !== 'fight' || !s.p) return; const p = s.p, st = MITO_STAGES[s.stage];
  if (p.act > 0 && !p.hit && p.act < .2) { p.hit = true; for (const v of s.vir) { if (v.hp <= 0 || v.state === 'fly') continue; const dx = v.x - p.x, dy = v.y - p.y; if (Math.hypot(dx, dy) < 50 && dx * p.face > -14) { v.hp--; v.hurt = .2; burst(v.x, v.y - 20, '#d0fff0', 10); shake = 2; const [a, r] = this.polar(v.x, v.y), na = a + (Math.random() < .5 ? -.35 : .35); v.x = RING.x + Math.cos(na) * r; v.y = RING.y + Math.sin(na) * r; v.state = 'off'; v.t = .9; if (v.hp <= 0) { burst(v.x, v.y - 20, '#ffd36b', 18); run.score += 60; tone(150, .14, 'square', .02); } } } }
  if (s.toSpawn > 0) { s.spawnT -= dt; if (s.spawnT <= 0) { s.spawnT = st.every; s.toSpawn--; const boss = s.bosses > 0 && s.toSpawn < 4; if (boss) s.bosses--; const a = Math.random() * Math.PI * 2, mid = (RING.rIn + RING.rOut) / 2 + (Math.random() - .5) * 30; s.vir.push({ a, x: RING.x + Math.cos(a) * mid, y: RING.y + Math.sin(a) * mid, fly: 1, state: 'fly', hp: boss ? 4 : st.hp, boss, t: 0, hurt: 0, walk: 0 }); } }
  for (const v of s.vir) {
   if (v.hp <= 0) continue; v.hurt = Math.max(0, v.hurt - dt); v.walk += dt * 6;
   if (v.state === 'fly') { v.fly -= dt * 1.2; if (v.fly <= 0) { v.state = 'on'; shake = 2; burst(v.x, v.y, '#c58cff', 8); } continue; }
   if (v.state === 'off') { v.t -= dt; if (v.t <= 0) v.state = 'on'; continue; }
   const [a] = this.polar(v.x, v.y), k = ((Math.floor(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * SEGS)) % SEGS + SEGS) % SEGS; v.seg = k;
   if (!s.hacked[k]) { s.seg[k] = Math.min(1, s.seg[k] + (v.boss ? .2 : .11) * dt); if (s.seg[k] >= 1) { s.hacked[k] = true; shake = 5; tone(100, .3, 'sawtooth', .03); toast('A section of the mtDNA was hacked! Its genes now work for the virus.', 3); } }
  }
  for (let k = 0; k < SEGS; k++) if (!s.hacked[k] && !s.vir.some(v => v.hp > 0 && v.state === 'on' && v.seg === k)) s.seg[k] = Math.max(0, s.seg[k] - .07 * dt);
  const hacked = s.hacked.filter(Boolean).length;
  if (hacked >= 4) { run.retries++; world.rewind = 1.4; toast('◀◀ REWIND — the mitochondrion was hacked and now powers the virus. Knock virions off before a section turns fully red.', 5); this.setup(s); return; }
  if (s.toSpawn <= 0 && !s.vir.some(v => v.hp > 0)) shooterStageClear(s);
 },
 atp(s) { let c = 0; for (let k = 0; k < SEGS; k++) c += s.hacked[k] ? 1 : s.seg[k] * .5; return 1 - c / 4; },
 hud(s) { return s.seg ? 'Hacked ' + s.hacked.filter(Boolean).length + '/4 · ATP to cell ' + Math.round(clamp(this.atp(s), 0, 1) * 100) + '%' : ''; },
 drawRing(s) {
  const g = ctx, { x, y, rIn, rOut } = RING, mid = (rIn + rOut) / 2;
  // the band: base pairs across the ring between two sugar-phosphate backbones
  g.fillStyle = '#2a1408'; g.beginPath(); g.arc(x, y, rOut + 6, 0, 7); g.arc(x, y, rIn - 6, 0, 7, true); g.fill();
  const N = 96; for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, k = Math.floor(i / N * SEGS), bad = s.seg ? s.seg[k] : 0, c = ['#ff5c6c', '#ffd23f', '#3ddc84', '#4aa3ff'][i % 4]; g.strokeStyle = c; g.globalAlpha = .55 + .3 * Math.sin(i * .7 + clock); g.lineWidth = 3.4; g.beginPath(); g.moveTo(x + Math.cos(a) * (rIn + 6), y + Math.sin(a) * (rIn + 6)); g.lineTo(x + Math.cos(a) * (rOut - 6), y + Math.sin(a) * (rOut - 6)); g.stroke(); }
  g.globalAlpha = 1;
  for (const [r0, ph] of [[rIn + 4, 0], [rOut - 4, Math.PI]]) { g.strokeStyle = '#c9d8ff'; g.lineWidth = 4; g.beginPath(); for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2, rr = r0 + Math.sin(a * 16 + ph) * 1.2; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.stroke(); }
  if (s.seg) for (let k = 0; k < SEGS; k++) { const v = s.hacked[k] ? 1 : s.seg[k]; if (v <= 0.01) continue; const a0 = k / SEGS * Math.PI * 2, a1 = (k + 1) / SEGS * Math.PI * 2; g.fillStyle = s.hacked[k] ? 'rgba(255,40,70,' + (.55 + .15 * Math.sin(clock * 6)) + ')' : 'rgba(255,60,90,' + v * .6 + ')'; g.beginPath(); g.arc(x, y, rOut, a0, a1); g.arc(x, y, rIn, a1, a0, true); g.closePath(); g.fill(); if (s.hacked[k]) { const am = (a0 + a1) / 2; text('HACKED', x + Math.cos(am) * mid, y + Math.sin(am) * mid + 3, 7, '#fff', 'center'); } }
  g.strokeStyle = '#06101e'; g.lineWidth = 1; for (let k = 0; k < SEGS; k++) { const a = k / SEGS * Math.PI * 2; g.beginPath(); g.moveTo(x + Math.cos(a) * rIn, y + Math.sin(a) * rIn); g.lineTo(x + Math.cos(a) * rOut, y + Math.sin(a) * rOut); g.stroke(); }
  text('mtDNA', x, y - 12, 12, '#ffd2a0', 'center'); text('circular · 37 genes', x, y + 6, 8, '#d8b090', 'center');
 },
 draw(s) {
  const g = ctx; const gr = g.createRadialGradient(320, 194, 30, 320, 194, 380); gr.addColorStop(0, '#5c230e'); gr.addColorStop(1, '#1a0904'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const R = dgSeeded(9); for (let i = 0; i < 160; i++) { g.fillStyle = '#b05a30'; g.globalAlpha = .3 + R() * .4; g.fillRect(R() * W, R() * H, 1.6, 1.6); } g.globalAlpha = 1;
  // cristae folds at the screen edges: we are inside the matrix
  for (let i = 0; i < 8; i++) { const top = i % 2 === 0, x = 30 + i * 82; g.fillStyle = '#f6b46e'; g.globalAlpha = .35; g.beginPath(); g.ellipse(x, top ? 0 : H, 13, 46, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
  this.drawRing(s);
  if (s.phase === 'card') { const st = MITO_STAGES[s.stage]; rect('#050c1aee', 90, 70, 460, 150); rect('#ffb470', 90, 70, 460, 3); text('STAGE ' + (s.stage + 1) + ' OF 3 · ' + st.guide[0], 320, 96, 11, '#ffd2a0', 'center'); st.guide.slice(1).forEach((l, i) => text(l, 320, 126 + i * 18, 9, '#e8f6ff', 'center')); text('Press Z, tap or click to start', 320, 196, 9, '#ffb470', 'center'); return; }
  if (!s.p) return; const p = s.p;
  const ents = [];
  for (const v of s.vir) { if (v.hp <= 0) continue; if (v.state === 'fly') { const k = v.fly, sx = v.x + Math.cos(v.a) * 140 * k, sy = v.y + Math.sin(v.a) * 140 * k - 120 * k; g.fillStyle = '#00000055'; g.beginPath(); g.ellipse(v.x, v.y, 12 * (1 - k * .5), 4, 0, 0, 7); g.fill(); ents.push({ y: sy, d: () => tdEnemy('miniphage', 3, sx, sy, 1, v.boss ? .62 : .42) }); continue; }
   ents.push({ y: v.y, d: () => { tdEnemy('miniphage', v.state === 'on' ? 2 + Math.floor(v.walk) % 2 : 0, v.x, v.y, v.x < RING.x ? 1 : -1, v.boss ? .62 : .42, v.hurt > 0 ? .5 : 1); if (v.state === 'on') { g.strokeStyle = 'rgba(255,60,90,' + (.5 + .4 * Math.sin(clock * 10)) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(v.x, v.y, 14, 0, 7); g.stroke(); } if (v.boss) { rect('#17233c', v.x - 16, v.y - 66, 32, 3); rect('#ff5d78', v.x - 16, v.y - 66, 32 * v.hp / 4, 3); } } }); }
  ents.push({ y: p.y, d: () => tdRanger(p.x, p.y, p.face, p.act > 0 ? (p.act > .22 ? 4 : p.act > .12 ? 6 : 7) : (keys.size || s.held ? [1, 2, 3][Math.floor(p.walk) % 3] : 0), .48) });
  ents.sort((a, b) => a.y - b.y).forEach(e => e.d());
  const k = clamp(this.atp(s), 0, 1); rect('#06101ecc', W - 236, H - 30, 228, 22); text('ATP →', W - 228, H - 15, 8, '#ffd2a0'); text('CELL', W - 190, H - 15, 8, '#9effc4'); rect('#ff5d78', W - 156, H - 23, 110, 8); rect('#9effc4', W - 156, H - 23, 110 * k, 8); text('VIRUS', W - 42, H - 15, 8, '#ffb0c0');
  if (s.held) shooterCrosshair(s, '#ffd2a0');
 }
};
