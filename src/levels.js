/* ---------- Zone styles: every Ranger gets one platforming, one combat and one puzzle zone ---------- */
const ZONE_STYLES = {
 atp:['platform','puzzle','combat'], ribosome:['combat','puzzle','platform'], rougher:['combat','puzzle','platform'],
 golgi:['platform','puzzle','combat'], cytoplasm:['combat','puzzle','platform'], membrane:['combat','platform','puzzle'],
 mito:['combat','platform','puzzle'], nucleus:['platform','combat','puzzle'], smoother:['platform','combat','puzzle'],
 lysosome:['combat','puzzle','platform'], dna:['puzzle','combat','platform'], rna:['puzzle','platform','combat'],
 mitosis:['platform','puzzle','combat'], crispr:['puzzle','platform','combat']
};
const STYLE_LABEL={platform:'PLATFORM ZONE',combat:'COMBAT ZONE',puzzle:'PUZZLE ZONE'};
function seeded(seed){let s=(seed*2654435761)>>>0;return ()=>((s=(s*1664525+1013904223)>>>0)/4294967296);}

function newZone(style){return {style,gaps:[],platforms:[],movers:[],hazards:[],walls:[],cells:[],spawns:[],arenas:[],rooms:[],items:[],lock:null};}

/* Platform zone: stairs, ferries over pits, hazard pools, lifts and pit runs, in a shuffled order. */
function buildPlatform(index,route){
 const R=seeded(route*31+index*7+3),w=newZone('platform');
 const kinds=['stairs','ferry','hazard','lift','pits'];
 for(let i=kinds.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[kinds[i],kinds[j]]=[kinds[j],kinds[i]];}
 // capsules sit on the hardest-to-reach spots of the stairs, hazard pool and lift sections
 let x=240;
 for(const kind of kinds){
  w.spawns.push([x+20,Math.floor(R()*3)]);x+=150+Math.round(R()*40);
  if(kind==='stairs'){const d=Math.round(R()*8);w.platforms.push([x,90,252-d],[x+112,90,212-d],[x+226,100,170-d]);w.cells.push(cell(x+276,170-d-28));x+=380;}
  if(kind==='ferry'){const gw=210+Math.round(R()*40);w.gaps.push([x,x+gw]);w.movers.push({kind:'ferry',x0:x+12,x1:x+gw-92,w:80,y:268,speed:58+Math.round(R()*12),t:R()*6});x+=gw;}
  if(kind==='hazard'){const hw=290;w.hazards.push([x,x+hw]);w.platforms.push([x+12,70,250],[x+110,70,234],[x+208,70,250]);w.cells.push(cell(x+145,234-28));x+=hw+20;}
  if(kind==='lift'){w.movers.push({kind:'lift',x:x,w:70,y0:292,y1:150,speed:52,t:0});w.platforms.push([x+76,170,150]);w.cells.push(cell(x+190,150-28));x+=290;}
  if(kind==='pits'){const a=80+Math.round(R()*8),b=86+Math.round(R()*8);w.gaps.push([x,x+a],[x+a+70,x+a+70+b]);x+=a+70+b;}
 }
 w.length=x+420;return w;
}
const cell=(x,y,hidden=false)=>({x:Math.round(x),y:Math.round(y),taken:false,hidden});

/* Combat zone: three lockdown arenas, each with escalating waves. Clearing one drops a molecule. */
function buildCombat(index,route){
 const R=seeded(route*17+index*11+5),w=newZone('combat');
 const sizes=[[2,3],[3,3],[3,4]];
 [260,980,1700].forEach((a,i)=>{
  const b=a+560,lift=Math.round(R()*16);
  w.platforms.push([a+100+Math.round(R()*30),100,240-lift],[a+330+Math.round(R()*30),100,240-(16-lift)]);
  w.arenas.push({a,b,waves:sizes[i].map(n=>Array.from({length:n},()=>Math.floor(R()*3))),wave:-1,state:'idle',delay:0,elite:i===2});
  w.cells.push(cell((a+b)/2,FLOOR-40,true));
 });
 w.length=1700+560+420;return w;
}

/* Puzzle zone: three rooms, each sealed by a biology lock. */
function buildPuzzle(index,route,id){
 const w=newZone('puzzle'),kind=PUZZLE_KIND[id];
 [300,950,1600].forEach((a,r)=>{
  const room={a,b:a+520,r,kind,solved:false,mistakes:0,count:0,flash:0,pos:0,meter:0};
  w.walls.push(room.wall={x:room.b,open:false,top:-999});
  w.spawns.push([a-110,r%3]);
  w.cells.push(cell(room.b-40,FLOOR-40,true));
  setupRoom(w,room,id);w.rooms.push(room);
 });
 w.length=1600+520+420;return w;
}

function buildZone(index,route){
 const style=ZONE_STYLES[ranger.id][index];
 const w=style==='platform'?buildPlatform(index,route):style==='combat'?buildCombat(index,route):buildPuzzle(index,route,ranger.id);
 return w;
}

/* ---------- Puzzle content ---------- */
const PUZZLE_KIND={ribosome:'sequence',dna:'sequence',rna:'sequence',mitosis:'sequence',crispr:'sequence',
 atp:'carry',rougher:'carry',golgi:'carry',cytoplasm:'carry',membrane:'carry',nucleus:'carry',
 mito:'meter',lysosome:'meter',smoother:'meter'};
const PAIR={A:'T',T:'A',G:'C',C:'G'},RNA_PAIR={A:'U',T:'A',G:'C',C:'G'},CODON_TRNA={AUG:'UAC',GGC:'CCG',UUU:'AAA',UAA:'STOP'},CODON_AA={AUG:'Met',GGC:'Gly',UUU:'Phe'};
const PHASES=['prophase','metaphase','anaphase','telophase'];
function sequenceConfig(id,r){
 if(id==='dna'){const t=['TAC','GATC','CGTAA'][r];return {template:t,title:'BASE-PAIR BRIDGE',prompt:'Template  '+t.split('').join(' '),answer:t.split('').map(b=>PAIR[b]),options:['A','T','G','C'],line:'Build the matching strand',hint:'A pairs with T, and G pairs with C.'};}
 if(id==='rna'){const t=['TAC','GCAT','TACGT'][r];return {template:t,rna:true,title:'TRANSCRIPTION GATE',prompt:'DNA template  '+t.split('').join(' '),answer:t.split('').map(b=>RNA_PAIR[b]),options:['A','U','G','C','T'],line:'Build the mRNA copy',hint:'RNA pairs U with A and has no T. G pairs with C.'};}
 if(id==='ribosome'){const c=[['AUG','GGC'],['AUG','UUU','GGC'],['AUG','GGC','UUU','UAA']][r];return {title:'TRANSLATION BAY',prompt:'mRNA  '+c.join(' '),answer:c.map(x=>CODON_TRNA[x]),options:['UAC','CCG','AAA','AUG','STOP'],line:'Send the tRNA that pairs with each codon',hint:'An anticodon pairs with the codon: A with U, G with C. A stop codon gets the release factor.',codons:c};}
 if(id==='mitosis'){const a=[['metaphase'],['prophase','metaphase','anaphase'],PHASES.slice()][r];return {title:'SPINDLE CONTROL',prompt:r===0?'Find metaphase':'Put the stages in order',answer:a,options:PHASES.slice(),line:r===0?'Hit the cell in metaphase':'Hit the stages in the order they happen',hint:'Prophase → metaphase → anaphase → telophase. Metaphase lines chromosomes up in the middle.',pictures:true};}
 if(id==='crispr'){const guides=[['AUGCC'],['GCAUU','CCGAU'],['UAGCG','AACGU']][r];
  const target=g=>g.split('').map(b=>({A:'T',U:'A',G:'C',C:'G'})[b]).join('');
  return {title:'TARGET CHECKPOINT',prompt:'Guide RNA  '+guides.join('  then  '),answer:guides.map(target),options:null,guides,line:'Cut the DNA that pairs with the guide',hint:'Guide RNA pairs with DNA: A–T, U–A, G–C, C–G.'};}
}
function crisprOptions(cfg,step){
 const right=cfg.answer[step],g=cfg.guides[step];
 const wrong1=g.replace(/U/g,'T'),wrong2=right.split('').reverse().join('');
 const set=[right,wrong1,wrong2===right?right.slice(1)+right[0]:wrong2];
 return set;
}
const CARRY={
 atp:r=>({title:'PUMP POWER',line:'Charge ADP into ATP, then spend it at the pump',goal:r+1,
  items:[['adp',90]],machines:[{id:'charger',label:'PHOSPHATE CHARGER',icon:'phosphate',x:230,accept:{adp:{give:'atp',say:'ADP + phosphate → ATP'}},reject:'The charger adds a phosphate to ADP.'},
   {id:'pump',label:'ION PUMP',icon:'ions',x:420,accept:{atp:{count:true,drop:'adp',say:'ATP → ADP + phosphate: the pump runs!'}},reject:'The pump only runs on charged ATP.'}],
  hint:'ATP powers the pump and becomes ADP. Recharge the ADP and use it again.'}),
 rougher:r=>({title:'FOLDING CHAMBERS',line:'Feed the new protein into the ER, then ship its vesicle',goal:r+1,
  dispensers:[{x:70,item:'polypeptide',label:'RIBOSOME'}],machines:[{id:'er',label:'ER CHANNEL',icon:'polypeptide',x:230,accept:{polypeptide:{give:'vesicleOrange',say:'Folded and packed into a vesicle'}},reject:'The ER channel takes new protein chains.'},
   {id:'nuc',label:'NUCLEUS',icon:'nucleotide',x:330,accept:{},reject:'Secreted proteins are not sent into the nucleus.'},
   {id:'golgi',label:'TO GOLGI',icon:'vesicleGold',x:430,accept:{vesicleOrange:{count:true,say:'Vesicle sent to the Golgi'}},reject:'Fold the protein in the ER first.'}],
  hint:'Ribosome → rough ER → vesicle → Golgi.'}),
 golgi:r=>{const all=[['digest','Digestive enzymes'],['membraneProtein','Membrane protein'],['vesicleGold','Hormone to secrete']];const items=all.slice(0,r+1);
  return {title:'SORTING CISTERNAE',line:'Send each cargo to the right address',goal:items.length,items:items.map(([k],i)=>[k,40+i*72]),labels:Object.fromEntries(all),
  machines:[{id:'lyso',label:'TO LYSOSOME',icon:'digest',x:250,accept:{digest:{count:true,consume:true,say:'Enzymes delivered to the lysosome'}},reject:'Lysosomes take digestive enzymes.'},
   {id:'mem',label:'TO MEMBRANE',icon:'membraneProtein',x:350,accept:{membraneProtein:{count:true,consume:true,say:'Protein built into the membrane'}},reject:'The membrane takes membrane proteins.'},
   {id:'out',label:'OUT OF CELL',icon:'vesicleGold',x:450,accept:{vesicleGold:{count:true,consume:true,say:'Hormone secreted'}},reject:'Only secreted cargo leaves the cell.'}],
  hint:'Digestive enzymes → lysosome. Membrane proteins → membrane. Hormones → out of the cell.'};},
 cytoplasm:r=>({title:'REACTION DISTRICT',line:'Split glucose, then fuel the mitochondrion',goal:r+1,
  dispensers:[{x:70,item:'glucose',label:'GLUCOSE INLET'}],machines:[{id:'gly',label:'GLYCOLYSIS',icon:'enzyme',x:230,accept:{glucose:{give:'pyruvate',say:'Glucose → 2 pyruvate'}},reject:'Glycolysis enzymes split glucose.'},
   {id:'mito',label:'MITOCHONDRION',icon:'pyruvate',x:430,accept:{pyruvate:{count:true,say:'Pyruvate delivered'}},reject:'Mitochondria take pyruvate, not glucose. Split it in the cytosol first.'}],
  hint:'Glucose is split into pyruvate in the cytosol. Then pyruvate goes to the mitochondrion.'}),
 membrane:r=>{const all=[['o2','Oxygen (O₂)'],['glucose','Glucose'],['ions','Na⁺ ions']];const items=all.slice(0,r+1);
  return {title:'PUMP CONTROL',line:'Move each molecule across the right way',goal:items.length,items:items.map(([k],i)=>[k,40+i*72]),labels:Object.fromEntries(all),
  machines:[{id:'bilayer',label:'THROUGH BILAYER',icon:'phospholipid',x:250,accept:{o2:{count:true,consume:true,say:'Small O₂ slips straight through the bilayer'}},reject:'Only small, uncharged molecules pass straight through.'},
   {id:'channel',label:'CARRIER PROTEIN',icon:'glucose',x:350,accept:{glucose:{count:true,consume:true,say:'Glucose crosses through a carrier protein'}},reject:'Carrier proteins move glucose down its gradient.'},
   {id:'pump',label:'ATP PUMP',icon:'atp',x:450,accept:{ions:{count:true,consume:true,say:'The pump spends ATP to move Na⁺ uphill'}},reject:'Pumps move ions against their gradient.'}],
  hint:'O₂ crosses the bilayer, glucose needs a carrier, and Na⁺ is pumped using ATP.'};},
 nucleus:r=>{const all=[['mrna','mRNA'],['dnaHelix','Chromosomal DNA'],['histone','Histones']];const items=all.slice(0,r+1);
  return {title:'PORE CHECKPOINT',line:'Only the right cargo leaves through the pore',goal:items.length,items:items.map(([k],i)=>[k,40+i*72]),labels:Object.fromEntries(all),
  machines:[{id:'pore',label:'NUCLEAR PORE',icon:'mrna',x:300,accept:{mrna:{count:true,consume:true,say:'mRNA exported to the ribosomes'}},reject:'DNA and histones stay inside the nucleus.'},
   {id:'chromatin',label:'CHROMATIN STORE',icon:'histone',x:440,accept:{dnaHelix:{count:true,consume:true,say:'DNA stays safe in the nucleus'},histone:{count:true,consume:true,say:'Histones pack the DNA'}},reject:'mRNA must leave the nucleus to be read.'}],
  hint:'mRNA leaves through nuclear pores. DNA and its histones stay inside.'};}
};
const METER={
 mito:r=>({variant:'gate',title:'ATP TURBINE',line:'Pump H⁺ with the transport chain. A full gradient spins ATP synthase open.',label:'H⁺ GRADIENT',gain:24,leak:[6,7,8][r],cool:1,threshold:[50,60,68][r],pumps:r<2?[70,150]:[70,150,230],high:r===2?[230]:[],
  pumpLabel:'ETC PUMP',hint:'Hit the transport-chain pumps quickly. While H⁺ is high, ATP synthase spins and the door opens.'}),
 lysosome:r=>({variant:'dissolve',title:'ACID CHAMBER',line:'Run the proton pumps until the pH drops to 5. Acid lets the enzymes digest the blockage.',label:'pH',gain:20,leak:[4,5,6][r],cool:1.1,threshold:100,pumps:r===0?[70,170]:[70,170,270],high:r===2?[170]:[],
  pumpLabel:'H⁺ PUMP',hint:'Use every pump in turn. Lysosome enzymes only work in acid (about pH 5).'}),
 smoother:r=>({variant:'lift',title:'CALCIUM LIFT',line:'Release Ca²⁺ from the smooth ER. The muscle fiber contracts and hauls the lift up.',label:'Ca²⁺ LEVEL',gain:28,leak:[9,11,13][r],cool:.6,threshold:0,ledge:[160,140,120][r],pumps:[60],high:[],
  pumpLabel:'RELEASE Ca²⁺',hint:'Stand on the lift and hit the release switch fast. When calcium is pumped back, the muscle relaxes.'})
};
function setupRoom(w,room,id){
 const a=room.a;
 if(room.kind==='sequence'){
  room.cfg=sequenceConfig(id,room.r);
  room.switches=[];
  const opts=room.cfg.options||crisprOptions(room.cfg,0);
  const order=opts.map((_,i)=>i);const R=seeded(a+room.r*13+id.length);for(let i=order.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  const pic=room.cfg.pictures,span=pic?92:room.cfg.options?72:110;
  order.forEach((k,n)=>room.switches.push({x:a+70+n*span,value:opts[k],flash:0,good:0,w:pic?60:room.cfg.options?40:84}));
 }
 if(room.kind==='carry'){
  room.cfg=CARRY[id](room.r);
  for(const [key,dx] of room.cfg.items||[])w.items.push({key,x:a+dx,y:FLOOR-14,room:room.r});
  room.machines=room.cfg.machines.map(m=>({...m,x:a+m.x,flash:0}));
  room.dispensers=(room.cfg.dispensers||[]).map(d=>({...d,x:a+d.x}));
 }
 if(room.kind==='meter'){
  room.cfg=METER[id](room.r);
  room.switches=room.cfg.pumps.map(dx=>({x:a+dx,cool:0,flash:0,high:room.cfg.high.includes(dx)}));
  for(const s of room.switches)if(s.high)w.platforms.push([s.x-45,90,236]);
  if(room.cfg.variant==='lift'){
   room.lift={kind:'muscle',x:room.b-190,w:70,y:FLOOR-6,base:FLOOR-6,top:room.cfg.ledge+4};
   w.movers.push(room.lift);
   room.wall.top=room.cfg.ledge+6; // the wall is a tall cliff: only the ledge on top gets past it
   w.platforms.push([room.b-100,130,room.cfg.ledge]);
   room.switches=[{lift:true,x:room.lift.x+35,cool:0,flash:0}]; // the release lever rides on the lift
  }
 }
}

/* ---------- Runtime ---------- */
function moverSurface(m){return m.kind==='ferry'||m.kind==='lift'||m.kind==='muscle';}
function updateLevel(dt){
 const w=world,p=player;
 for(const m of w.movers){
  const ox=m.x??0,oy=m.y;m.prevY=m.y;
  if(m.kind==='ferry'){m.t+=dt;const span=m.x1-m.x0,period=span/m.speed*2,ph=(m.t%period)/period;m.x=m.x0+(ph<.5?ph*2:2-ph*2)*span;}
  if(m.kind==='lift'){m.t+=dt;const span=m.y0-m.y1,period=span/m.speed*2+1.6,ph=m.t%period,move=span/m.speed;m.y=ph<.8?m.y0:ph<.8+move?m.y0-(ph-.8)*m.speed:ph<1.6+move?m.y1:m.y1+(ph-1.6-move)*m.speed;m.y=clamp(m.y,m.y1,m.y0);}
  if(m.kind==='muscle'){const room=w.rooms.find(r=>r.lift===m);const target=m.base-(m.base-m.top)*clamp(room.meter/100,0,1);m.y+=clamp(target-m.y,-140*dt,140*dt);}
  m.dx=(m.x??0)-ox;m.dy=m.y-oy;
 }
 // hazard pools hurt on contact
 if(p.ground&&p.y>=FLOOR-.5&&p.inv<=0&&p.dodge<=0&&w.hazards.some(([a,b])=>p.x>a+4&&p.x<b-4)){damagePlayer(1,p.x+p.face*20);if(mode==='play'){p.vy=-260;p.ground=false;burst(p.x,FLOOR-4,'#e08cff',8);}}
 w.hudClock=(w.hudClock||0)+dt;if(w.hudClock>.25){w.hudClock=0;updateHUD();}
 if(w.style==='combat')updateArenas(dt);
 if(w.style==='puzzle')for(const room of w.rooms)updateRoom(room,dt);
}
function surfacesAt(x){
 const list=world.platforms.filter(([a,wd])=>x>=a-6&&x<=a+wd+6).map(q=>({y:q[2],prev:q[2]}));
 for(const m of world.movers)if(moverSurface(m)&&x>=m.x-6&&x<=m.x+m.w+6)list.push({y:m.y,prev:m.prevY??m.y,mover:m});
 if(!world.gaps.some(([a,b])=>x>a&&x<b))list.push({y:FLOOR,prev:FLOOR});
 return list.sort((a,b)=>a.y-b.y);
}
function blockByWalls(oldX,x,y){
 for(const wl of world.walls){if(wl.open||y<wl.top)continue;
  if(oldX<=wl.x-14&&x>wl.x-14)x=wl.x-14;else if(oldX>=wl.x+14&&x<wl.x+14)x=wl.x+14;}
 if(world.lock){x=clamp(x,world.lock.a+16,world.lock.b-16);}
 return x;
}
function revealCell(i){const c=world.cells[i];if(c&&c.hidden){c.hidden=false;burst(c.x,c.y,'#9fffea',22);tone(880,.12,'triangle');}}
/* Combat arenas */
function updateArenas(dt){
 const p=player;
 for(const [i,ar] of world.arenas.entries()){
  if(ar.state==='idle'&&p.x>ar.a+90&&p.x<ar.b-60){ar.state='fight';world.lock=ar;ar.delay=.6;toast('LOCKDOWN — clear the wave');tone(220,.25,'sawtooth',.03);}
  if(ar.state!=='fight')continue;
  const alive=enemies.some(e=>e.arena===ar&&e.hp>0);
  if(!alive){ar.delay-=dt;if(ar.delay<=0){ar.wave++;
   if(ar.wave>=ar.waves.length){ar.state='done';world.lock=null;revealCell(i);toast('Arena clear — grab the '+CARGO[ranger.id][zone].toLowerCase());tone(660,.2,'triangle');}
   else{ar.waves[ar.wave].forEach((type,n)=>{const e=makeEnemy(n%2?ar.b-50-n*18:ar.a+50+n*18,type);e.arena=ar;e.drop=-220-n*60;e.face=n%2?-1:1;if(ar.elite&&n===0){e.hp=e.max=e.max+6;e.elite=true;}enemies.push(e);});ar.delay=.9;if(ar.wave>0)toast('Wave '+(ar.wave+1)+' of '+ar.waves.length);}
  }}
 }
}
/* Puzzle rooms */
function updateRoom(room,dt){
 room.flash=Math.max(0,room.flash-dt);
 for(const s of room.switches||[]){s.recent=Math.max(0,(s.recent||0)-dt);s.flash=Math.max(0,s.flash-dt);s.good=Math.max(0,(s.good||0)-dt);if(s.cool!==undefined)s.cool=Math.max(0,s.cool-dt);}
 for(const m of room.machines||[])m.flash=Math.max(0,m.flash-dt);
 if(!room.entered&&player.x>room.a-20&&player.x<room.b){room.entered=true;toast(room.cfg.line);}
 if(room.kind==='meter'&&!room.solved){
  const c=room.cfg;if(c.variant==='dissolve'&&room.meter>=100){solveRoom(room);return;}room.meter=Math.max(0,room.meter-c.leak*dt);
  if(c.variant==='gate'){room.wall.open=room.meter>=c.threshold;if(player.x>room.b+16)solveRoom(room);}
  if(c.variant==='dissolve'&&room.meter>=100)solveRoom(room);
  if(c.variant==='lift'&&player.x>room.b+16)solveRoom(room);
 }
}
function solveRoom(room){
 if(room.solved)return;room.solved=true;room.wall.open=true;run.score+=Math.max(100,400-room.mistakes*60);
 revealCell(room.r);tone(523,.12,'triangle');setTimeout(()=>tone(784,.18,'triangle'),110);
 toast(room.cfg.title+' unlocked');burst(room.wall.x,FLOOR-60,ranger.color,26);shake=3;
}
function roomAt(x){return world.rooms?.find(r=>x>r.a-40&&x<r.b+10&&!r.solved);}
/* Melee and dive kicks also strike puzzle switches. Returns true if a switch was hit. */
function strikeSwitches(x,face,reach){
 const room=roomAt(player.x);if(!room||!room.switches)return false;
 const p=player;let best=null;
 for(const s of room.switches){
  const dx=s.x-p.x,sy=switchBase(room,s);
  if(dx*face<-14||Math.abs(dx)>reach||Math.abs(p.y-sy)>40||s.recent>0)continue;
  if(!best||Math.abs(dx)<Math.abs(best.x-p.x))best=s;
 }
 if(best){best.recent=.45;pressSwitch(room,best);return true;}
 return false;
}
function switchBase(room,s){return s.lift?room.lift.y:s.high?236:FLOOR;}
function pressSwitch(room,s){
 if(room.kind==='meter'){
  if(s.cool>0){toast(room.cfg.pumpLabel+' recharging — use another one');return;}
  s.cool=room.cfg.cool;s.flash=.25;room.meter=Math.min(100,room.meter+room.cfg.gain);tone(300+room.meter*4,.08,'square',.02);burst(s.x,switchBase(room,s)-30,'#9fe8ff',8);return;
 }
 const cfg=room.cfg,want=cfg.answer[room.pos];
 if(s.value===want){
  s.good=.5;room.pos++;tone(520+room.pos*70,.1,'triangle');burst(s.x,FLOOR-34,'#9effc4',10);
  if(room.pos>=cfg.answer.length)solveRoom(room);
  else if(!cfg.options){const opts=crisprOptions(cfg,room.pos);const order=[2,0,1];room.switches.forEach((sw,n)=>{sw.value=opts[order[(n+room.pos)%3]];});}
 }else{
  s.flash=.5;room.mistakes++;room.flash=.4;tone(110,.18,'sawtooth',.03);toast('Not quite — '+cfg.hint);
 }
}
/* Carrying: E picks up, delivers or drops. */
function carryInteract(){
 const p=player,room=roomAt(p.x);
 if(p.carry){
  const m=room?.machines?.find(m=>Math.abs(m.x-p.x)<42);
  if(m){
   const rule=m.accept[p.carry.key];
   if(!rule){m.flash=.5;room.mistakes++;tone(110,.18,'sawtooth',.03);toast('Rejected — '+m.reject);return true;}
   m.flash=.4;tone(620,.1,'triangle');burst(m.x,FLOOR-50,'#9effc4',12);toast(rule.say);
   if(rule.give)p.carry={key:rule.give};else p.carry=null;
   if(rule.drop)world.items.push({key:rule.drop,x:m.x+30,y:FLOOR-14,room:room.r,bounce:.4});
   if(rule.count){room.count++;if(room.count>=room.cfg.goal)solveRoom(room);}
   return true;
  }
  world.items.push({key:p.carry.key,x:p.x+p.face*16,y:FLOOR-14,room:room?room.r:-1});p.carry=null;tone(240,.06,'triangle');return true;
 }
 const item=world.items.find(it=>Math.abs(it.x-p.x)<30);
 if(item){world.items.splice(world.items.indexOf(item),1);p.carry={key:item.key};tone(500,.07,'triangle');toast('Carrying '+itemName(item.key,room)+' — press E at a machine');return true;}
 const d=room?.dispensers?.find(d=>Math.abs(d.x-p.x)<40);
 if(d){p.carry={key:d.item};tone(500,.07,'triangle');toast('Carrying '+itemName(d.item,room));return true;}
 return false;
}
const ITEM_NAMES={adp:'ADP',atp:'ATP',polypeptide:'a new protein chain',vesicleOrange:'a protein vesicle',glucose:'glucose',pyruvate:'pyruvate'};
function itemName(key,room){return room?.cfg?.labels?.[key]||ITEM_NAMES[key]||key;}
function puzzleObjective(){
 const room=world.rooms.find(r=>!r.solved);if(!room)return null;
 return 'Lock '+(room.r+1)+'/3';
}

/* ---------- Drawing ---------- */
function drawLevelBack(){
 const w=world;
 for(const [a,b] of w.hazards){if(b<camera||a>camera+W)continue;const x=a-camera;rect('#2b0f33',x,FLOOR-4,b-a,8);rect('#a43cd6',x,FLOOR-6,b-a,3);
  for(let i=0;i<(b-a)/14;i++){const bx=x+7+i*14,by=FLOOR-8-Math.abs(Math.sin(clock*3+i))*5;rect('#e08cff',bx,by,3,3);}
  if(Math.floor(clock*2)%2===0)text('⚠',x+(b-a)/2,FLOOR-14,10,'#ffb3f0','center');}
 for(const m of w.movers){if(m.x+m.w<camera||m.x>camera+W)continue;
  if(m.kind==='muscle'){const room=w.rooms.find(r=>r.lift===m),x=m.x-camera,topY=40;
   // a striated muscle fiber hangs from the ceiling and shortens as calcium rises
   const fiberBottom=topY+30+Math.max(0,(m.y-m.top))*.45;rect('#5a1830',x+m.w/2-9,topY,18,fiberBottom-topY);for(let yy=topY;yy<fiberBottom;yy+=5)rect('#ff8fa8',x+m.w/2-9,yy,18,2);
   ctx.strokeStyle='#d8e6ef';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+m.w/2,fiberBottom);ctx.lineTo(x+m.w/2,m.y);ctx.stroke();
   text('MUSCLE FIBER',x+m.w/2,topY-6,8,'#ffc0d0','center');}
  drawMoverPlatform(m);}
 if(w.style==='puzzle')for(const room of w.rooms)drawRoom(room);
 for(const ar of w.arenas)if(ar.state==='fight')for(const x of [ar.a,ar.b]){const sx=x-camera;for(let y=60;y<FLOOR;y+=6){rect(Math.floor(clock*12+y/6)%2?'#ff5d8f':'#ffb3cc',sx-2,y,4,3);}rect('#ff5d8f33',sx-8,60,16,FLOOR-60);}
 for(const it of w.items){const x=it.x-camera;if(x<-30||x>W+30)continue;const icon=moleculeIcon(it.key);ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(icon,Math.round(x-17),Math.round(it.y-17+Math.sin(clock*4+it.x)*2));ctx.restore();
  const room=world.rooms[it.room];const name=room?.cfg?.labels?.[it.key];const lift=name&&world.items.indexOf(it)%2?10:0;if(name)text(name.toUpperCase(),x,it.y-24-lift,7,'#d4fff1','center');
  if(Math.abs(it.x-player.x)<30&&!player.carry)text('E · pick up',x,it.y-(name?34:24),8,'#fff0b2','center');}
}
function drawMoverPlatform(m){const x=m.x-camera,y=m.y;rect('#0a182b',x,y,m.w,14);rect(m.kind==='muscle'?'#ff8fa8':'#ffd36b',x,y,m.w,3);rect('#324b66',x,y+4,m.w,8);
 for(let j=6;j<m.w-6;j+=12)rect('#5b7a91',x+j,y+6,6,2);if(m.kind!=='ferry'){rect('#d8e6ef',x+m.w/2-1,0,0,0);}}
function drawSign(x,y,w,title,lines,color='#7cf7df'){
 x-=camera;if(x+w/2<0||x-w/2>W)return;rect('#06101ecc',x-w/2,y,w,14+lines.length*12);rect(color,x-w/2,y,w,2);text(title,x,y+11,8,color,'center');
 lines.forEach((l,i)=>text(l,x,y+24+i*12,9,'#e8f6ff','center'));rect('#2f4a63',x-w/2+10,0,2,y);rect('#2f4a63',x+w/2-12,0,2,y);}
function drawRoom(room){
 const cfg=room.cfg,a=room.a;
 // the room's gate
 const gx=room.wall.x-camera;
 if(room.kind==='meter'&&cfg.variant==='lift'){rect('#10263f',gx-14,cfg.ledge+12,28,FLOOR-cfg.ledge-12);for(let y=cfg.ledge+16;y<FLOOR;y+=12)rect('#22405c',gx-12,y,24,5);}
 else if(!room.wall.open){rect('#0d1b2e',gx-10,70,20,FLOOR-70);for(let y=74;y<FLOOR;y+=10)rect(room.flash>0?'#ff6b8a':ranger.color,gx-8,y,16,4);text('LOCKED',gx,64,8,'#ffd887','center');}
 else if(!room.solved){rect('#9effc455',gx-10,70,20,FLOOR-70);}
 if(room.kind==='sequence'){
  drawBoard(room);
  for(const s of room.switches)drawSwitch(s,room);
 }
 if(room.kind==='carry'){
  drawSign(a+260,70,300,cfg.title,[cfg.line,'Delivered '+room.count+'/'+cfg.goal],room.solved?'#9effc4':'#7cf7df');
  for(const d of room.dispensers)drawMachine(d.x,d.label,d.item,0,'#2bb5a4');
  for(const m of room.machines)drawMachine(m.x,m.label,m.icon,m.flash,m.flash>0&&!player.carry?'#9effc4':'#7cf7df');
 }
 if(room.kind==='meter'){
  const v=cfg.variant,pct=room.meter/100;
  const label=v==='dissolve'?'pH '+(7.2-2.2*pct).toFixed(1):cfg.label+' '+Math.round(room.meter)+'%';
  drawSign(a+(v==='lift'?175:300),62,v==='lift'?300:320,cfg.title,[cfg.line.length>52?cfg.line.slice(0,cfg.line.indexOf('.')+1):cfg.line,label],room.solved?'#9effc4':'#7cf7df');
  const mx=a+(v==='lift'?175:300)-camera-100;rect('#0b1424',mx,104+12,200,8);rect(v==='dissolve'?'#ff7a9a':'#ffd36b',mx+1,104+13,198*pct,6);
  if(v==='gate'){const t=cfg.threshold/100*200;rect('#ffffff',mx+t,112,2,16);}
  if(v==='gate'&&!room.solved){const gx2=room.wall.x-camera;ctx.save();ctx.translate(gx2,FLOOR-130);ctx.rotate(clock*(room.wall.open?8:.4));for(let k=0;k<6;k++){ctx.rotate(Math.PI/3);rect('#ffbd6d',-2,-22,4,22);}ctx.restore();text('ATP SYNTHASE',gx2,FLOOR-160,8,'#ffd9a8','center');}
  if(v==='dissolve'&&!room.solved){const gx2=room.wall.x-camera,melt=pct;
   // a clog of worn-out organelle debris; it sags and pales as the acid builds
   for(let k=0;k<9;k++){const bx=gx2+((k*37)%3-1)*12,by=FLOOR-14-k*22+melt*k*5,rx=15-k%2*3,ry=9;ctx.fillStyle=k%3===0?'#7a4a2c':k%3===1?'#5c3a2a':'#8a6a50';ctx.globalAlpha=1-melt*.45;ctx.beginPath();ctx.ellipse(bx,by,rx,ry,(k%2?.4:-.3),0,7);ctx.fill();ctx.strokeStyle='#c99a6e';ctx.lineWidth=1;ctx.stroke();ctx.strokeStyle='#3a2216';ctx.beginPath();ctx.moveTo(bx-rx+4,by);for(let q=0;q<4;q++)ctx.lineTo(bx-rx+6+q*(rx-3)/2,by+(q%2?3:-3));ctx.stroke();}
   ctx.globalAlpha=1;text('WORN-OUT DEBRIS',gx2,FLOOR-212,8,'#ffc0d0','center');}
  for(const s of room.switches)drawSwitch(s,room);
 }
}
/* Sequence puzzles get a picture board: colored bases, codons, chains and stage thumbnails. */
function blocks(seq,cx,y,size=15,gap=2,ghost=false){const n=seq.length,x0=cx-(n*(size+gap)-gap)/2;
 for(let i=0;i<n;i++){const b=seq[i],x=x0+i*(size+gap);if(b==='_'){ctx.strokeStyle='#7d93a8';ctx.setLineDash([2,2]);ctx.strokeRect(Math.round(x)+.5,y+.5,size-1,size-1);ctx.setLineDash([]);continue;}
  rect(BASE_ICON[b]||'#9fb6c8',x,y,size,size);rect('#0b1424',x,y+size-2,size,2);text(b,x+size/2,y+size-4,size-5,'#0b1424','center');}
 return x0;}
function drawBoard(room){
 const cfg=room.cfg,cx=room.a+260-camera,y=64,w=330,h=88;if(cx+w/2<0||cx-w/2>W)return;
 const done=room.solved,color=done?'#9effc4':room.flash>0?'#ff6b8a':'#7cf7df';
 rect('#2f4a63',cx-w/2+12,0,2,y);rect('#2f4a63',cx+w/2-14,0,2,y);
 rect('#06101ee6',cx-w/2,y,w,h);rect(color,cx-w/2,y,w,2);text(cfg.title,cx,y+12,8,color,'center');
 const label=(s,yy)=>text(s,cx-w/2+8,yy,8,'#a9c7d8','left');
 if(cfg.template){
  label('TEMPLATE',y+31);blocks(cfg.template,cx+20,y+20);
  const built=cfg.answer.map((b,i)=>i<room.pos?b:'_').join('');label(cfg.rna?'mRNA':'NEW',y+52);blocks(built,cx+20,y+41);
  for(let i=0;i<cfg.template.length;i++){const x0=cx+20-(cfg.template.length*17-2)/2+i*17+7;rect('#4b6275',x0,y+36,1,4);}
 }else if(cfg.codons){
  label('mRNA',y+31);const n=cfg.codons.length;cfg.codons.forEach((c,i)=>{const gx=cx+20+(i-(n-1)/2)*58;blocks(c,gx,y+20,14,1);if(i===room.pos&&!done){ctx.strokeStyle='#ffd36b';ctx.strokeRect(Math.round(gx-25)+.5,y+18.5,50,18);}});
  label('CHAIN',y+56);cfg.codons.slice(0,room.pos).forEach((c,i)=>{const gx=cx+20+(i-(n-1)/2)*58;if(CODON_AA[c]){ctx.fillStyle='#ffd36b';ctx.beginPath();ctx.arc(gx,y+52,8,0,7);ctx.fill();text(CODON_AA[c],gx,y+55,7,'#2b1d04','center');if(i)rect('#ffd36b',gx-50,y+51,42,2);}else text('RELEASED!',gx,y+55,8,'#9effc4','center');});
 }else if(cfg.guides){
  const step=Math.min(room.pos,cfg.guides.length-1);label('GUIDE RNA',y+31);blocks(cfg.guides[step],cx+30,y+20);
  label('CUT',y+56);text(done?'All targets cut!':'Target '+(room.pos+1)+' of '+cfg.guides.length+' — find its partner DNA',cx+30,y+56,8,'#e8f6ff','center');
 }else if(cfg.pictures){
  label('ORDER',y+40);const n=cfg.answer.length;cfg.answer.forEach((st,i)=>{const gx=cx+20+(i-(n-1)/2)*52;rect('#0b1a2c',gx-22,y+20,44,36);
   if(i<room.pos){ctx.save();ctx.translate(gx,y+38);ctx.scale(.3,.3);dgMitosisCell(ctx,0,0,st,52);ctx.restore();}else text('?',gx,y+43,14,'#ffd36b','center');
   if(i<n-1)text('→',gx+26,y+42,9,'#a9c7d8','center');});
 }
 text(cfg.line,cx,y+h-10,9,'#e8f6ff','center');
}
function drawSwitch(s,room){
 const x=s.x-camera,base=switchBase(room,s),w=s.w||34,h=room.cfg.pictures?52:30;if(x<-60||x>W+60)return;
 const glow=s.good>0?'#9effc4':s.flash>0?'#ff6b8a':s.cool>0?'#4b6275':'#ffd36b';
 rect('#0b1a2c',x-w/2,base-h-6,w,h+6);rect(glow,x-w/2,base-h-6,w,3);rect('#1b3550',x-w/2+3,base-h-1,w-6,h-2);
 if(s.lift){rect('#2f4a63',x-2,base-26,4,26);rect(s.cool>0?'#33485a':'#ff8fa8',x-7,base-36,14,12);text('Ca²⁺',x,base-27,7,'#1b0d14','center');text('Z · '+room.cfg.pumpLabel,x,base+24,8,'#fff0b2','center');return;}
 if(room.kind==='meter'){text(room.cfg.pumpLabel,x,base-h-12,8,'#fff0b2','center');rect(s.cool>0?'#33485a':'#ff8fa8',x-7,base-h+6,14,14);text('Z',x,base-h+17,9,'#1b0d14','center');return;}
 if(room.cfg.pictures){ctx.save();ctx.translate(x,base-h/2-2);ctx.scale(.36,.36);dgMitosisCell(ctx,0,0,s.value,52);ctx.restore();return;}
 const v=s.value,col=v.length===1?(BASE_ICON[v]||'#ffd36b'):'#e8f6ff';
 if(v.length===1){rect(col,x-12,base-h+3,24,20);text(v,x,base-h+18,13,'#0b1424','center');}
 else if(v==='STOP'){text('RELEASE',x,base-h+11,8,'#ffb0bd','center');text('FACTOR',x,base-h+21,8,'#ffb0bd','center');}
 else{const n=v.length,bw=Math.min(14,(w-6)/n);for(let i=0;i<n;i++){rect(BASE_ICON[v[i]]||'#ccc',x-n*bw/2+i*bw,base-h+3,bw-1,20);text(v[i],x-n*bw/2+i*bw+bw/2-.5,base-h+17,9,'#0b1424','center');}}
 if(room.cfg.codons)text('tRNA',x,base-h-10,8,'#c9b0ff','center');
}
function drawMachine(x,label,icon,flash,color){
 x-=camera;if(x<-50||x>W+50)return;rect('#10263f',x-22,FLOOR-48,44,48);rect(flash>0?'#ff6b8a':color,x-24,FLOOR-50,48,3);rect('#1d4c63',x-17,FLOOR-42,34,30);
 const ic=moleculeIcon(icon);ctx.save();ctx.imageSmoothingEnabled=true;ctx.globalAlpha=.9;ctx.drawImage(ic,Math.round(x-17),FLOOR-44);ctx.restore();
 text(label,x,FLOOR-56,8,'#d8ffed','center');
 if(Math.abs(player.x-(x+camera))<42)text(player.carry?'E · deliver':'E · use',x,FLOOR-68,8,'#fff0b2','center');
}
