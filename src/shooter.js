/* ---------- First-person shooter zones: Ribosome and Mitosis ----------
   A fixed-position first-person view. Targets come toward you from the far end of a tunnel.
   Aim with the mouse, the arrow keys or the touch D-pad; fire with a click, Z / Space, or the B button.
   On a touchscreen, tapping a spot aims and fires there.
   Three stages, each worth one mission capsule; then the station's bio-scan, then the next zone.
   Rangers can't lose: if too much gets through, a soft fail rewinds the stage with a hint.

   Ribosome: read an mRNA on a real codon wheel (center out) to build an interferon missile.
             Each missile loads rockets; run out and you translate another one.
   Mitosis:  a growth switch is stuck ON (an oncogene). Laser the tumor cells, spare the healthy ones. */
const SHOOTERS={};
const SH_HOR=150,SH_GROUND=300;
function shProj(lx,z){const p=clamp(1-z,0,1.2);return {x:320+lx*(30+300*p),y:SH_HOR+(SH_GROUND-SH_HOR)*p,s:.16+1.55*p*p,p};}
function shooterSetup(w){const def=SHOOTERS[ranger.id];if(!def)return false;
 w.arenas=[];w.platforms=[];w.gaps=[];
 w.shooter={def,kind:ranger.id,stage:0,phase:'intro',aim:{x:320,y:190},targets:[],shots:[],fx:[],breaches:0,ammo:0,t:0,mistakes:0,hold:{},beam:null};
 w.mode={line:def.line,hud:()=>shooterHUD()};shooterPointer();def.stageIntro(w.shooter,0);return true;}
function shooterHUD(){const s=world.shooter;if(!s)return '';return 'Stage '+Math.min(3,s.stage+1)+'/3'+(s.def.hud?' · '+s.def.hud(s):'');}

/* pointer: aim follows the mouse; a click or a tap fires (or picks on the codon wheel) */
let shPointerOn=false;
function shooterPointer(){if(shPointerOn||!canvas.addEventListener)return;shPointerOn=true;
 const at=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};};
 canvas.addEventListener('pointermove',e=>{const s=world?.shooter;if(!s||mode!=='play')return;const p=at(e);s.aim.x=p.x;s.aim.y=p.y;s.pointer=true;});
 canvas.addEventListener('pointerdown',e=>{const s=world?.shooter;if(!s||mode!=='play')return;e.preventDefault();const p=at(e);s.aim.x=p.x;s.aim.y=p.y;s.pointer=true;s.held=true;shooterPress(s,true);});
 for(const n of ['pointerup','pointercancel','pointerleave'])canvas.addEventListener(n,()=>{const s=world?.shooter;if(s)s.held=false;});}
function shooterPress(s,byPointer){if(s.phase==='intro'||s.phase==='card'){s.def.begin(s);return;}if(s.phase==='station'){openMissionPuzzle();return;}if(s.def.press)s.def.press(s,byPointer);}

function shooterStep(dt){const s=world.shooter;s.t+=dt;
 if(world.terminal.done){loadZone(zone+1);return;}
 // arrow keys / D-pad move the crosshair (the codon wheel uses them to pick instead)
 if(s.def.control){if(s.phase==='fight')s.def.control(s,dt);}
 else if(!s.def.keysPick||s.phase!=='build'){const mx=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')),my=Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp'));if(mx||my){s.pointer=false;s.aim.x=clamp(s.aim.x+mx*330*dt,16,W-16);s.aim.y=clamp(s.aim.y+my*330*dt,30,H-20);}}
 else s.def.keysPick(s,dt);
 if(taps.has('KeyZ')||taps.has('Space')||taps.has('KeyX')||(taps.has('KeyE')&&s.phase==='station'))shooterPress(s,false);
 s.def.update(s,dt);s.hudT=(s.hudT||0)-dt;if(s.hudT<=0){s.hudT=.25;updateHUD();}
 for(const f of s.fx)f.t+=dt;s.fx=s.fx.filter(f=>f.t<f.dur);
 for(const m of particles){m.life-=dt;m.x+=m.vx*dt;m.y+=m.vy*dt;m.vy+=250*dt;}particles=particles.filter(m=>m.life>0);shake=Math.max(0,shake-dt*22);}
function shooterStageClear(s){const c=world.cells[s.stage];if(c&&!c.taken){c.taken=true;c.hidden=false;run.score+=300;const [name,,fact]=MOLECULES[ranger.id][zone];toast(name+' '+(s.stage+1)+'/3 — '+fact,4);}
 tone(660,.2,'triangle');s.stage++;s.targets=[];s.shots=[];s.breaches=0;
 if(s.stage>=3){s.phase='station';toast('All three stages clear! Fire (or press E) to run the station bio-scan.',5);}else{s.phase='card';s.def.stageIntro(s,s.stage);}updateHUD();}
function shooterBreach(s,why){s.breaches++;shake=8;s.fx.push({kind:'flash',t:0,dur:.35,color:'#ff2d55'});tone(110,.25,'sawtooth',.03);
 if(s.breaches>=3){run.retries++;s.def.rewind(s);s.breaches=0;world.rewind=1.4;toast('◀◀ REWIND — '+why,5);}else toast('Breach '+s.breaches+'/3 — '+why,3);updateHUD();}

/* ---------- drawing ---------- */
function shooterBackdrop(rgb){const g=ctx;
 if(environment&&environment.width){const bgW=H*environment.width/environment.height;g.globalAlpha=.4;g.drawImage(environment,(W-bgW)/2,0,bgW,H);g.globalAlpha=1;}
 const grd=g.createRadialGradient(320,SH_HOR,8,320,SH_HOR,430);grd.addColorStop(0,'rgba(8,16,34,.15)');grd.addColorStop(1,'rgba(4,7,18,.9)');g.fillStyle=grd;g.fillRect(0,0,W,H);
 for(let i=0;i<9;i++){const z=1-((i/9+clock*.09)%1),q=shProj(0,z),rw=30+300*q.p+40,rh=(q.y-SH_HOR)+60*q.p+14;g.strokeStyle='rgba('+rgb+','+(.08+.3*q.p)+')';g.lineWidth=1+2*q.p;g.beginPath();g.ellipse(320,SH_HOR+(q.y-SH_HOR)*.35,rw,rh,0,0,7);g.stroke();}
 g.strokeStyle='rgba('+rgb+',.18)';g.lineWidth=1;for(let i=-6;i<=6;i++){g.beginPath();g.moveTo(320,SH_HOR);g.lineTo(320+i*120,H);g.stroke();}}
function shooterCrosshair(s,color){const {x,y}=s.aim,k=1+.15*Math.sin(clock*8);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,11*k,0,7);ctx.moveTo(x-20,y);ctx.lineTo(x-7,y);ctx.moveTo(x+7,y);ctx.lineTo(x+20,y);ctx.moveTo(x,y-20);ctx.lineTo(x,y-7);ctx.moveTo(x,y+7);ctx.lineTo(x,y+20);ctx.stroke();rect('#ffffff',x-1,y-1,2,2);}
function shooterDraw(){const s=world.shooter;s.def.draw(s);
 for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);rect(p.color,p.x,p.y,3,3);}ctx.globalAlpha=1;
 for(const f of s.fx)if(f.kind==='flash'){ctx.fillStyle=f.color;ctx.globalAlpha=.35*(1-f.t/f.dur);ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
 // breaches and stage pips
 rect('#06101ecc',8,H-30,s.def.noBreach?72:206,22);for(let i=0;i<3;i++){ctx.strokeStyle='#9fffea';ctx.lineWidth=2;ctx.beginPath();ctx.arc(22+i*20,H-19,6,0,7);ctx.stroke();if(world.cells[i]?.taken){ctx.fillStyle=ranger.color;ctx.fill();}}
 if(!s.def.noBreach){text('BREACH',92,H-15,8,'#ffb0c0');for(let i=0;i<3;i++)rect(i<s.breaches?'#ff2d55':'#26364f',140+i*22,H-23,16,8);}
 if(s.phase==='station'){shooterCard(['ALL THREE STAGES CLEAR','Fire, tap or press E to run the station bio-scan.'],'#9effc4');}
 if(world.rewind>0){world.rewind-=1/60;const k=world.rewind/1.4;ctx.fillStyle='rgba(20,10,40,'+(.35*k)+')';ctx.fillRect(0,0,W,H);text('◀◀ REWIND',W/2,H/2-30,22,'#ffffff','center');}}
function shooterCard(lines,color,y=110){const w=Math.max(...lines.map((l,i)=>(i?7.2:10)*l.length))+40,h=30+lines.length*18;rect('#06101ef0',W/2-w/2,y,w,h);rect(color,W/2-w/2,y,w,3);lines.forEach((l,i)=>text(l,W/2,y+26+i*18,i?9:12,i?'#e8f6ff':color,'center'));}
function wrapText(str,max){const out=[''];for(const w of str.split(' ')){if((out.at(-1)+' '+w).trim().length>max)out.push(w);else out[out.length-1]=(out.at(-1)+' '+w).trim();}return out;}

/* ======================= RIBOSOME: codon wheel → interferon missile ======================= */
const AA_LETTERS='FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';   // the standard genetic code, bases in U C A G order
const AA_NAMES={F:'Phe',L:'Leu',S:'Ser',Y:'Tyr','*':'STOP',C:'Cys',W:'Trp',P:'Pro',H:'His',Q:'Gln',R:'Arg',I:'Ile',M:'Met',T:'Thr',N:'Asn',K:'Lys',V:'Val',A:'Ala',D:'Asp',E:'Glu',G:'Gly'};
const BASES='UCAG';
const WHEEL=(()=>{const codons=[];for(let i=0;i<64;i++)codons.push({codon:BASES[i>>4]+BASES[(i>>2)&3]+BASES[i&3],aa:AA_LETTERS[i]});
 const groups=[];for(let i=0;i<64;i++){const g=groups.at(-1);if(g&&g.aa===codons[i].aa&&(g.start>>2)===(i>>2))g.end=i;else groups.push({start:i,end:i,aa:codons[i].aa});}
 return {codons,groups,aaOf:c=>codons.find(x=>x.codon===c)?.aa};})();
const WH={x:178,y:196,r:[0,30,60,90,134]};
const whAng=i=>-Math.PI/2+i*Math.PI*2/64;
function wheelGroupAt(x,y){const dx=x-WH.x,dy=y-WH.y,d=Math.hypot(dx,dy);if(d<WH.r[1]||d>WH.r[4]+6)return -1;let a=Math.atan2(dy,dx)+Math.PI/2;if(a<0)a+=Math.PI*2;const i=Math.floor(a/(Math.PI*2/64))%64;return WHEEL.groups.findIndex(g=>i>=g.start&&i<=g.end);}
const MISSILES=[
 [['AUG','ACU','AAU','AAA','UAA'],['AUG','ACC','AAC','AAG','UGA']],
 [['AUG','ACA','AAU','AAA','UGU','CUU','UAG'],['AUG','ACG','AAC','AAG','UGC','CUC','UAA']],
 [['AUG','ACU','AAC','AAA','UGU','UUA','CUG','CAA','UGA'],['AUG','ACC','AAU','AAG','UGC','CUA','CUU','CAG','UAA']]];
const RIBO_WAVES=[{count:8,every:1.5,speed:.1,zig:0},{count:12,every:1.05,speed:.12,zig:.35},{count:22,wall:true,speed:.055,zig:.15}];
SHOOTERS.ribosome={
 line:'A swarm of virions is massing to swamp the cell! Infected cells really do fight back with a protein called interferon. Read the mRNA on the codon wheel to build an interferon missile, then fire it at the swarm.',
 stageIntro(s,i){s.phase='card';s.card=[['STAGE '+(i+1)+' OF 3',i===2?'THE WAVE: the swarm comes all at once':i===1?'Faster virions, weaving as they come':'Virions incoming'],'Build an interferon missile first: read each codon on the wheel, from the center out.'];s.builds=0;},
 begin(s){s.phase='build';this.newBuild(s);this.spawnWave(s);},
 newBuild(s){const v=MISSILES[s.stage][s.builds%2];s.build={seq:v,pos:0,sel:s.build?.sel??0,wrong:0,chain:[],shake:0,done:0};s.builds++;s.phase='build';},
 spawnWave(s){const w=RIBO_WAVES[s.stage];s.targets=[];s.spawnT=0;s.toSpawn=w.wall?0:w.count;
  if(w.wall)for(let i=0;i<w.count;i++)s.targets.push({lx:-.9+(i%8)*.26+((i>>3)%2)*.12,z:1+((i>>3))*.06,hp:1,ph:i,zig:w.zig,speed:w.speed});},
 rewind(s){this.spawnWave(s);s.ammo=Math.max(s.ammo,6);},
 keysPick(s,dt){const b=s.build;for(const [k,d] of [['ArrowRight',1],['ArrowLeft',-1]]){if(keys.has(k)){s.hold[k]=(s.hold[k]||0)+dt;if(taps.has(k)||s.hold[k]>.35&&(s.hold[k]-.35)%.1<dt){b.sel=(b.sel+d+WHEEL.groups.length)%WHEEL.groups.length;s.pointer=false;tone(500,.03,'square',.01);}}else s.hold[k]=0;}
  for(const [k,d] of [['ArrowDown',1],['ArrowUp',-1]])if(taps.has(k)){const q=(WHEEL.groups[b.sel].start>>4),nq=(q+d+4)%4;b.sel=WHEEL.groups.findIndex(g=>g.start>>4===nq);s.pointer=false;tone(420,.03,'square',.01);}},
 press(s,byPointer){if(s.phase==='build'){const b=s.build;if(b.done)return;
   if(byPointer||s.pointer){const g=wheelGroupAt(s.aim.x,s.aim.y);if(g<0)return;b.sel=g;}
   const want=WHEEL.aaOf(b.seq[b.pos]),got=WHEEL.groups[b.sel].aa;
   if(got===want){b.chain.push(want);b.pos++;b.wrong=0;tone(560+b.pos*60,.08,'triangle');
    if(want==='*'){b.done=.01;tone(880,.3,'triangle');toast('STOP codon: the ribosome releases the finished interferon. Missile loaded!',3);}}
   else{b.wrong++;b.shake=.3;s.mistakes++;tone(110,.15,'sawtooth',.03);const c=b.seq[b.pos];
    toast(b.wrong===1?'Not '+AA_NAMES[got]+'. Start at the center: find the 1st letter, '+c[0]+'.':b.wrong===2?'Inner ring '+c[0]+', then the 2nd letter, '+c[1]+', in the middle ring.':'Then the 3rd letter, '+c[2]+', on the outer ring: '+c+' codes for '+AA_NAMES[want]+'.',4);}
   return;}
  if(s.phase==='fight'){if(s.ammo<=0){toast('Out of interferon! Translate another missile.');return;}s.ammo--;s.shots.push({x0:320,y0:H-30,x1:s.aim.x,y1:s.aim.y,t:0,dur:.22});tone(300,.12,'sawtooth',.02);updateHUD();}},
 update(s,dt){
  if(s.phase==='build'){const b=s.build;b.shake=Math.max(0,b.shake-dt);if(s.pointer){const g=wheelGroupAt(s.aim.x,s.aim.y);if(g>=0)b.sel=g;}
   if(b.done){b.done+=dt;if(b.done>1.3){s.ammo+=12;s.phase='fight';toast('Fire interferon at the virions! (aim and click, or arrows + Z)',3);updateHUD();}}return;}
  if(s.phase!=='fight')return;const w=RIBO_WAVES[s.stage];
  if(s.toSpawn>0){s.spawnT-=dt;if(s.spawnT<=0){s.spawnT=w.every;s.toSpawn--;s.targets.push({lx:(Math.random()*2-1)*.85,z:1,hp:1,ph:Math.random()*6,zig:w.zig,speed:w.speed*(.85+Math.random()*.3)});}}
  for(const t of s.targets){if(t.hp<=0)continue;t.z-=t.speed*dt;t.ph+=dt;t.lx=clamp(t.lx+Math.sin(t.ph*2)*t.zig*dt,-1,1);
   if(t.z<=0){t.hp=0;for(const o of s.targets)o.z=Math.min(1.1,o.z+.25);shooterBreach(s,'virions reached the cell. Hit them while they are far away.');return;}}
  for(const sh of s.shots){sh.t+=dt;if(sh.t>=sh.dur&&!sh.boom){sh.boom=true;s.fx.push({kind:'boom',x:sh.x1,y:sh.y1,t:0,dur:.35});shake=3;tone(90,.15,'square',.03);
    for(const t of s.targets){if(t.hp<=0)continue;const q=shProj(t.lx,t.z),cy=q.y-26*q.s;if(Math.hypot(q.x-sh.x1,cy-sh.y1)<40+22*q.s){t.hp=0;burst(q.x,cy,'#ffd36b',14);run.score+=50;}}}}
  s.shots=s.shots.filter(x=>x.t<x.dur+.05);
  const alive=s.targets.some(t=>t.hp>0);
  if(!alive&&s.toSpawn<=0){shooterStageClear(s);return;}
  if(s.ammo<=0&&!s.shots.length&&alive){this.newBuild(s);toast('Out of interferon: translate another missile. The virions hold back while you work.',4);}},
 hud(s){return s.phase==='build'?'Codon '+Math.min(s.build.pos+1,s.build.seq.length)+'/'+s.build.seq.length:'Interferon ×'+s.ammo;},
 draw(s){shooterBackdrop('255,154,74');
  const order=s.targets.filter(t=>t.hp>0).sort((a,b)=>b.z-a.z);
  for(const t of order){const q=shProj(t.lx,t.z),art=atlases.miniphage?.[Math.floor(t.ph*4)%2];ctx.globalAlpha=Math.min(1,(1-t.z)*3+.2);if(art&&art.width!==undefined){ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(art,q.x-64*q.s,q.y-102*q.s,128*q.s,112*q.s);ctx.restore();}else{ctx.fillStyle='#c58cff';ctx.beginPath();ctx.arc(q.x,q.y-26*q.s,20*q.s,0,7);ctx.fill();}ctx.globalAlpha=1;}
  for(const sh of s.shots){const k=Math.min(1,sh.t/sh.dur),x=lerpN(sh.x0,sh.x1,k),y=lerpN(sh.y0,sh.y1,k)-Math.sin(k*Math.PI)*30;ctx.fillStyle='#ffd36b';ctx.beginPath();ctx.arc(x,y,5*(1.4-k),0,7);ctx.fill();rect('#ff9a4a',x-2,y+4,4,8);}
  for(const f of s.fx)if(f.kind==='boom'){const k=f.t/f.dur;ctx.fillStyle='rgba(255,211,107,'+(1-k)+')';ctx.beginPath();ctx.arc(f.x,f.y,10+50*k,0,7);ctx.fill();ctx.strokeStyle='rgba(255,255,255,'+(1-k)+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(f.x,f.y,14+60*k,0,7);ctx.stroke();text('IFN',f.x,f.y+4,9,'#3a1d00','center');}
  // the launcher: a ribosome cannon
  const lx=320,ly=H-6;ctx.fillStyle='#ff8a5c';ctx.strokeStyle='#5a1d0c';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(lx,ly,70,34,0,Math.PI,0);ctx.fill();ctx.stroke();ctx.fillStyle='#ffb38a';ctx.beginPath();ctx.ellipse(lx,ly-30,40,22,0,Math.PI,0);ctx.fill();ctx.stroke();
  for(let i=0;i<Math.min(12,s.ammo);i++)rect('#ffd36b',lx-66+i*11,ly-8,8,6);text('INTERFERON ×'+s.ammo,lx,ly-58,9,'#ffe1a8','center');
  if(s.phase==='fight'||s.phase==='station')shooterCrosshair(s,'#ffd36b');
  if(s.phase==='build')this.drawWheel(s);
  if(s.phase==='card')shooterCard(s.card[0],'#ffd36b',96),text(s.card[1],W/2,H-128,9,'#e8f6ff','center'),text('Fire, tap or press Z to start',W/2,H-110,9,'#ffd36b','center');},
 drawWheel(s){const b=s.build,g=ctx,{x,y,r}=WH,sh=b.shake?Math.sin(clock*80)*3:0;
  rect('#050c1aee',0,0,W,H);
  const sel=WHEEL.groups[b.sel],path=new Set();for(let i=sel.start;i<=sel.end;i++)path.add(i);
  const want=b.seq[b.pos],wi=WHEEL.codons.findIndex(c=>c.codon===want),hint=b.wrong;
  const ring=(r0,r1,from,to,fill,stroke)=>{g.beginPath();g.arc(x+sh,y,r1,whAng(from),whAng(to+1));g.arc(x+sh,y,r0,whAng(to+1),whAng(from),true);g.closePath();g.fillStyle=fill;g.fill();g.strokeStyle=stroke;g.lineWidth=1;g.stroke();};
  const baseCol={U:'#c58cff',C:'#4aa3ff',A:'#ff5c6c',G:'#3ddc84'};
  for(let q=0;q<4;q++){const on=[...path].some(i=>i>>4===q),h=hint>=1&&wi>>4===q;ring(r[0]+6,r[1],q*16,q*16+15,on?baseCol[BASES[q]]:h?'#ffd36b':baseCol[BASES[q]]+'66','#06101e');const a=whAng(q*16+8);text(BASES[q],x+sh+Math.cos(a)*19,y+Math.sin(a)*19+4,11,'#ffffff','center');}
  for(let k=0;k<16;k++){const on=[...path].some(i=>i>>2===k),h=hint>=2&&wi>>2===k;ring(r[1],r[2],k*4,k*4+3,on?baseCol[BASES[k&3]]:h?'#ffd36b':baseCol[BASES[k&3]]+'55','#06101e');const a=whAng(k*4+2);text(BASES[k&3],x+sh+Math.cos(a)*45,y+Math.sin(a)*45+3,9,'#ffffff','center');}
  for(let i=0;i<64;i++){const on=path.has(i),h=hint>=3&&i===wi;ring(r[2],r[3],i,i,on?baseCol[BASES[i&3]]:h?'#ffd36b':baseCol[BASES[i&3]]+'44','#06101e');const a=whAng(i+.5);text(BASES[i&3],x+sh+Math.cos(a)*75,y+Math.sin(a)*75+3,7,'#ffffff','center');}
  WHEEL.groups.forEach((gr,n)=>{const on=n===b.sel,h=hint>=3&&wi>=gr.start&&wi<=gr.end;ring(r[3],r[4],gr.start,gr.end,on?'#ffd36b':h?'#ffd36b88':gr.aa==='*'?'#5a1424':'#14243a','#06101e');const a=whAng((gr.start+gr.end+1)/2);g.save();g.translate(x+sh+Math.cos(a)*112,y+Math.sin(a)*112);g.rotate(a+(Math.cos(a)<0?Math.PI:0));text(AA_NAMES[gr.aa],0,3,gr.end>gr.start?9:7,on?'#1a1000':gr.aa==='*'?'#ffb0c0':'#e8f6ff','center');g.restore();});
  g.fillStyle='#050c1a';g.beginPath();g.arc(x+sh,y,6,0,7);g.fill();
  // right panel: the mRNA, the growing protein, instructions
  const px=338,Y=58;text('BUILD THE INTERFERON MISSILE',px,Y+40,11,'#ffd36b');text('Stage '+(s.stage+1)+' of 3 · real interferon-β starts M-T-N-K-C-L-L-Q',px,Y+54,8,'#a9c7d8');
  text('mRNA',px,Y+78,9,'#e8f6ff');const cs=Math.min(31,(W-px-52)/b.seq.length);b.seq.forEach((c,i)=>{const cx=px+44+i*cs,cur=i===b.pos;rect(cur?'#ffd36b':i<b.pos?'#26364f':'#14243a',cx-1,Y+66,cs-2,16);text(c,cx+cs/2-1.5,Y+78,cs<29?8:9,cur?'#1a1000':i<b.pos?'#6c88a0':'#e8f6ff','center');});
  if(b.pos<b.seq.length)text('▲',px+44+b.pos*cs+cs/2-2,Y+93,9,'#ffd36b','center');
  text('PROTEIN',px,Y+114,9,'#e8f6ff');const ps=Math.min(30,(W-px-84)/b.seq.length);b.chain.forEach((a,i)=>{const cx=px+70+i*ps;ctx.fillStyle=a==='*'?'#ff5c6c':['#3ddc84','#4aa3ff','#ff9f43','#c58cff'][i%4];ctx.beginPath();ctx.arc(cx,Y+110,Math.min(12,ps/2-1),0,7);ctx.fill();text(a==='*'?'■':AA_NAMES[a],cx,Y+113,ps<28?6:7,'#06101e','center');if(i)rect('#e8f6ff',cx-ps/2-1,Y+109,3,2);});
  const tips=['Read from the CENTER OUT:','1. inner ring = 1st letter','2. middle ring = 2nd letter','3. outer letters = 3rd letter','4. the amino acid is on the rim','A STOP codon finishes the protein.'];tips.forEach((t,i)=>text(t,px,Y+140+i*14,i?9:10,i?'#cfe4f0':'#ffd36b'));
  if(touchUI.on)text('Tap the amino acid on the rim',px,Y+230,8,'#a9c7d8');else{text('Mouse: click the amino acid on the rim',px,Y+226,8,'#a9c7d8');text('Keys: ← → pick · ↑ ↓ jump a quarter · Z confirm',px,Y+238,8,'#a9c7d8');}
  text('Selected: '+AA_NAMES[sel.aa]+'  ('+[...path].map(i=>WHEEL.codons[i].codon).join(', ')+')',px,Y+258,9,'#ffd36b');
  if(b.done){ctx.globalAlpha=Math.min(1,b.done*2);shooterCard(['MISSILE LOADED','Interferon: Met-'+b.chain.filter(a=>a!=='*'&&a!=='M').map(a=>AA_NAMES[a]).join('-')+' (the real protein is 187 amino acids long)'],'#9effc4',150);ctx.globalAlpha=1;}}};
const lerpN=(a,b,t)=>a+(b-a)*t;

/* ======================= MITOSIS: stuck growth switch → tumor cells ======================= */
const TUMOR_STAGES=[
 {tumor:5,healthy:6,divide:0,speed:.06,feature:'nucleus',guide:['TELL THEM APART: THE NUCLEUS','Tumor cells often have a huge, dark nucleus.','Healthy cells have a small, round one.']},
 {tumor:7,healthy:7,divide:11,speed:.07,feature:'shape',guide:['TELL THEM APART: THE SHAPE','Tumor cells are lumpy and irregular, and they pile up.','Healthy cells are smooth and evenly sized.']},
 {tumor:8,healthy:8,divide:6,speed:.08,feature:'all',guide:['OUT OF CONTROL','The stuck switch makes tumor cells divide again and again.','Remove them before they multiply. Spare the healthy cells!']}];
SHOOTERS.mitosis={
 line:'The virus jammed the cell’s growth switch ON. Cells call that an oncogene: like a gas pedal stuck to the floor. Cells are dividing out of control and tumor cells are forming. Laser the tumor cells and spare the healthy ones!',
 stageIntro(s,i){s.phase='card';},
 begin(s){s.phase='fight';this.spawnStage(s);},
 spawnStage(s){const c=TUMOR_STAGES[s.stage];s.targets=[];s.queue=[];for(let i=0;i<c.tumor;i++)s.queue.push(true);for(let i=0;i<c.healthy;i++)s.queue.push(false);s.queue.sort(()=>Math.random()-.5);s.spawnT=0;},
 rewind(s){this.spawnStage(s);},
 makeCell(s,tumor,lx,z){const c=TUMOR_STAGES[s.stage];return {tumor,lx:lx??(Math.random()*2-1)*.85,z:z??1,hp:tumor?2:1,seed:Math.random()*100,ph:Math.random()*6,div:c.divide?c.divide*(.6+Math.random()*.6):0,vx:(Math.random()-.5)*.18,hurt:0,split:0};},
 press(s){if(s.phase!=='fight')return;const t=this.cellAt(s,s.aim.x,s.aim.y);s.beam={x:s.aim.x,y:s.aim.y,t:0};tone(1200,.06,'square',.015);
  if(!t)return;if(t.tumor){t.hp--;t.hurt=.2;burst(...this.center(t),'#c58cff',10);if(t.hp<=0){burst(...this.center(t),'#ffd36b',18);run.score+=60;tone(220,.12,'square',.02);}}
  else{t.hurt=.4;s.mistakes++;run.retries++;tone(110,.2,'sawtooth',.03);toast(this.healthyMsg(s),4);}},
 healthyMsg(s){return ['That cell is healthy: small, round nucleus. Look for the huge, dark one.','That cell is healthy: smooth and evenly shaped. Tumor cells are lumpy.','Healthy cell! Small round nucleus, smooth edge. Spare it.'][s.stage];},
 center(t){const q=shProj(t.lx,t.z);return [q.x,q.y-34*q.s];},
 cellAt(s,x,y){let best=null;for(const t of s.targets){if(t.hp<=0)continue;const q=shProj(t.lx,t.z),[cx,cy]=this.center(t),r=30*q.s;if(Math.hypot(x-cx,y-cy)<r+6&&(!best||t.z<best.z))best=t;}return best;},
 update(s,dt){if(s.beam){s.beam.t+=dt;if(s.beam.t>.12)s.beam=null;}if(s.phase!=='fight')return;const c=TUMOR_STAGES[s.stage];
  if(s.queue.length){s.spawnT-=dt;if(s.spawnT<=0){s.spawnT=1.1;s.targets.push(this.makeCell(s,s.queue.pop()));}}
  for(const t of s.targets){if(t.hp<=0)continue;t.ph+=dt;t.hurt=Math.max(0,t.hurt-dt);
   if(t.tumor){t.z-=c.speed*dt*(1+.3*Math.sin(t.ph*2));t.lx=clamp(t.lx+Math.sin(t.ph*1.3+t.seed)*.05*dt,-1,1);
    if(t.div){t.div-=dt;if(t.div<1)t.split=1-t.div;if(t.div<=0){const live=s.targets.filter(o=>o.hp>0&&o.tumor).length;t.div=c.divide;t.split=0;if(live<14){s.targets.push(this.makeCell(s,true,clamp(t.lx+.16,-1,1),t.z+.03));t.lx=clamp(t.lx-.08,-1,1);tellOnceSh(s,'div','A tumor cell divided again: its growth switch is stuck ON. Get them before they multiply!');}}}
    if(t.z<=0){t.hp=0;for(const o of s.targets)if(o.tumor)o.z=Math.min(1.05,o.z+.2);shooterBreach(s,'tumor cells got through. Spot them early by their features.');return;}}
   else{t.z-=c.speed*.55*dt;t.lx+=t.vx*dt;if(Math.abs(t.lx)>1.05||t.z<=.05)t.hp=0;}}
  const tumors=s.targets.filter(t=>t.hp>0&&t.tumor).length;
  if(tumors>14){run.retries++;this.rewind(s);world.rewind=1.4;toast('◀◀ REWIND — the tumor grew out of control. Remove tumor cells before they divide.',5);return;}
  if(!s.queue.length&&!tumors){shooterStageClear(s);}},
 hud(s){return 'Tumor cells '+s.targets.filter(t=>t.hp>0&&t.tumor).length;},
 drawCell(x,y,r,t,feature,alpha=1){const g=ctx,tumor=t.tumor,odd=tumor&&(feature!=='nucleus'),n=22;g.save();g.globalAlpha=alpha;
  const lobes=t.split>0?[[-r*.45*t.split,1-t.split*.25],[r*.45*t.split,1-t.split*.25]]:[[0,1]];
  for(const [ox,k] of lobes){g.beginPath();for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,wob=odd?(.18*Math.sin(a*3+t.seed)+.12*Math.sin(a*5+t.seed*2)):.03*Math.sin(a*4+t.ph);g.lineTo(x+ox+Math.cos(a)*r*k*(1+wob),y+Math.sin(a)*r*k*(1+wob)*.92);}g.closePath();
   g.fillStyle=t.hurt>0?'#ffffff':tumor?'#d58ab4':'#f6b6cf';g.fill();g.strokeStyle=tumor?'#6a1d4a':'#a0507a';g.lineWidth=Math.max(1,r*.07);g.stroke();
   const nr=r*k*(tumor?.56:.3);g.fillStyle=tumor?'#3a1466':'#8a62d8';g.beginPath();if(tumor){for(let i=0;i<=14;i++){const a=i/14*Math.PI*2,w=1+.12*Math.sin(a*3+t.seed);g.lineTo(x+ox+r*.05+Math.cos(a)*nr*w,y-r*.04+Math.sin(a)*nr*w);}}else g.arc(x+ox,y,nr,0,7);g.fill();
   if(!tumor){g.fillStyle='#c9b0ff';g.beginPath();g.arc(x+ox-nr*.3,y-nr*.3,nr*.25,0,7);g.fill();}else{g.fillStyle='#7a3ab0';g.beginPath();g.arc(x+ox+nr*.2,y-nr*.15,nr*.22,0,7);g.arc(x+ox-nr*.3,y+nr*.25,nr*.16,0,7);g.fill();}}
  g.restore();},
 draw(s){shooterBackdrop('197,140,255');const c=TUMOR_STAGES[Math.min(2,s.stage)];
  const order=s.targets.filter(t=>t.hp>0).sort((a,b)=>b.z-a.z);
  for(const t of order){const q=shProj(t.lx,t.z),[cx,cy]=this.center(t),bob=t.tumor?Math.sin(t.ph*4)*3*q.s:0;ctx.fillStyle='#04070f66';ctx.beginPath();ctx.ellipse(q.x,q.y,26*q.s,6*q.s,0,0,7);ctx.fill();this.drawCell(cx,cy+bob,30*q.s,t,c.feature,Math.min(1,(1-t.z)*3+.25));}
  if(s.beam){const k=1-s.beam.t/.12;ctx.strokeStyle='rgba(124,247,223,'+k+')';ctx.lineWidth=5*k+1;ctx.beginPath();ctx.moveTo(W-70,H-20);ctx.lineTo(s.beam.x,s.beam.y);ctx.stroke();ctx.fillStyle='rgba(255,255,255,'+k+')';ctx.beginPath();ctx.arc(s.beam.x,s.beam.y,8*k+2,0,7);ctx.fill();}
  ctx.fillStyle='#22324a';ctx.strokeStyle='#7cf7df';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W-110,H);ctx.lineTo(W-80,H-40);ctx.lineTo(W-58,H-36);ctx.lineTo(W-40,H);ctx.closePath();ctx.fill();ctx.stroke();text('LASER',W-75,H-8,8,'#9ffcef','center');
  if(s.phase==='fight'||s.phase==='station')shooterCrosshair(s,'#7cf7df');
  if(s.phase==='card')this.drawGuide(s);},
 drawGuide(s){const c=TUMOR_STAGES[s.stage];rect('#050c1aee',60,40,520,280);rect('#c58cff',60,40,520,3);text('STAGE '+(s.stage+1)+' OF 3 · '+c.guide[0],320,66,11,'#e6c8ff','center');
  const demo=(tumor)=>({tumor,seed:tumor?7:3,ph:clock,hurt:0,split:s.stage===2&&tumor?(clock*.5%1):0});
  this.drawCell(210,160,48,demo(false),c.feature);this.drawCell(430,160,48,demo(true),c.feature);
  text('HEALTHY · SPARE IT',210,232,9,'#9effc4','center');text('TUMOR · LASER IT',430,232,9,'#ff9aa8','center');
  text(c.guide[1],320,262,9,'#e8f6ff','center');text(c.guide[2],320,278,9,'#e8f6ff','center');
  text('Fire, tap or press Z to start',320,304,9,'#c58cff','center');}};
function tellOnceSh(s,key,msg){s.told=s.told||{};if(s.told[key])return;s.told[key]=true;toast(msg,4);}
