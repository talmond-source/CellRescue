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
vm.runInContext(campaignText+'\n'+questionText+'\n'+diagramText+'\n'+moleculeText+'\n'+levelText+'\n'+missionText+'\n'+puzzleTestText+'\n'+engineText.replace(/load\(\)\.catch\([\s\S]*$/,''),context);
const evaluate=code=>vm.runInContext(code,context);
const check=(condition,message)=>{if(!condition)throw Error(message)};
let checks=0;
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
  evaluate(`loadZone(${z});while(mode==='dialog')nextLine();world.cells.forEach(c=>c.taken=true);player.x=world.terminal.x;terminal();`);
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
// Puzzle zones: every room in every Ranger's puzzle zone can be solved, and wrong moves don't solve it.
evaluate(`var puzzleReport=[];var solveRoomFully=(room)=>{let guard=0;
 if(room.kind==='sequence'){const wrong=room.switches.find(s=>s.value!==room.cfg.answer[0]);if(wrong){pressSwitch(room,wrong);if(room.pos!==0)puzzleReport.push(ranger.id+' wrong advanced');}
  while(!room.solved&&guard++<20){const s=room.switches.find(s=>s.value===room.cfg.answer[room.pos]);if(!s){puzzleReport.push(ranger.id+' no switch for '+room.cfg.answer[room.pos]);break;}pressSwitch(room,s);}}
 if(room.kind==='carry'){while(!room.solved&&guard++<40){
  if(!player.carry){const item=world.items.find(it=>it.room===room.r);const d=room.dispensers[0];player.x=item?item.x:d.x;carryInteract();}
  else{const m=room.machines.find(m=>m.accept[player.carry.key]);if(!m){puzzleReport.push(ranger.id+' nowhere to put '+player.carry.key);break;}player.x=m.x;carryInteract();}}}
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
// Wrong deliveries are rejected with a reason.
evaluate("ranger=RANGERS.find(r=>r.id==='cytoplasm');selected=RANGERS.indexOf(ranger);startMission();loadZone(ZONE_STYLES.cytoplasm.indexOf('puzzle'));while(mode==='dialog')nextLine();var rm=world.rooms[0];player.x=rm.dispensers[0].x;carryInteract();player.x=rm.machines.find(m=>m.id==='mito').x;carryInteract();");
check(evaluate("player.carry.key==='glucose' && rm.count===0 && $('toast').textContent.includes('pyruvate')"),'Mitochondrion rejects glucose and explains why');checks++;
// Meter gate closes again as the gradient leaks.
evaluate("ranger=RANGERS.find(r=>r.id==='mito');selected=RANGERS.indexOf(ranger);startMission();loadZone(ZONE_STYLES.mito.indexOf('puzzle'));while(mode==='dialog')nextLine();var mr=world.rooms[0];mr.meter=100;updateRoom(mr,0);var opened=mr.wall.open;for(let n=0;n<600;n++)updateRoom(mr,1/60);");
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
evaluate(`var botResult={};var play=(id)=>{ranger=RANGERS.find(r=>r.id===id);selected=RANGERS.indexOf(ranger);startMission();loadZone(ZONE_STYLES[id].indexOf('puzzle'));while(mode==='dialog')nextLine();enemies=[];world.rooms[0].solved=world.rooms[1].solved=true;world.rooms[0].wall.open=world.rooms[1].wall.open=true;return world.rooms[2];};
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
check(evaluate('botResult.lysosome'),'Bot can acidify the hardest lysosome chamber');checks++;
console.log(JSON.stringify({checks,missions:14,result:'PASS'}));
