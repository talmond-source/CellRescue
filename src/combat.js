/* ---------- Combat zones with a job ----------
   Every combat zone keeps its three lockdown arenas, but each Ranger's fight now protects something real:
   reaction stations, a vesicle train, the DNA, an mRNA, a distress beacon, your own electrons.
   Rangers can't be hurt, so nothing here ends the run. If the thing you protect is lost, a soft fail
   rewinds the wave and gives a hint.

   Shared pieces:
   - guards: things enemies go after instead of you. An enemy with a target walks to it and drains its value.
     A guard regains value when nobody is draining it. Most guards trigger a soft fail at zero.
   - softFail: clears the wave, gives the guards some value back, and replays the wave with a hint.
   - each mode can hook: build, start, spawn, kill, hit, speed, update, ready, draw, front, floor, hud. */
const COMBAT={};
function combatMode(){return world&&world.style==='combat'&&world.mode||null;}
function tellOnce(key,msg,sec=4){if(!world.told)world.told={};if(world.told[key])return;world.told[key]=true;toast(msg,sec);}
const guardsIn=ar=>(world.guards||[]).filter(g=>g.arena===ar.index||g.arena==='any');
const nearestGuard=(e,ar)=>{const list=guardsIn(ar).filter(g=>!g.done&&(!g.car||g.car(e.x)));return list.sort((a,b)=>Math.abs(a.x-e.x)-Math.abs(b.x-e.x))[0]||null;};

/* called by buildCombat */
function setupCombatMode(w){const m=COMBAT[ranger.id];if(!m)return;w.mode=m;w.family=m.family;w.guards=[];w.arenas.forEach((ar,i)=>ar.index=i);if(m.build)m.build(w);}

/* an enemy that is going after a guard (returns true when it handled the enemy this frame) */
function combatEnemy(e,dt){
 const m=combatMode();if(!m||!e.target||e.hp<=0)return false;const g=e.target;
 if(g.done){e.target=null;e.siph=false;return false;}
 if(e.hurt>0){e.siph=false;return true;}
 if(e.state==='recover'){e.timer-=dt;if(e.timer>0)return true;e.state='approach';}
 const spot=g.x+(e.side||1)*(g.reach||20),dx=spot-e.x;
 if(Math.abs(dx)>6&&!(e.siph&&Math.abs(dx)<30)){e.siph=false;e.face=dx>0?1:-1;if(enemyStep(e,e.x+e.face*(e.family==='bacteria'?62:56)*dt))e.walk+=dt*9;else e.target=null;}
 else{e.siph=true;e.face=g.x>e.x?1:-1;e.state=Math.floor(e.clock*5)%2?'windup':'active';g.value=Math.max(0,g.value-(m.drain||8)*dt);g.drained=.15;}
 return true;}
/* engine hooks */
function combatHit(sourceX){const m=combatMode();if(m&&m.hit)m.hit(sourceX);}
function combatKill(e){const m=combatMode();if(m&&m.kill)m.kill(e);}
function combatSpeed(){const m=combatMode();return m&&m.speed?m.speed():1;}
function combatHUD(){const m=combatMode();return m&&m.hud?m.hud():'';}
function combatTerminalBlock(){const m=combatMode();return m&&m.terminalBlock?m.terminalBlock():null;}

/* arenas: start, spawn hooks, guards, soft fail and the finish */
function combatArenaStart(ar){const m=combatMode();if(m&&m.start)m.start(ar);}
function combatSpawned(e,n,ar){const m=combatMode();if(!m)return;
 if(m.spawn)m.spawn(e,n,ar);
 // enemies spawn alternately left and right, so thieves are picked in left/right pairs (n = 0,1 then 4,5 ...):
 // both sides of the arena get attacked, and each thief goes for the objective on its own side
 if(m.targetEvery&&!e.target&&n%(2*m.targetEvery)<2){const g=nearestGuard(e,ar);if(g){e.target=g;e.side=e.x<g.x?-1:1;}}}
function combatArenaUpdate(ar,dt){const m=combatMode();if(!m)return;
 for(const g of guardsIn(ar)){
  if(g.fail!==false&&g.value<=0&&!g.done){softFail(ar,m.failMsg||'Protect the objective.');return;}
  g.drained=Math.max(0,(g.drained||0)-dt);if(!g.drained&&!g.done)g.value=Math.min(g.max||100,g.value+(g.regen??3)*dt);}
 if(m.update)m.update(ar,dt);}
function softFail(ar,msg){
 for(const e of enemies)if(e.arena===ar&&e.hp>0){e.hp=0;e.removed=true;e.dead=.3;burst(e.x,e.y-25,'#ffffff',8);}
 if(player.latch)player.latch=null;
 ar.wave=Math.max(-1,ar.wave-1);ar.delay=1.8;run.retries++;
 for(const g of guardsIn(ar))g.value=Math.max(g.value,70);
 const m=combatMode();if(m&&m.rewind)m.rewind(ar);
 world.rewind=1.4;shake=6;tone(180,.4,'sawtooth',.03);toast('◀◀ REWIND — '+msg,5);}
function combatReady(ar){const m=combatMode();return !m||!m.ready||m.ready(ar);}
function finishArena(ar,i){ar.state='done';world.lock=null;revealCell(i);stamp((ar.a+ar.b)/2,'ARENA '+(i+1)+' CLEAR');toast('Arena clear — grab the '+CARGO[ranger.id][zone].toLowerCase());tone(660,.2,'triangle');}
function spawnInArena(ar,type,x,n=0){const e=makeEnemy(x,type);e.arena=ar;e.drop=-240-n*50;e.face=x>player.x?-1:1;enemies.push(e);combatSpawned(e,n,ar);return e;}

/* drawing helpers */
function guardBar(x,y,value,label,color,danger){const w=64;x-=camera;rect('#0a1426dd',x-w/2-2,y-2,w+4,9);rect(danger&&Math.floor(clock*6)%2?'#ff5d78':'#26364f',x-w/2,y,w,5);rect(color,x-w/2,y,w*clamp(value/100,0,1),5);text(label,x,y-5,7,'#e8f6ff','center');}
function drawSiphons(){for(const e of enemies){if(!e.siph||e.hp<=0||!e.target)continue;const g=e.target,x1=e.x-camera,y1=e.y-28,x2=g.x-camera,y2=(g.y||FLOOR-30);
 ctx.strokeStyle=Math.floor(clock*10)%2?'#ff5d78':'#ffb0c0';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.lineDashOffset=-clock*40;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);ctx.lineDashOffset=0;}}
function drawCombat(){const m=combatMode();if(!m)return;if(m.draw)m.draw();drawSiphons();}
function drawCombatFront(){const m=combatMode();if(!m)return;if(m.front)m.front();
 if(world.rewind>0){world.rewind-=1/60;const k=world.rewind/1.4;ctx.fillStyle='rgba(20,10,40,'+(.35*k)+')';ctx.fillRect(0,0,W,H);for(let y=0;y<H;y+=4){ctx.fillStyle='rgba(255,255,255,'+(.05*k)+')';ctx.fillRect(0,y+(clock*300%4),W,1);}text('◀◀ REWIND',W/2,H/2-30,22,'#ffffff','center');}}

/* ======================= 1. ATP: electron vampires ======================= */
COMBAT.atp={family:'radical',latch:true,
 line:'Free radicals are electron vampires. Each one is missing an electron and steals one from whatever it touches. They drain your energy and slow you down. Beat them to take it back, and grab vitamin C: antioxidants give up an electron so radicals stop stealing.',
 build(w){w.charge=100;w.antiox=[];},
 hit(sx){world.charge=Math.max(0,world.charge-12);for(let i=0;i<8;i++)particles.push({x:player.x,y:player.y-40,vx:(sx-player.x)*1.4+(Math.random()-.5)*40,vy:-30-Math.random()*40,life:.5,max:.5,color:'#7cf7df'});
  tellOnce('drain','A radical stole an electron! Low energy slows you down. Beat radicals to take it back.');},
 kill(e){world.charge=Math.min(100,world.charge+12);for(let i=0;i<8;i++)particles.push({x:e.x,y:e.y-30,vx:(player.x-e.x)*1.6,vy:-60,life:.55,max:.55,color:'#7cf7df'});},
 speed(){return .5+.5*world.charge/100;},
 start(ar){world.antiox.push({x:ar.index%2?ar.a+90:ar.b-90,arena:ar.index,taken:false,t:0});},
 update(ar,dt){const p=player;
  if(ar.wave>=1&&!world.antiox.some(a=>a.arena===ar.index&&a.wave===ar.wave))world.antiox.push({x:clamp(p.x>(ar.a+ar.b)/2?ar.a+100:ar.b-100,ar.a+60,ar.b-60),arena:ar.index,wave:ar.wave,taken:false,t:0});
  for(const a of world.antiox){if(a.taken||a.arena!==ar.index)continue;a.t+=dt;
   if(Math.abs(a.x-p.x)<26&&p.y>FLOOR-60){a.taken=true;world.charge=Math.min(100,world.charge+20);rings.push({x:p.x,y:p.y,life:.38});burst(p.x,p.y-40,'#ffb347',26);tone(880,.2,'triangle');
    for(const e of enemies)if(e.hp>0&&e.arena===ar&&Math.abs(e.x-p.x)<230&&e.drop===0){e.hp=1;damageEnemy(e,9,20);}
    toast('Vitamin C gave up an electron: the radicals nearby are stable and harmless now.',4);}}},
 draw(){for(const a of world.antiox){if(a.taken)continue;const x=a.x-camera,y=FLOOR-26+Math.sin(clock*4)*3;ctx.fillStyle='#ffb34755';ctx.beginPath();ctx.arc(x,y,15,0,7);ctx.fill();ctx.fillStyle='#ff9a1f';ctx.strokeStyle='#5a2a00';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,10,0,7);ctx.fill();ctx.stroke();text('C',x,y+4,11,'#fff6d8','center');text('VITAMIN C',x,y-20,7,'#ffd9a8','center');}},
 front(){const c=world.charge,x=W/2-90,y=H-24;rect('#0a1426dd',x-4,y-14,188,24);text('ELECTRONS',x,y-3,8,'#9ffcef');rect('#26364f',x+64,y-10,110,8);rect(c<35?(Math.floor(clock*6)%2?'#ff5d78':'#ffb0c0'):'#7cf7df',x+64,y-10,110*c/100,8);if(c<35)text('DRAINED · SLOWED',x+119,y+8,7,'#ffb0c0','center');},
 hud(){return 'Electrons '+Math.round(world.charge)+'%';}};

/* ======================= 3. Rough ER: kidnapped ribosomes ======================= */
COMBAT.rougher={family:'miniphage',
 line:'Virions are kidnapping our ribosomes to build viral proteins, and a factory is useless without its workers! Beat the captors, then lead each freed ribosome back to the ER dock.',
 build(w){w.docks=w.arenas.map((ar,i)=>({x:ar.b-64,arena:i,count:0}));w.freed=[];w.captives=0;},
 spawn(e,n){if(n===0){e.captive=true;world.captives++;}},
 kill(e){if(!e.captive)return;world.freed.push({x:e.x,y:FLOOR-34,arena:e.arena.index,state:'follow',t:0});burst(e.x,e.y-40,'#ffb38a',18);
  tellOnce('freed','Ribosome freed! It follows you. Lead it to the ER dock on the right.');},
 update(ar,dt){const p=player,dock=world.docks[ar.index];let k=0;
  for(const f of world.freed){if(f.arena!==ar.index||f.state!=='follow')continue;k++;f.t+=dt;const tx=p.x-p.face*(34+k*24);f.x+=(tx-f.x)*Math.min(1,dt*3);f.y=FLOOR-34-Math.abs(Math.sin(f.t*7))*8;
   if(Math.abs(f.x-dock.x)<40||Math.abs(p.x-dock.x)<56){f.state='docked';dock.count++;burst(dock.x,FLOOR-60,'#9effc4',20);tone(740,.15,'triangle');toast('Ribosome back on the ER: the factory is making proteins again.');}}},
 ready(ar){return !world.freed.some(f=>f.arena===ar.index&&f.state!=='docked');},
 waitMsg:'Lead the freed ribosomes to the ER dock',
 draw(){for(const d of world.docks){const x=d.x-camera;if(x<-80||x>W+80)continue;
   rect('#3a1424',x-34,FLOOR-70,78,70);rect('#ff8fb0',x-34,FLOOR-70,78,2);for(let i=0;i<4;i++)rect('#5a1e34',x-30+i*20,FLOOR-62,12,58);
   ctx.strokeStyle='#5a1830';ctx.lineWidth=10;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x-30,FLOOR-124+i*18);ctx.bezierCurveTo(x-10,FLOOR-136+i*18,x+10,FLOOR-112+i*18,x+40,FLOOR-124+i*18);ctx.stroke();}
   ctx.strokeStyle='#ff8fb0';ctx.lineWidth=6;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x-30,FLOOR-124+i*18);ctx.bezierCurveTo(x-10,FLOOR-136+i*18,x+10,FLOOR-112+i*18,x+40,FLOOR-124+i*18);ctx.stroke();}
   for(let i=0;i<d.count;i++){ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(moleculeIcon('ribosomeFree'),x-34+i*20,FLOOR-150+(i%2)*10,26,26);ctx.restore();}
   text('ER DOCK',x+5,FLOOR-158,8,'#ffc0d8','center');text('E R',x+5,FLOOR-30,9,'#ffc0d8','center');}
  for(const e of enemies){if(!e.captive||e.hp<=0)continue;const x=e.x-camera,y=e.y-78+Math.sin(clock*5+e.home)*3;ctx.strokeStyle='#d8c09a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,e.y-46);ctx.lineTo(x,y+10);ctx.stroke();ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(moleculeIcon('ribosomeFree'),x-15,y-15,30,30);ctx.restore();if(Math.floor(clock*2)%2)text('HELP!',x,y-18,7,'#ffd9a8','center');}
  for(const f of world.freed){if(f.state!=='follow')continue;const x=f.x-camera;ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(moleculeIcon('ribosomeFree'),x-15,f.y-15,30,30);ctx.restore();}},
 hud(){const back=world.docks.reduce((s,d)=>s+d.count,0);return 'Ribosomes rescued '+back+'/'+Math.max(back,world.captives);}};

/* ======================= 5. Cytoplasm: reaction thieves ======================= */
COMBAT.cytoplasm={family:'miniphage',targetEvery:2,drain:7,
 line:'Viruses are hijacking our chemical reactions like parasites. They clamp onto a reaction station and steal what it makes. Knock them off before a station runs dry.',
 failMsg:'a station ran dry. Knock viruses off the stations before they drain them.',
 build(w){const names=[['GLYCOLYSIS','glucose','Glycolysis splits glucose for energy'],['FREE RIBOSOME','aminoAcid','Free ribosomes build proteins'],['FATTY ACID SYNTHESIS','fattyAcid','Fatty acids for new membranes are built here']];
  w.arenas.forEach((ar,i)=>w.guards.push({x:ar.a+282,y:FLOOR-34,arena:i,value:100,regen:3,label:names[i][0],icon:names[i][1],fact:names[i][2]}));},
 start(ar){const g=guardsIn(ar)[0];if(g)tellOnce('st'+ar.index,g.fact+'. Viruses want to steal its output: protect it!');},
 draw(){for(const g of world.guards){const x=g.x-camera;if(x<-80||x>W+80)continue;const sick=g.value<40;
   rect('#0d2238',x-30,FLOOR-56,60,56);rect(sick?'#ff5d78':'#7cf7df',x-30,FLOOR-56,60,3);rect('#163a54',x-26,FLOOR-50,52,40);
   for(let i=0;i<3;i++){const ph=(clock*1.5+i/3)%1;ctx.globalAlpha=g.value/100;ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(moleculeIcon(g.icon),x-12+ph*30-15,FLOOR-44-ph*30,22,22);ctx.restore();ctx.globalAlpha=1;}
   ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(moleculeIcon('enzyme'),x-14,FLOOR-44,28,28);ctx.restore();
   guardBar(g.x,FLOOR-80,g.value,g.label+' OUTPUT',sick?'#ff9aa8':'#9effc4',sick);}},
 hud(){const ar=world.lock;if(!ar)return '';const g=guardsIn(ar)[0];return g?'Station output '+Math.round(g.value)+'%':'';}};

/* ======================= 6. Membrane: the distress beacon ======================= */
COMBAT.membrane={family:'miniphage',custom:true,drain:9,
 line:'Viruses that could not get through the membrane are piling up outside, and our distress beacon is buried under them. Clear the pad and keep it clear so the beacon can charge.',
 build(w){w.arenas.forEach((ar,i)=>w.guards.push({x:(ar.a+ar.b)/2,y:FLOOR-60,arena:i,value:0,regen:13,fail:false,beacon:true,reach:16}));},
 start(ar){ar.spawnT=.4;tellOnce('bcn'+ar.index,ar.index<2?'Signal relay '+(ar.index+1)+' of 3. Keep viruses off the pad and it charges by itself.':'The main beacon! Fill it and the cell fires a distress flare for help.',4);},
 update(ar,dt){const g=guardsIn(ar)[0];if(!g)return;
  if(ar.flare!=null){ar.flare+=dt;const t=ar.flare;
   if(ar.index<2){if(t>.6){for(const e of enemies)if(e.arena===ar&&e.hp>0){e.hp=1;damageEnemy(e,9,30);}finishArena(ar,ar.index);}return;}
   // the macrophage crawls in and swallows the swarm
   for(const e of enemies)if(e.arena===ar&&e.hp>0&&t>2.4&&macroX(ar)<e.x+40){e.hp=0;e.removed=true;e.dead=.01;e.eaten=1;burst(e.x,e.y-24,'#ffd36b',10);}
   if(t>2.4&&t<2.5)toast('A macrophage answered the distress signal! Macrophages engulf viruses outside the cell.',5);
   if(t>6.4)finishArena(ar,ar.index);return;}
  const alive=enemies.filter(e=>e.arena===ar&&e.hp>0);ar.spawnT-=dt;
  if(ar.spawnT<=0&&alive.length<3+ar.index){const left=Math.random()<.5;spawnInArena(ar,Math.floor(Math.random()*3),left?ar.a+40+Math.random()*60:ar.b-40-Math.random()*60,alive.length);ar.spawnT=2.6-ar.index*.4;}
  if(g.value>=100){ar.flare=0;g.done=true;for(const e of enemies)if(e.arena===ar)e.target=null;
   if(ar.index<2){rings.push({x:g.x,y:FLOOR,life:.38});burst(g.x,FLOOR-80,'#9effc4',40);tone(980,.3,'triangle');toast('Relay '+(ar.index+1)+' lit! Its signal pulse knocks the viruses back.');}
   else{tone(520,.6,'sawtooth',.03);toast('Beacon charged: the cell fires a chemical distress flare (a chemokine)!',4);}}},
 spawn(e,n){if(n%2===0){const g=guardsIn(e.arena)[0];if(g&&!g.done){e.target=g;e.side=n%4?-1:1;}}},
 draw(){for(const g of world.guards){const x=g.x-camera;if(x<-90||x>W+90)continue;const lit=g.done;
   rect('#2a1440',x-46,FLOOR-8,92,8);rect(lit?'#9effc4':'#ff8fb0',x-46,FLOOR-9,92,2);
   rect('#14233a',x-6,FLOOR-80,12,72);rect(lit?'#9effc4':'#7c8aa8',x-4,FLOOR-78,8,70);
   ctx.fillStyle=lit?'#9effc4':'rgba(255,211,107,'+(.3+.7*g.value/100)+')';ctx.beginPath();ctx.arc(x,FLOOR-88,11+(g.value/100)*4*Math.sin(clock*8)**2,0,7);ctx.fill();
   if(!lit)guardBar(g.x,FLOOR-118,g.value,g.arena<2?'RELAY '+(g.arena+1)+' CHARGE':'DISTRESS BEACON',g.drained>0?'#ffb0c0':'#ffd36b',g.drained>0);
   if(!lit&&g.drained>0&&Math.floor(clock*3)%2)text('PAD BLOCKED!',x,FLOOR-132,8,'#ff9aa8','center');}},
 front(){const ar=world.lock;if(!ar||ar.index!==2||ar.flare==null)return;const t=ar.flare,g=guardsIn(ar)[0],gx=g.x-camera;
  if(t<2.4){const y=FLOOR-90-t*180;ctx.fillStyle='#ffd36b';ctx.beginPath();ctx.arc(gx,y,6,0,7);ctx.fill();for(let i=0;i<6;i++)rect('#ff9a4a',gx-2+(Math.random()-.5)*6,y+8+i*8,3,6);if(t>1.2){ctx.globalAlpha=Math.min(1,(t-1.2)*2)*.5;ctx.fillStyle='#ffd36b';ctx.beginPath();ctx.arc(gx,20,30+(t-1.2)*60,0,7);ctx.fill();ctx.globalAlpha=1;}}
  else drawMacrophage(macroX(ar)-camera,t);},
 hud(){const ar=world.lock;if(!ar)return '';const g=guardsIn(ar)[0];return g?(ar.index<2?'Relay ':'Beacon ')+Math.round(g.value)+'%':'';}};
const macroX=ar=>{const t=ar.flare-2.4;return t<2.2?ar.b+200-t*170:t<3?ar.b+200-2.2*170:ar.b+200-2.2*170+(t-3)*260;};
function drawMacrophage(x,t){ctx.save();const R=150,y=FLOOR-90;
 ctx.fillStyle='rgba(255,224,150,.88)';ctx.strokeStyle='#8a5a1a';ctx.lineWidth=4;ctx.beginPath();
 for(let i=0;i<=40;i++){const a=i/40*Math.PI*2,wob=Math.sin(a*5+t*3)*12+(Math.cos(a)<-.5?Math.sin(t*4+a*3)*30:0);ctx.lineTo(x+Math.cos(a)*(R+wob),y+Math.sin(a)*(R*.7+wob));}ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle='#b07ad8';ctx.strokeStyle='#4a2a6a';ctx.beginPath();ctx.ellipse(x+40,y-10,46,34,.3,0,7);ctx.fill();ctx.stroke();
 for(let i=0;i<7;i++){ctx.fillStyle='#d26a8a';ctx.beginPath();ctx.arc(x-60+i*22,y+40+Math.sin(i*2)*14,6,0,7);ctx.fill();}
 text('MACROPHAGE',x,y-R*.7-14,12,'#fff2c8','center');ctx.restore();}

/* ======================= 4. Golgi: the vesicle train ======================= */
const TRAIN_GAP=36;
COMBAT.golgi={family:'bacteria',targetEvery:2,drain:7,bgSpeed:150,
 line:'The vesicle train is leaving the Golgi, pulled by a motor protein along a microtubule. Bacteria are robbing it! (Some bacteria, like Listeria, really do live inside cells.) Run the roofs, jump the gaps, and knock them off before they pry a vesicle open.',
 failMsg:'bacteria pried a vesicle open. Knock them off the hatches.',
 build(w){w.gaps=[];w.arenas.forEach((ar,i)=>{w.gaps.push([ar.a+262,ar.a+262+TRAIN_GAP]);w.guards.push({x:ar.a+140,y:FLOOR-30,arena:i,value:100,regen:2,hatch:true,cargo:['vesicleOrange','vesicleGold','vesicleOrange'][i]},{x:ar.a+420,y:FLOOR-30,arena:i,value:100,regen:2,hatch:true,cargo:['vesicleGold','vesicleOrange','vesicleGold'][i]});
   if(i<2)w.gaps.push([ar.b+50,ar.b+50+TRAIN_GAP]);});
  w.gaps.push([w.length-300,w.length-300+TRAIN_GAP]);
  for(const g of w.guards){const gap=w.gaps.filter(([a])=>a<g.x).pop(),next=w.gaps.find(([a])=>a>g.x);g.car=x=>x>(gap?gap[1]:0)&&x<(next?next[0]:1e9);}},
 floor(){const segs=[];let from=0;for(const [a,b] of [...world.gaps].sort((x,y)=>x[0]-y[0])){segs.push([from,a]);from=b;}segs.push([from,world.length]);
  for(const [a,b] of segs){const x=a-camera,w=b-a;if(x>W||x+w<0)continue;
   ctx.fillStyle='#2a3a5a';ctx.beginPath();ctx.roundRect?ctx.roundRect(x+2,FLOOR,w-4,46,10):ctx.rect(x+2,FLOOR,w-4,46);ctx.fill();
   rect('#9fd8ff',x+4,FLOOR,w-8,3);rect('#c46a2c',x+4,FLOOR+3,w-8,3);for(let k=24;k<w-24;k+=48){rect('#0d1a2e',x+k,FLOOR+14,26,16);rect('#4aa3ff33',x+k+2,FLOOR+16,22,12);}
   for(let k=30;k<w-20;k+=60){const ph=Math.sin(clock*14+k);ctx.strokeStyle='#ffd36b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+k-6+ph*4,H-6);ctx.lineTo(x+k,FLOOR+44);ctx.lineTo(x+k+6-ph*4,H-6);ctx.stroke();}}
  for(let x=-((clock*150+camera)%12);x<W;x+=12){rect(((x+clock*150+camera)/12|0)%2?'#3ddc84':'#9effc4',x,H-6,12,4);}
  for(let i=0;i<10;i++){const y=60+(i*37)%200,x=W-((clock*600+i*170)%(W+200));rect('#ffffff22',x,y,80,1);}},
 draw(){for(const g of world.guards){const x=g.x-camera;if(x<-80||x>W+80)continue;const open=g.value<35;
   ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(moleculeIcon(g.cargo),x-22,FLOOR-48,44,44);ctx.restore();
   rect('#0d1a2e',x-26,FLOOR-6,52,6);rect(open?'#ff5d78':'#9fd8ff',x-26,FLOOR-7,52,2);
   guardBar(g.x,FLOOR-70,g.value,'VESICLE SEAL',open?'#ff9aa8':'#ffd36b',open);}
  rect('#06101ecc',8,H-22,190,13);text('MICROTUBULE TRACK → CELL MEMBRANE',103,H-12,7,'#9effc4','center');},
 hud(){const ar=world.lock;if(!ar)return 'Vesicle train';const gs=guardsIn(ar);return 'Vesicle seals '+gs.map(g=>Math.round(g.value)+'%').join(' · ');}};

/* ======================= 11. DNA: integration siege + UV storm ======================= */
COMBAT.dna={family:'retrovirus',targetEvery:2,drain:7,
 line:'Retroviruses are trying to splice their own genes into our DNA, the way HIV does. Knock them off the integration sites before a viral gene gets written in. Watch the sky later: UV light can fuse two T bases and buckle the DNA.',
 failMsg:'a viral gene was written into the DNA. Knock retroviruses off the integration sites.',
 build(w){w.arenas.forEach((ar,i)=>{w.guards.push({x:ar.a+170,y:FLOOR-6,arena:i,value:100,regen:4,site:true,reach:18});if(i>0)w.guards.push({x:ar.a+400,y:FLOOR-6,arena:i,value:100,regen:4,site:true,reach:18});});w.kinks=[];w.uv=[];},
 start(ar){if(ar.index===2){ar.uvT=2.5;tellOnce('uv','UV storm incoming! UV light fuses neighbouring T bases into a thymine dimer and buckles the DNA. Punch a buckle to repair it.',5);}},
 update(ar,dt){const p=player;
  if(ar.index===2&&ar.wave<ar.waves.length){ar.uvT-=dt;if(ar.uvT<=0&&world.kinks.filter(k=>k.arena===2).length<3){ar.uvT=5.5;world.uv.push({x:clamp(p.x+(Math.random()-.5)*260,ar.a+50,ar.b-50),t:1.1,arena:2});}}
  for(const u of world.uv){u.t-=dt;if(u.t<=0&&!u.hit){u.hit=true;world.kinks.push({x:u.x,arena:u.arena});shake=4;burst(u.x,FLOOR-6,'#c58cff',20);tone(150,.25,'square',.03);}}
  world.uv=world.uv.filter(u=>u.t>-.3);
  const a=p.action;if(a&&a.hit&&!a.kinkChecked&&a.kind!=='shoot'){a.kinkChecked=true;const reach=p.x+p.face*36;const k=world.kinks.find(k=>Math.abs(k.x-reach)<48);if(k){world.kinks.splice(world.kinks.indexOf(k),1);burst(k.x,FLOOR-8,'#9effc4',18);tone(760,.14,'triangle');toast('Repaired! Repair enzymes cut out the fused T T and rebuild that stretch.');}}},
 speed(){return world.kinks.some(k=>Math.abs(k.x-player.x)<30)?.45:1;},
 ready(ar){return !world.kinks.some(k=>k.arena===ar.index);},
 waitMsg:'Punch the buckled DNA to repair the thymine dimers',
 floor(){const y=FLOOR;for(let x=-(camera%24);x<W;x+=24){const wx=x+camera,kink=world.kinks.find(k=>Math.abs(k.x-wx)<22),dy=kink?-8:0;
   rect(['#ff5c6c','#ffd23f','#3ddc84','#4aa3ff'][((wx/24)|0)&3],x+9,y+6+dy,6,26);rect(['#4aa3ff','#3ddc84','#ffd23f','#ff5c6c'][((wx/24)|0)&3],x+9,y+32+dy,6,22);}
  rect('#c9d8ff',0,y,W,6);rect('#6a7fb8',0,y+5,W,2);rect('#c9d8ff',0,H-6,W,6);
  for(const k of world.kinks){const x=k.x-camera;ctx.strokeStyle='#c58cff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x-26,y+2);ctx.lineTo(x-8,y-12);ctx.lineTo(x+8,y-12);ctx.lineTo(x+26,y+2);ctx.stroke();text('T=T',x,y-18,9,Math.floor(clock*4)%2?'#e6c8ff':'#c58cff','center');}},
 draw(){for(const g of world.guards){const x=g.x-camera;if(x<-60||x>W+60)continue;const danger=g.value<40;rect(danger?'#ff5d7866':'#ffd36b44',x-18,FLOOR-2,36,10);text('◆',x,FLOOR+2,10,danger?'#ff5d78':'#ffd36b','center');
   guardBar(g.x,FLOOR-74,100-g.value,'VIRAL GENE INSERTING',danger?'#ff5d78':'#ff9aa8',danger);}
  for(const u of world.uv){if(u.hit)continue;const x=u.x-camera;ctx.fillStyle='rgba(197,140,255,'+(.15+.25*Math.floor(clock*8)%2)+')';ctx.fillRect(x-22,0,44,FLOOR);text('UV!',x,40,10,'#e6c8ff','center');}},
 hud(){const ar=world.lock;if(!ar)return 'DNA bridge';const gs=guardsIn(ar),k=world.kinks.filter(k=>k.arena===ar.index).length;return 'Integration '+Math.round(100-Math.min(...gs.map(g=>g.value)))+'%'+(k?' · Dimers '+k:'');}};

/* ======================= 12. RNA: the poly-A tail run ======================= */
COMBAT.rna={family:'miniphage',targetEvery:2,drain:6,
 line:'Escort this mRNA from the nuclear pore to a ribosome. Its poly-A tail is its clock: it shortens over time, and viruses chew it when they reach it. The longer the tail, the longer the message lasts. Keep them off it!',
 failMsg:'the poly-A tail ran out and the mRNA broke down. Keep viruses off the message.',
 build(w){w.mrna={x:120,y:FLOOR-24,arena:'any',value:100,regen:0,fail:false,reach:26,delivered:false,max:100};w.guards.push(w.mrna);w.ribosomeX=w.length-260;},
 tick(dt){this.move(dt);},
 update(ar,dt){const m=world.mrna;if(m.value<=0){m.value=0;softFail(ar,this.failMsg);m.value=70;}},
 rewind(){world.mrna.value=Math.max(world.mrna.value,70);},
 move(dt){const m=world.mrna,p=player;if(m.delivered)return;
  m.value=Math.max(0,m.value-.35*dt);
  const chewed=enemies.some(e=>e.siph&&e.target===m&&e.hp>0);let limit=Math.min(world.ribosomeX,p.x+90);
  for(const ar of world.arenas)if(ar.state!=='done'&&m.x<ar.b)limit=Math.min(limit,ar.state==='fight'?ar.b-70:ar.a+40);
  if(!chewed&&m.x<limit)m.x=Math.min(limit,m.x+42*dt);
  if(m.x>=world.ribosomeX-2){m.delivered=true;m.done=true;burst(m.x,FLOOR-40,'#9effc4',30);tone(880,.3,'triangle');toast('Delivered! The ribosome is reading the mRNA and building its protein.',4);}},
 terminalBlock(){return world.mrna.delivered?null:'Bring the mRNA to the ribosome first';},
 draw(){const m=world.mrna,x=m.x-camera,y=FLOOR-26;
  // nuclear pore at the start, ribosome at the end
  const px=60-camera;if(px>-80){ctx.strokeStyle='#7c4fd0';ctx.lineWidth=12;ctx.beginPath();ctx.arc(px,FLOOR,70,Math.PI,0);ctx.stroke();text('NUCLEAR PORE',px,FLOOR-82,8,'#d8c4ff','center');}
  const rx=world.ribosomeX-camera;if(rx<W+80){ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(moleculeIcon('ribosomeFree'),rx-10,FLOOR-96,96,96);ctx.restore();text('RIBOSOME',rx+38,FLOOR-104,9,'#ffd9a8','center');}
  const cod=['#ff5c6c','#ffd23f','#3ddc84','#4aa3ff','#c58cff','#ff9f43'];
  ctx.fillStyle='#ff5c6c';ctx.beginPath();ctx.arc(x+46,y,7,0,7);ctx.fill();text("5'",x+46,y-10,7,'#ffd0d6','center');
  for(let i=0;i<6;i++){rect(cod[i],x+34-i*13,y-5+Math.sin(clock*4+i)*2,12,10);}
  const tail=Math.round(m.value/100*8);for(let i=0;i<tail;i++)text('A',x-46-i*9,y+4+Math.sin(clock*5+i)*2,9,'#ffd36b','center');
  text('mRNA',x,y-16,8,'#e8f6ff','center');
  guardBar(m.x,FLOOR-74,m.value,'POLY-A TAIL',m.value<30?'#ff9aa8':'#ffd36b',m.value<30);},
 hud(){return world.mrna.delivered?'mRNA delivered':'Poly-A tail '+Math.round(world.mrna.value)+'%';}};
