// Deterministic checks for the combat state machine and all mission routes.
class Element {
 constructor(){this.children=[];this.hidden=false;this.style={setProperty(){}};this.classList={add(){},toggle(){}};this.dataset={};this.value='';this.disabled=false;}
 append(...children){this.children.push(...children)}
 replaceChildren(...children){this.children=children}
 setAttribute(){} focus(){} click(){this.onclick?.()} addEventListener(){}
 get firstElementChild(){return this.children[0]||(this.children[0]=new Element())}
 getContext(){return ctxProxy}
 scrollIntoView(){}
}
// A canvas context that accepts any drawing call, so diagrams and the title screen run headless.
const ctxProxy=new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='measureText')return s=>({width:String(s).length*6});return ()=>ctxProxy;},set(t,k,v){t[k]=v;return true;}});
const elements=new Map();
const documentMock={getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id)},createElement(){return new Element()},querySelectorAll(){return []},addEventListener(){}};
const fakeStore={};
const sandbox={document:documentMock,window:{},console,localStorage:{getItem:k=>fakeStore[k]||null,setItem:(k,v)=>fakeStore[k]=v},addEventListener(){},requestAnimationFrame(){},structuredClone:v=>JSON.parse(JSON.stringify(v)),performance:{now:()=>0},setTimeout(){},Image:class{},HTMLInputElement:Element,Blob:class{},URL:{createObjectURL(){return 'test'},revokeObjectURL(){}}};
const context=vm.createContext(sandbox);
vm.runInContext(campaignText+'\n'+questionText+'\n'+diagramText+'\n'+moleculeText+'\n'+levelText+'\n'+missionText+'\n'+puzzleTestText+'\n'+engineText.replace(/load\(\)\.catch\([\s\S]*$/,'')+'\n'+introText,context);
const evaluate=code=>vm.runInContext(code,context);
const check=(condition,message)=>{if(!condition)throw Error(message)};
let checks=0;
evaluate("mode='intro';introClock=0;for(let f=0;f<INTRO_LEN*30-2;f++)drawIntro(1/30);");check(evaluate('introClock>INTRO_LEN-1'),'The animated intro plays every scene without errors');checks++;
check(evaluate('verifyQuestions()')===70,'All 70 bio-scan questions are well formed and draw their diagrams');checks+=70;
evaluate("var answer=i=>answerQuestion(document.createElement('button'),i);var wrong=()=>activeQuestion.q.c.findIndex((_,i)=>i!==activeQuestion.q.a);var proceed=()=>$('feedback').children[1].onclick();");
check(evaluate('RANGERS.length')===14,'14 characters');checks++;
check(evaluate('new Set(RANGERS.map(r=>{ranger=r;return JSON.stringify(makeWorld(0))})).size')===14,'14 distinct route layouts');checks++;
evaluate("muted=true; for(const r of RANGERS){atlases[r.id]=Array(16).fill({});portraits[r.id]={};}atlases.phage=Array(8).fill({});");
for(let i=0;i<14;i++){
 evaluate(`selected=${i};ranger=RANGERS[selected];startMission();while(mode==='dialog')nextLine();`);
 check(evaluate('mode')==='play','Start enters play');checks++;
 // Damage occurs at contact, never during windup, and once per swing.
 evaluate("enemies=[makeEnemy(player.x+45,0)];enemies[0].timer=9;var hp0=enemies[0].hp;attack('melee');step(.06);");
 check(evaluate('enemies[0].hp===hp0'),'Windup must not hit');checks++;
 evaluate('step(.09)');check(evaluate('enemies[0].hp===hp0-2'),'Contact must hit once');checks++;
 evaluate('hitStop=0;step(.03)');check(evaluate('enemies[0].hp===hp0-2'),'No duplicate hit');checks++;
 evaluate("enemies=[];player.action=null;player.energy=6;attack('shoot');step(.1);");check(evaluate('bolts.length')===0,'No bullet before draw');checks++;
 evaluate('step(.11)');check(evaluate('bolts.length')===1,'Bullet at firing frame');checks++;
 check(evaluate('frameForPlayer()')===14,'Visible firing pose');checks++;
 evaluate('player.action=null;player.inv=0;player.dodge=.2;damagePlayer(2,player.x+20)');check(evaluate('player.hp')===10,'Dodge grants invulnerability');checks++;
 for(let z=0;z<3;z++){
  evaluate(`loadZone(${z});while(mode==='dialog')nextLine();world.cells.forEach(c=>c.taken=true);if(world.mrna)world.mrna.delivered=true;player.x=world.terminal.x;terminal();`);
  check(evaluate('mode')==='task'&&evaluate('activeQuestion.index')===z,'Station opens its own bio-scan');checks++;
  if(z===1){evaluate('answer(wrong())');check(evaluate('!activeQuestion.solved && !world.terminal.done && $("feedback").className.includes("miss")'),'Wrong answer shows a hint and keeps the station locked');checks++;}
  evaluate('answer(activeQuestion.q.a);proceed()');
  check(evaluate('world.terminal.done && mode === "play"'),'Correct answer unlocks route');checks++;
  check(evaluate('run.answers.at(-1).correct')===(z!==1),'First-try result recorded');checks++;
  evaluate('player.x=world.length-40;enemies=[];step(1/60)');
  check(evaluate('zone')===z+1,'Exit advances exactly one zone');checks++;
 }
 evaluate("while(mode==='dialog')nextLine();damageEnemy(enemies[0],40);player.x=world.terminal.x;terminal();");
 check(evaluate('activeQuestion.index')===3,'Shield station asks the Phage question');checks++;
 evaluate("answer(activeQuestion.q.a);proceed();enemies[0].hp=1;damageEnemy(enemies[0],2);hitStop=0;for(let n=0;n<40;n++)step(1/60);");
 check(evaluate('world.shieldUnlocked'),'Shield question unlocks the shield');checks++;
 check(evaluate('mode')==='quiz','Boss defeat opens debrief');checks++;
 check(evaluate('activeQuestion.index')===4,'Debrief is the fifth question');checks++;
 evaluate("answer(activeQuestion.q.a);proceed();");
 check(evaluate('mode')==='complete','Debrief completes mission');checks++;
 check(evaluate('profile.checkpoint')===null,'Completed checkpoint cleared');checks++;
 check(evaluate('profile.results.at(-1).ranger')===evaluate('ranger.id'),'Correct Ranger in saved result');checks++;
 evaluate('goHome()');
}
check(evaluate('profile.results.length')===14,'All 14 completions saved');checks++;
// Jump reach and crossing the widest gap using the actual physics.
evaluate("selected=0;ranger=RANGERS[0];startMission();while(mode==='dialog')nextLine();enemies=[];world.hazards=[];var pit=world.gaps.filter(g=>g[1]-g[0]<150).sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]))[0];player.x=pit[0]-160;keys.add('ArrowRight');");
evaluate("player.x=world.gaps.filter(g=>g[1]-g[0]<150)[0][0]-160");
for(let n=0;n<400&&evaluate('player.x<pit[1]+20&&mode==="play"');n++)evaluate("if(player.ground&&world.gaps.some(g=>g[0]-player.x>0&&g[0]-player.x<14))taps.add('Space');step(1/60);taps.clear()");
check(evaluate('player.x>pit[1] && player.y<=302 && player.hp===10'),'Widest jumpable pit can be crossed');checks++;
evaluate("keys.clear();player.inv=0;for(let n=0;n<30;n++){player.inv=0;damagePlayer(2,player.x+20);}");check(evaluate('mode==="play" && player.hp===10'),'Rangers are invincible: hits never cost health or end the run');checks++;
check(evaluate('player.inv>0'),'A hit still registers (flash and knockback)');checks++;
// Dive kick: tuck, dive, hit an enemy below and bounce; or land and send out a shockwave.
evaluate("selected=1;ranger=RANGERS[1];startMission();while(mode==='dialog')nextLine();enemies=[makeEnemy(player.x+75,2)];enemies[0].timer=9;var dhp=enemies[0].hp;player.y=FLOOR-120;player.ground=false;player.vy=0;taps.add('KeyZ');step(1/60);taps.clear();keys.clear();");
check(evaluate("player.action.kind")==='dive','Attack in the air starts a dive kick (no Down needed)');checks++;
check(evaluate("frameForPlayer()")===11,'Dive starts with a tuck');checks++;
evaluate("for(let n=0;n<10;n++){step(1/60);taps.clear();}");check(evaluate("player.action?.kind==='dive' && frameForPlayer()===9 && player.vy>0"),'Dive kick pose plunges downward');checks++;
evaluate("for(let n=0;n<40&&enemies[0].hp===dhp;n++){hitStop=0;step(1/60);taps.clear();}");
check(evaluate("enemies[0].hp===dhp-5"),'Dive kick lands a 5-damage hit');checks++;check(evaluate("player.vy<0 && !player.action"),'Dive kick bounces off the enemy');checks++;
evaluate("hitStop=0;enemies=[];player.y=FLOOR-120;player.ground=false;player.vy=0;player.action=null;taps.add('KeyZ');step(1/60);taps.clear();keys.clear();for(let n=0;n<60&&player.action?.kind==='dive';n++){hitStop=0;step(1/60);taps.clear();}");
check(evaluate("player.action?.kind==='land' && rings.length===1 && player.y===FLOOR"),'Missed dive lands with a shockwave');checks++;
evaluate("for(let n=0;n<20;n++){step(1/60);taps.clear();}");check(evaluate("!player.action && frameForPlayer()===0"),'Landing recovers to idle');checks++;
evaluate("taps.add('KeyZ');step(1/60);taps.clear();");check(evaluate("player.action.kind")==='punch','Z on the ground is still a punch');checks++;
// Story text types out, Continue finishes the line first, then advances.
evaluate("var told=false;talk([['crispr','Hold the line, Ranger.'],['phage','Never.']],()=>{told=true;mode='play';});");
check(evaluate("$('lineShown').textContent")===''&&evaluate("$('lineRest').textContent")==='Hold the line, Ranger.','Line starts hidden but keeps its layout');checks++;
evaluate("for(let n=0;n<8;n++)typeStep(1/30)");const partial=evaluate("$('lineShown').textContent");check(partial.length>0&&partial.length<22,'Text reveals gradually');checks++;
evaluate("nextLine()");check(evaluate("$('lineShown').textContent")==='Hold the line, Ranger.'&&evaluate("mode")==='dialog','Continue completes the line before advancing');checks++;
evaluate("nextLine()");check(evaluate("$('speaker').textContent")==='PHAGE','Second Continue advances');checks++;
evaluate("nextLine();nextLine()");check(evaluate("told"),'Dialog finishes');checks++;

// ---------- Level variety ----------
// Every Ranger has one platform, one combat and one puzzle zone.
for(const r of evaluate('RANGERS.map(r=>r.id)'))check(evaluate(`ZONE_STYLES['${r}'].slice().sort().join()`)==='combat,platform,puzzle',r+' has one zone of each style'),checks++;
// Molecules: three per Ranger, every icon key draws.
check(evaluate("RANGERS.every(r=>MOLECULES[r.id].length===3&&MOLECULES[r.id].every(m=>MOLECULE_ART[m[1]]&&m[2].length>20))"),'Every Ranger has three drawn molecules with facts');checks++;
// Platform zones: every capsule is reachable (static jumps ≤ 85 up and ≤ 110 across; lifts reach their ledges; ferries meet both edges; pits ≤ 110).
evaluate(`var platformReport=[];for(const r of RANGERS){ranger=r;const z=ZONE_STYLES[r.id].indexOf('platform');const w=makeWorld(z);
 const surf=[...w.platforms.map(([x,wd,y])=>({a:x,b:x+wd,y}))];
 for(const m of w.movers.filter(m=>m.kind==='lift')){surf.push({a:m.x,b:m.x+m.w,y:m.y1,lift:true});}
 const reach=new Set(),queue=[];
 // floor is reachable everywhere (pits are checked separately)
 surf.forEach((s,i)=>{if(FLOOR-s.y<=85||s.lift){reach.add(i);queue.push(i);}});
 while(queue.length){const i=queue.shift(),s=surf[i];surf.forEach((t,j)=>{if(reach.has(j))return;const gap=Math.max(0,t.a-s.b,s.a-t.b);if(t.y>=s.y-85&&gap<=110){reach.add(j);queue.push(j);}});}
 for(const c of w.cells){const on=surf.findIndex(s=>c.x>=s.a&&c.x<=s.b&&Math.abs(s.y-28-c.y)<2);if(on<0||!reach.has(on))platformReport.push(r.id+' capsule at '+c.x);}
 for(const [a,b] of w.gaps){const ferry=w.movers.find(m=>m.kind==='ferry'&&m.x0>=a&&m.x0<b);if(ferry){if(ferry.x0-a>20||b-(ferry.x1+ferry.w)>20)platformReport.push(r.id+' ferry');}else if(b-a>110)platformReport.push(r.id+' pit too wide');}
 if(w.cells.length!==3)platformReport.push(r.id+' capsule count');}`);
check(evaluate('platformReport.length')===0,'Platform zones reachable: '+evaluate('platformReport.join("; ")'));checks+=14;
// Lift: ride it to the top and step onto the ledge, using real physics.
evaluate(`ranger=RANGERS.find(r=>r.id==='atp');selected=0;startMission();while(mode==='dialog')nextLine();enemies=[];var lift=world.movers.find(m=>m.kind==='lift');lift.t=0;updateLevel(0);player.x=lift.x+35;player.y=lift.y;player.ground=true;player.ride=lift;
 for(let n=0;n<600&&lift.y>lift.y1+1;n++){step(1/60);taps.clear();}
 keys.add('ArrowRight');for(let n=0;n<40;n++){step(1/60);taps.clear();}keys.clear();`);
check(evaluate('player.y===lift.y1 && player.x>lift.x+lift.w'),'Lift carries the Ranger up to the ledge');checks++;
// Combat zones: arenas lock, waves spawn from above, clearing all waves unlocks and drops a molecule.
for(const r of ['ribosome','dna','mitosis','crispr','mito']){
 evaluate(`ranger=RANGERS.find(r=>r.id==='${r}');selected=RANGERS.indexOf(ranger);startMission();loadZone(ZONE_STYLES[ranger.id].indexOf('combat'));while(mode==='dialog')nextLine();enemies=[];var ar=world.arenas[0];player.x=ar.a+150;step(1/60);`);
 check(evaluate('world.lock===ar'),r+' arena locks');checks++;
 evaluate(`for(let n=0;n<2000&&ar.state==='fight';n++){for(const e of enemies)if(e.hp>0&&e.drop===0&&!e.latched){e.hp=1;damageEnemy(e,9);}hitStop=0;player.hp=10;player.inv=1;step(1/60);taps.clear();}`);
 check(evaluate("ar.state==='done' && world.lock===null && !world.cells[0].hidden"),r+' arena clears and drops its molecule');checks++;
 check(evaluate("player.x>=ar.a && player.x<=ar.b"),r+' arena kept the Ranger inside');checks++;
}
// Combat zones with a job: a bot plays each new combat zone to the end.
evaluate(`var combatBot=(id)=>{ranger=RANGERS.find(r=>r.id===id);selected=RANGERS.indexOf(ranger);startMission();loadZone(ZONE_STYLES[id].indexOf('combat'));while(mode==='dialog')nextLine();enemies=[];var log=[];
 for(const ar of world.arenas){let n=0;
  for(;n<12000&&ar.state!=='done';n++){
   if(ar.state==='idle')player.x=Math.min(player.x+3,ar.a+150);
   for(const e of enemies)if(e.hp>0&&e.drop===0&&!e.latched&&e.arena===ar&&n%20===0){e.hp=1;damageEnemy(e,9);}
   if(world.freed&&world.freed.some(f=>f.arena===ar.index&&f.state==='follow'))player.x=world.docks[ar.index].x+10;
   if(world.kinks&&world.kinks.some(k=>k.arena===ar.index)){const k=world.kinks.find(k=>k.arena===ar.index);player.x=k.x-30;player.face=1;if(!player.action)attack('melee');}
   hitStop=0;player.inv=.6;player.y=FLOOR;step(1/60);taps.clear();}
  log.push(ar.state);}
 if(world.mrna)for(let n=0;n<8000&&!world.mrna.delivered;n++){player.x=Math.min(player.x+1.2,world.ribosomeX+40);hitStop=0;player.inv=1;player.y=FLOOR;step(1/60);taps.clear();}
 world.cells.forEach(c=>c.taken=true);player.x=world.terminal.x;terminal();const ok=mode==='task';mode='play';return log.join()+(ok?' station':' blocked');};`);
for(const id of ['atp','rougher','cytoplasm','membrane','golgi','dna','rna']){check(evaluate(`combatBot('${id}')`)==='done,done,done station',id+' combat zone can be played to the end');checks++;}
evaluate(`ranger=RANGERS.find(r=>r.id==='atp');selected=RANGERS.indexOf(ranger);startMission();loadZone(ZONE_STYLES.atp.indexOf('combat'));while(mode==='dialog')nextLine();player.inv=0;player.dodge=0;damagePlayer(1,player.x+20);var c1=world.charge,s1=combatSpeed();var rad=makeEnemy(player.x+40,0);enemies=[rad];rad.hp=1;damageEnemy(rad,9);`);
check(evaluate('c1<100 && s1<1 && world.charge>c1'),'Radicals steal electrons and slow you; beating one gives them back');checks++;
evaluate(`ranger=RANGERS.find(r=>r.id==='cytoplasm');selected=RANGERS.indexOf(ranger);startMission();loadZone(ZONE_STYLES.cytoplasm.indexOf('combat'));while(mode==='dialog')nextLine();enemies=[];var ar=world.arenas[0];player.x=ar.a+150;for(let n=0;n<120;n++){hitStop=0;step(1/60);taps.clear();}var r0=run.retries,w0=ar.wave;guardsIn(ar)[0].value=0;step(1/60);`);
check(evaluate("run.retries===r0+1 && ar.state==='fight' && !enemies.some(e=>e.arena===ar&&e.hp>0) && guardsIn(ar)[0].value>=70"),'A drained station rewinds the wave instead of ending the run');checks++;
evaluate(`for(let n=0;n<240;n++){hitStop=0;step(1/60);taps.clear();}var thief=enemies.find(e=>e.arena===ar&&e.target&&e.hp>0);for(let n=0;n<600&&thief&&!thief.siph;n++){hitStop=0;player.inv=1;step(1/60);taps.clear();}`);
check(evaluate('!!thief && thief.siph'),'Viruses walk to the reaction station and clamp on');checks++;
// Puzzle zones: every room in every Ranger's puzzle zone can be solved, and wrong moves don't solve it.
evaluate(`var puzzleReport=[];var solveRoomFully=(room)=>{let guard=0;
 if(room.kind==='sequence'){const wrong=room.switches.find(s=>s.value!==room.cfg.answer[0]);if(wrong){pressSwitch(room,wrong);if(room.pos!==0)puzzleReport.push(ranger.id+' wrong advanced');}
  while(!room.solved&&guard++<20){const s=room.switches.find(s=>s.value===room.cfg.answer[room.pos]);if(!s){puzzleReport.push(ranger.id+' no switch for '+room.cfg.answer[room.pos]);break;}pressSwitch(room,s);updateRoom(room,.5);}}
 if(room.kind==='carry'){const can=key=>room.machines.find(m=>{const r=m.accept[key];if(!r)return false;if(r.count&&m.need&&m.got>=m.need)return false;if(r.after&&!room.machines.find(x=>x.id===r.after)?.got)return false;return true;});
  while(!room.solved&&guard++<60){
   if(!player.carry){const item=world.items.find(it=>it.room===room.r&&can(it.key)),d=room.dispensers.find(d=>can(d.item));if(!item&&!d){puzzleReport.push(ranger.id+' room '+room.r+' stuck');break;}player.x=item?item.x:d.x;carryInteract();}
   else{const m=can(player.carry.key);if(!m){puzzleReport.push(ranger.id+' nowhere to put '+player.carry.key);break;}player.x=m.x;carryInteract();}
   if(room.motor&&room.count>=room.cfg.goal)for(let n=0;n<3000&&!room.solved;n++)updateRoom(room,1/30);}}
 if(room.kind==='meter'){const v=room.cfg.variant;
  if(v==='lift'){for(let n=0;n<120;n++){room.meter=100;updateLevel(1/60);}if(room.lift.y>room.cfg.ledge+30)puzzleReport.push(ranger.id+' lift too low');room.meter=0;}
  for(const s of room.switches){s.cool=0;pressSwitch(room,s);}if(room.meter<=0)puzzleReport.push(ranger.id+' pump did nothing');
  while(room.meter<100&&guard++<30){for(const s of room.switches){s.cool=0;pressSwitch(room,s);}}
  updateRoom(room,0);if(v==='gate'&&!room.wall.open)puzzleReport.push(ranger.id+' gate stayed shut');
  if(v!=='dissolve'){player.x=room.b+30;updateRoom(room,0);}}
 if(!room.solved)puzzleReport.push(ranger.id+' room '+room.r+' unsolved');};
 for(const r of RANGERS){ranger=r;selected=RANGERS.indexOf(r);startMission();loadZone(ZONE_STYLES[r.id].indexOf('puzzle'));while(mode==='dialog')nextLine();
  for(const room of world.rooms){if(room.cfg.answer&&new Set(room.switches.map(s=>s.value)).size!==room.switches.length)puzzleReport.push(r.id+' duplicate switch');solveRoomFully(room);if(world.cells[room.r].hidden)puzzleReport.push(r.id+' no molecule');}}`);
check(evaluate('puzzleReport.length')===0,'All 42 puzzle rooms solvable: '+evaluate('puzzleReport.join("; ")'));checks+=42;
// The right answer is not parked in the same spot: across 30 set-ups of each sequence room it shows up in several positions,
// and after a correct step the choices scramble (and never put the next answer under the switch just hit).
evaluate(`var spread=[];for(const id of ['dna','rna','ribosome','mitosis','crispr']){for(let r=0;r<3;r++){const kinds=PUZZLE_KIND[id];if(Array.isArray(kinds)&&kinds[r]!=='sequence')continue;const seen=new Set();let fixed=false;for(let k=0;k<30;k++){const room={a:300,b:820,r,kind:'sequence',pos:0,flash:0};setupRoom(newZone('puzzle'),room,id);fixed=room.cfg.fixed;seen.add(room.switches.findIndex(s=>s.value===room.cfg.answer[0]));}if(!fixed)spread.push(id+r+':'+seen.size);}}
 var room2={a:300,b:820,r:2,kind:'sequence',pos:0,flash:0,switches:[]};setupRoom(newZone('puzzle'),room2,'crispr');var hit=room2.switches.find(s=>s.value===room2.cfg.answer[0]),hitAt=room2.switches.indexOf(hit);pressSwitch(room2,hit);updateRoom(room2,.5);var nextAt=room2.switches.findIndex(s=>s.value===room2.cfg.answer[1]);`);
check(evaluate("spread.every(x=>+x.split(':')[1]>=3)"),'Correct answers appear in at least 3 different positions: '+evaluate("spread.join(' ')"));checks++;
check(evaluate("nextAt>=0 && nextAt!==hitAt && room2.switches.length===4"),'After a correct step the choices scramble and include the next answer');checks++;
// Wrong deliveries are rejected with a reason, and steps that need an earlier step wait for it.
const zoneRoom=(id,r)=>`ranger=RANGERS.find(x=>x.id==='${id}');selected=RANGERS.indexOf(ranger);startMission();loadZone(ZONE_STYLES.${id}.indexOf('puzzle'));while(mode==='dialog')nextLine();var rm=world.rooms[${r}];`;
evaluate(zoneRoom('mito',1)+"player.carry=null;var it=world.items.find(i=>i.room===1&&i.key==='nadh');player.x=it.x;carryInteract();player.x=rm.machines.find(m=>m.id==='etc').x;carryInteract();");
check(evaluate("player.carry&&player.carry.key==='nadh' && rm.count===0 && $('toast').textContent.includes('oxygen')"),'Transport chain jams without oxygen and says why');checks++;
evaluate("player.carry=null;player.x=rm.dispensers[0].x;carryInteract();player.x=rm.machines.find(m=>m.id==='o2').x;carryInteract();player.carry={key:'nadh'};player.x=rm.machines.find(m=>m.id==='etc').x;carryInteract();");
check(evaluate("rm.count===1"),'Once oxygen is in place the chain accepts NADH');checks++;
evaluate(zoneRoom('rougher',1)+"player.carry=null;var it=world.items.find(i=>i.room===1&&i.key==='ribosomeFree');player.x=it.x;carryInteract();player.x=rm.machines.find(m=>m.id==='dock').x;carryInteract();");
check(evaluate("player.carry.key==='ribosomeFree' && $('toast').textContent.includes('signal')"),'ER dock turns away a ribosome with no signal sequence');checks++;
evaluate(zoneRoom('lysosome',2)+"player.carry=null;var it=world.items.find(i=>i.room===2&&i.key==='oldProtein');player.x=it.x;carryInteract();player.x=rm.machines.find(m=>m.id==='ribo').x;carryInteract();");
check(evaluate("player.carry.key==='oldProtein' && rm.count===0"),'Undigested parts cannot be recycled before the enzyme vat');checks++;
evaluate(zoneRoom('cytoplasm',2)+"for(let n=0;n<900;n++)updateRoom(rm,1/30);var firstBreak=rm.machines[0].x;");
check(evaluate("!rm.solved && rm.motor.x<firstBreak && rm.motor.blocked"),'The motor protein stops at a broken microtubule');checks++;
evaluate(zoneRoom('rna',1)+"var exon=rm.switches.find(s=>!rm.cfg.answer.includes(s.value));pressSwitch(rm,exon);var intron=rm.switches.find(s=>rm.cfg.answer.includes(s.value));pressSwitch(rm,intron);");
check(evaluate("rm.pos===1 && intron.cut && !exon.cut && rm.mistakes===1"),'Splicing: cutting an exon is a mistake, cutting the intron removes it');checks++;
evaluate(zoneRoom('dna',2)+"var hits=rm.cfg.answer.slice().reverse().map(v=>rm.switches.find(s=>s.value===v));hits.forEach(s=>pressSwitch(rm,s));");
check(evaluate("rm.solved && rm.mistakes===0"),'Proofreading: mismatches can be fixed in any order');checks++;
evaluate(zoneRoom('crispr',0)+"var noPam=rm.switches.find(s=>s.value.split('|')[0]===rm.cfg.answer[0].split('|')[0]&&s.value!==rm.cfg.answer[0]);pressSwitch(rm,noPam);");
check(evaluate("!!noPam && rm.pos===0 && rm.mistakes===1"),'CRISPR: a perfect match with no PAM is not cut');checks++;
// Meter gate closes again as the gradient leaks.
evaluate("ranger=RANGERS.find(r=>r.id==='mito');selected=RANGERS.indexOf(ranger);startMission();loadZone(ZONE_STYLES.mito.indexOf('puzzle'));while(mode==='dialog')nextLine();var mr=world.rooms.find(r=>r.kind==='meter');mr.meter=100;updateRoom(mr,0);var opened=mr.wall.open;for(let n=0;n<600;n++)updateRoom(mr,1/60);");
check(evaluate("opened && !mr.wall.open"),'ATP synthase door closes when the H⁺ gradient runs down');checks++;
// Sequence switches respond to real punches.
evaluate("ranger=RANGERS.find(r=>r.id==='dna');selected=RANGERS.indexOf(ranger);startMission();loadZone(0);while(mode==='dialog')nextLine();enemies=[];var dr=world.rooms[0];var target=dr.switches.find(s=>s.value===dr.cfg.answer[0]);player.x=target.x-30;player.face=1;player.action=null;attack('melee');for(let n=0;n<20;n++){hitStop=0;step(1/60);taps.clear();}");
check(evaluate("dr.pos===1"),'A punch presses the switch in front of the Ranger');checks++;
// ---------- Enemy families ----------
evaluate("ranger=RANGERS.find(r=>r.id==='mitosis');selected=RANGERS.indexOf(ranger);startMission();while(mode==='dialog')nextLine();enemies=[makeEnemy(player.x+40,1)];var m0=enemies[0];damageEnemy(m0,Math.ceil(m0.hp-m0.max/2)+0);");
check(evaluate("enemies.length===2 && enemies.every(e=>e.child&&e.scale<1)"),'Mutated cells split when wounded');checks++;
evaluate("enemies=[makeEnemy(player.x+40,0)];damageEnemy(enemies[0],enemies[0].hp);");check(evaluate("enemies.length===1"),'A killing blow stops the split');checks++;
evaluate("ranger=RANGERS.find(r=>r.id==='dna');selected=RANGERS.indexOf(ranger);startMission();loadZone(1);while(mode==='dialog')nextLine();player.inv=0;player.hp=10;var rv=makeEnemy(player.x+30,0);rv.state='active';rv.attack='claw';rv.timer=.2;rv.face=-1;enemies=[rv];step(1/60);");
check(evaluate("rv.latched && player.latch===rv"),'Retroviruses latch on');checks++;
evaluate("for(let n=0;n<200;n++){step(1/60);taps.clear();}");check(evaluate("player.hp===10 && mode==='play'"),'A latched retrovirus clings on but cannot hurt an invincible Ranger');checks++;
evaluate("taps.add('KeyC');step(1/60);taps.clear();");check(evaluate("!rv.latched && !player.latch"),'Dodging shakes the retrovirus off');checks++;
evaluate("ranger=RANGERS.find(r=>r.id==='golgi');selected=RANGERS.indexOf(ranger);startMission();loadZone(1);while(mode==='dialog')nextLine();player.x=100;var c1=makeEnemy(900,0),c2=makeEnemy(915,0);enemies=[c1,c2];var both=c1.hp+c2.hp;for(let n=0;n<120;n++)updateEnemy(c1,1/60);");
check(evaluate("c1.merged && c1.hp===both && c2.removed"),'Misfolded proteins clump together');checks++;
evaluate("ranger=RANGERS.find(r=>r.id==='crispr');selected=RANGERS.indexOf(ranger);startMission();while(mode==='dialog')nextLine();var mp=makeEnemy(player.x+180,0);mp.timer=0;enemies=[mp];var hopped=false;for(let n=0;n<40;n++){updateEnemy(mp,1/60);if(mp.y<FLOOR-20)hopped=true;}");
check(evaluate("hopped"),'Mini-phages leap');checks++;
evaluate("ranger=RANGERS.find(r=>r.id==='mito');selected=RANGERS.indexOf(ranger);startMission();while(mode==='dialog')nextLine();var fr=makeEnemy(player.x+300,0);enemies=[fr];for(let n=0;n<30;n++)updateEnemy(fr,1/60);");
check(evaluate("fr.y<FLOOR-10"),'Free radicals float');checks++;

// Bots play the hardest meter rooms with real inputs and physics.
evaluate(`var botResult={};var play=(id)=>{ranger=RANGERS.find(r=>r.id===id);selected=RANGERS.indexOf(ranger);startMission();loadZone(ZONE_STYLES[id].indexOf('puzzle'));while(mode==='dialog')nextLine();enemies=[];const m=world.rooms.find(r=>r.kind==='meter');for(const r of world.rooms)if(r!==m){r.solved=true;r.wall.open=true;}if(m.r>0)player.x=m.a-60;return m;};
 var press=()=>{taps.add('KeyZ');};var frames=(n,fn)=>{for(let i=0;i<n&&mode==='play';i++){if(fn)fn(i);hitStop=0;player.hp=10;step(1/60);taps.clear();}};
 // Smooth ER: ride the lift, mash the lever, then jump onto the ledge
 let room=play('smoother');player.x=room.lift.x+35;player.y=room.lift.y;player.face=1;frames(30);
 frames(900,i=>{if(room.lift.y>room.cfg.ledge+24){if(i%14===0)press();}else{keys.add('ArrowRight');if(player.ground&&i%10===0)taps.add('Space');}});keys.clear();
 botResult.smoother=room.solved;
 // Mitochondria: work the first pump until the gradient is high, then sprint to the turbine door
 var pump=(room,until)=>{const s=room.switches.find(s=>!s.high);let go=false;frames(2400,i=>{if(room.solved)return;if(room.meter>=until())go=true;if(!go){if(Math.abs(player.x-(s.x-30))>4){keys.clear();keys.add(player.x<s.x-30?'ArrowRight':'ArrowLeft');}else{keys.clear();player.face=1;if(s.cool<=0&&!player.action&&!player.chain)press();}}else{keys.clear();keys.add('ArrowRight');}});keys.clear();};
 room=play('mito');pump(room,()=>95);botResult.mito=room.solved;
 // Lysosome: keep pumping until the pH reaches 5
 room=play('lysosome');pump(room,()=>101);
 botResult.lysosome=room.solved;`);
check(evaluate('botResult.smoother'),'Bot can climb the hardest calcium lift');checks++;
check(evaluate('botResult.mito'),'Bot can run the hardest ATP synthase door');checks++;
check(evaluate('botResult.lysosome'),'Bot can acidify the lysosome acid chamber');checks++;
console.log(JSON.stringify({checks,missions:14,result:'PASS'}));
