// Deterministic checks for the combat state machine and all mission routes.
class Element {
 constructor(){this.children=[];this.hidden=false;this.style={setProperty(){}};this.classList={add(){},toggle(){}};this.dataset={};this.value='';this.disabled=false;}
 append(...children){this.children.push(...children)}
 replaceChildren(...children){this.children=children}
 setAttribute(){} focus(){} click(){this.onclick?.()} addEventListener(){}
 get firstElementChild(){return this.children[0]||(this.children[0]=new Element())}
 getContext(){return {clearRect(){},drawImage(){},fillRect(){}}}
}
const elements=new Map();
const documentMock={getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id)},createElement(){return new Element()},querySelectorAll(){return []},addEventListener(){}};
const fakeStore={};
const sandbox={document:documentMock,window:{},console,localStorage:{getItem:k=>fakeStore[k]||null,setItem:(k,v)=>fakeStore[k]=v},addEventListener(){},requestAnimationFrame(){},structuredClone:v=>JSON.parse(JSON.stringify(v)),performance:{now:()=>0},setTimeout(){},Image:class{},HTMLInputElement:Element,Blob:class{},URL:{createObjectURL(){return 'test'},revokeObjectURL(){}}};
const context=vm.createContext(sandbox);
vm.runInContext(campaignText+'\n'+missionText+'\n'+puzzleTestText+'\n'+engineText.replace(/load\(\)\.catch\([\s\S]*$/,''),context);
const evaluate=code=>vm.runInContext(code,context);
const check=(condition,message)=>{if(!condition)throw Error(message)};
let checks=0;
check(evaluate('verifyPuzzles()')===56,'All mission and boss puzzles are solvable');checks+=56;
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
  check(evaluate('mode')==='task','Station opens objective');checks++;
  evaluate("solvePuzzle(activePuzzle);renderMissionPuzzle();$('modalActions').children[0].onclick();");
  check(evaluate('world.terminal.done && mode === "play"'),'Correct objective unlocks route');checks++;
  evaluate('player.x=world.length-40;enemies=[];step(1/60)');
  check(evaluate('zone')===z+1,'Exit advances exactly one zone');checks++;
 }
 evaluate("while(mode==='dialog')nextLine();damageEnemy(enemies[0],40);player.x=world.terminal.x;terminal();solvePuzzle(activePuzzle);renderMissionPuzzle();$('modalActions').children[0].onclick();enemies[0].hp=1;damageEnemy(enemies[0],2);hitStop=0;for(let n=0;n<40;n++)step(1/60);");
 check(evaluate('mode')==='quiz','Boss defeat opens debrief');checks++;
 evaluate("$('choices').children[QUIZ[ranger.id][2]].onclick();$('modalActions').children[0].onclick();");
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
console.log(JSON.stringify({checks,missions:14,result:'PASS'}));
