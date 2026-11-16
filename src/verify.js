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
vm.runInContext(campaignText+'\n'+questionText+'\n'+diagramText+'\n'+missionText+'\n'+puzzleTestText+'\n'+engineText.replace(/load\(\)\.catch\([\s\S]*$/,''),context);
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
 evaluate("enemies=[makeEnemy(player.x+45,0)];attack('melee');step(.06);");
 check(evaluate('enemies[0].hp')===5,'Windup must not hit');checks++;
 evaluate('step(.09)');check(evaluate('enemies[0].hp')===3,'Contact must hit once');checks++;
 evaluate('hitStop=0;step(.03)');check(evaluate('enemies[0].hp')===3,'No duplicate hit');checks++;
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
evaluate("selected=1;ranger=RANGERS[1];startMission();while(mode==='dialog')nextLine();enemies=[];player.x=world.gaps[0][0]-20;keys.add('ArrowRight');taps.add('Space');");
for(let n=0;n<55;n++)evaluate('step(1/60);taps.clear()');
check(evaluate('player.x>world.gaps[0][1] && player.y<=302 && player.hp===10'),'Widest gap can be crossed');checks++;
evaluate("keys.clear();player.hp=1;player.inv=0;damagePlayer(1,player.x+20)");check(evaluate('mode')==='lost','Death enters checkpoint retry');checks++;
evaluate("$('modalActions').children[0].onclick();while(mode==='dialog')nextLine()");check(evaluate('player.hp===10 && mode==="play"'),'Retry restores playable state');checks++;
// Dive kick: tuck, dive, hit an enemy below and bounce; or land and send out a shockwave.
evaluate("selected=1;ranger=RANGERS[1];startMission();while(mode==='dialog')nextLine();enemies=[makeEnemy(player.x+75,2)];player.y=FLOOR-120;player.ground=false;player.vy=0;keys.add('ArrowDown');taps.add('KeyZ');step(1/60);taps.clear();keys.clear();");
check(evaluate("player.action.kind")==='dive','Down + Z in the air starts a dive kick');checks++;
check(evaluate("frameForPlayer()")===11,'Dive starts with a tuck');checks++;
evaluate("for(let n=0;n<10;n++){step(1/60);taps.clear();}");check(evaluate("player.action?.kind==='dive' && frameForPlayer()===9 && player.vy>0"),'Dive kick pose plunges downward');checks++;
evaluate("for(let n=0;n<40&&enemies[0].hp===9;n++){hitStop=0;step(1/60);taps.clear();}");
check(evaluate("enemies[0].hp")===4,'Dive kick lands a 5-damage hit');checks++;check(evaluate("player.vy<0 && !player.action"),'Dive kick bounces off the enemy');checks++;
evaluate("hitStop=0;enemies=[];player.y=FLOOR-120;player.ground=false;player.vy=0;player.action=null;keys.add('ArrowDown');taps.add('KeyZ');step(1/60);taps.clear();keys.clear();for(let n=0;n<60&&player.action?.kind==='dive';n++){hitStop=0;step(1/60);taps.clear();}");
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
console.log(JSON.stringify({checks,missions:14,result:'PASS'}));
