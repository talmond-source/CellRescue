'use strict';
const $ = id => document.getElementById(id);
const canvas=$('game'), ctx=canvas.getContext('2d',{alpha:false});
const W=640,H=360,FLOOR=302;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
const keys=new Set(), taps=new Set(), atlases={}, portraits={};
let selected=1, mode='loading', ranger=RANGERS[1], player, zone=0, world, enemies=[],bolts=[],particles=[],pickups=[];
let camera=0, clock=0, hitStop=0, shake=0, comboCount=0, comboTimer=0, toastTimer=0;
let dialog=[], dialogDone, run=null, last=0, accumulator=0, muted=false, audioContext;
let storageOK=true, profile={name:'',results:[],checkpoint:null};
try { const saved=JSON.parse(localStorage.getItem('organelle-patrol-v3')); if(saved&&Array.isArray(saved.results))profile={...profile,...saved}; }catch(e){storageOK=false}
function save(){try{localStorage.setItem('organelle-patrol-v3',JSON.stringify(profile));}catch(e){storageOK=false} $('saveNote').textContent=storageOK?'Progress saves in this browser. Export a copy of your results for class.':'Browser saving is unavailable. Export your results before closing the game.';}
function tone(freq,duration=.08,shape='square',volume=.025){
 if(muted)return;
 try{audioContext ||= new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();
 const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=shape;o.frequency.setValueAtTime(freq,audioContext.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.45),audioContext.currentTime+duration);g.gain.setValueAtTime(volume,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);o.connect(g);g.connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+duration);}catch(e){}
}
function readImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});}
function cleanCell(image,sx,sy,sw,sh,slate=false){
 const c=makeCanvas(sw,sh),g=c.getContext('2d',{willReadFrequently:true});g.drawImage(image,sx,sy,sw,sh,0,0,sw,sh);
 const data=g.getImageData(0,0,sw,sh),p=data.data,seen=new Uint8Array(sw*sh),stack=[];
 const background=i=>{const a=p[i*4+3],r=p[i*4],v=p[i*4+1],b=p[i*4+2];return a<150||(slate?r>=45&&r<95&&v>=60&&v<118&&b>=90&&b<160&&b-v>18&&v-r>4:Math.min(r,v,b)>195&&Math.max(r,v,b)-Math.min(r,v,b)<28);};
 function enqueue(i){if(!seen[i]&&background(i)){seen[i]=1;stack.push(i);}}
 for(let x=0;x<sw;x++){enqueue(x);enqueue((sh-1)*sw+x)}for(let y=0;y<sh;y++){enqueue(y*sw);enqueue(y*sw+sw-1)}
 for(let k=0;k<stack.length;k++){const i=stack[k];p[i*4+3]=0;const x=i%sw,y=Math.floor(i/sw);if(x)enqueue(i-1);if(x<sw-1)enqueue(i+1);if(y)enqueue(i-sw);if(y<sh-1)enqueue(i+sw)}
 // Keep the connected character silhouette; discard detached atlas noise.
 const labels=new Int32Array(sw*sh);let largest=0,largestSize=0,label=0;
 for(let i=0;i<sw*sh;i++){
  if(labels[i]||p[i*4+3]<150)continue;
  label++;const component=[i];labels[i]=label;
  for(let k=0;k<component.length;k++){
   const at=component[k],x=at%sw,y=Math.floor(at/sw);
   for(const next of [x>0?at-1:-1,x<sw-1?at+1:-1,y>0?at-sw:-1,y<sh-1?at+sw:-1]){
    if(next>=0&&!labels[next]&&p[next*4+3]>=150){labels[next]=label;component.push(next);}
   }
  }
  if(component.length>largestSize){largest=label;largestSize=component.length;}
 }
 let minX=sw,minY=sh,maxX=0,maxY=0;
 for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
  const i=y*sw+x;
  if(labels[i]!==largest||p[i*4+3]<150||x<2||x>=sw-2||y<2||y>=sh-2)p[i*4+3]=0;
  else{minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
 }

 g.putImageData(data,0,0);
 return {canvas:c,bounds:[minX,minY,maxX,maxY]};
}
async function loadAtlas(id,cols,rows,height){
 const image=await readImage(ASSETS[id+'-sheet']); const sw=Math.floor(image.width/cols),sh=Math.floor(image.height/rows),raw=[];
 for(let i=0;i<cols*rows;i++)raw.push(cleanCell(image,(i%cols)*sw,Math.floor(i/cols)*sh,sw,sh));
 const baselineHeight=Math.max(1,raw[0].bounds[3]-raw[0].bounds[1]+1),scale=height/baselineHeight;
 atlases[id]=raw.map(({canvas:cell,bounds},i)=>{
 const out=makeCanvas(128,112),g=out.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
 const base=bounds[3]+1;g.drawImage(cell,64-sw*scale/2,102-base*scale,sw*scale,sh*scale);return out;
 });
}
async function loadPortrait(id){
 const image=await readImage(ASSETS[id+'-approved']);const cell=cleanCell(image,0,0,image.width,image.height,true);
 const [x,y,right,bottom]=cell.bounds;const out=makeCanvas(120,160),g=out.getContext('2d');
 const scale=145/Math.max(1,bottom-y);g.drawImage(cell.canvas,60-(x+right)*scale/2,8-y*scale,image.width*scale,image.height*scale);portraits[id]=out;
}
let environment;
const environments={};
function filtered(art,filter){const c=makeCanvas(art.width,art.height),g=c.getContext('2d');g.filter=filter;g.drawImage(art,0,0);return c;}
/* Enemy families. Each one fights differently. Until its own sprite sheet is added (src/packed/<family>-sheet.png,
   4 columns x 3 rows like bacteria-sheet.png), it borrows the bacteria art with a color shift as a stand-in. */
const ENEMY_FAMILY={atp:'radical',ribosome:'misfolded',rougher:'misfolded',golgi:'misfolded',cytoplasm:'bacteria',membrane:'bacteria',mito:'radical',nucleus:'retrovirus',smoother:'radical',lysosome:'bacteria',dna:'retrovirus',rna:'retrovirus',mitosis:'mutant',crispr:'miniphage'};
const FAMILY={
 bacteria:{name:'Bacteria',height:48,speed:1,hp:0,tip:'Bacteria have broken in. Combo them down.'},
 retrovirus:{name:'Retroviruses',height:46,speed:1,hp:0,placeholder:'hue-rotate(150deg) saturate(1.3)',tip:'Retroviruses latch on and drain your health. Attack or dodge (C) to shake them off.'},
 mutant:{name:'Mutated cells',height:50,speed:1.05,hp:1,placeholder:'hue-rotate(230deg) saturate(1.4)',tip:'Mutated cells split in two when wounded. Finish them with big hits like kicks and dive kicks.'},
 misfolded:{name:'Misfolded proteins',height:52,speed:.62,hp:3,placeholder:'hue-rotate(300deg) saturate(.8) brightness(.95)',tip:'Misfolded proteins are slow and tough, and they clump together if you leave them side by side.'},
 radical:{name:'Free radicals',height:40,speed:1.6,hp:-2,placeholder:'hue-rotate(60deg) saturate(1.6) brightness(1.15)',tip:'Free radicals are fast and erratic, and some float. Dive kicks knock floaters down.'},
 miniphage:{name:'Mini-phages',height:46,speed:1,hp:0,placeholder:'hue-rotate(110deg) saturate(.6) brightness(1.2)',tip:'Mini-phages leap at you. Dodge (C) as they come down.'}
};
async function load(){
 document.fonts?.load('16px "Press Start 2P"').catch(()=>{});
 let count=0;const total=RANGERS.length+2;
 for(const r of RANGERS){await Promise.all([loadAtlas(r.id,4,4,74),loadPortrait(r.id)]);$('loadProgress').textContent=++count+'/'+total;}
 await loadAtlas('bacteria',4,3,48);$('loadProgress').textContent=++count+'/'+total;
 for(const [family,info] of Object.entries(FAMILY)){if(family==='bacteria')continue;if(ASSETS[family+'-sheet'])await loadAtlas(family,4,3,info.height);else atlases[family]=atlases.bacteria.map(c=>filtered(c,info.placeholder));}
 await loadAtlas('phage',4,2,104);for(const name of ['environment','archive','membranes'])environments[name]=await readImage(ASSETS[name]);
 environment=environments.environment;
 $('loading').hidden=true;$('student').value=profile.name;buildRoster();selectRanger(selected);save();if(introSeen()||/nointro/.test(location.search))showTitle();else showIntroGate();last=performance.now();requestAnimationFrame(tick);
}
/* head-and-shoulders crop of a Ranger's portrait for the select grid (falls back to the idle sprite) */
const mugs={};
function mugshot(id){
 if(mugs[id])return mugs[id];const out=makeCanvas(160,160),g=out.getContext('2d'),src=portraits[id];
 if(src&&src.getContext){const d=src.getContext('2d').getImageData(0,0,src.width,src.height).data;let top=src.height,xs=0,n=0;
  for(let y=0;y<src.height&&top===src.height;y++)for(let x=0;x<src.width;x++)if(d[(y*src.width+x)*4+3]>40){top=y;break;}
  for(let y=top;y<top+18&&y<src.height;y++)for(let x=0;x<src.width;x++)if(d[(y*src.width+x)*4+3]>40){xs+=x;n++;}
  const cx=n?xs/n:src.width/2,w=74;g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(src,cx-w/2,top-4,w,w,0,0,160,160);}
 else{g.imageSmoothingEnabled=false;g.drawImage(atlases[id][0],-16,-6,192,168);}
 return mugs[id]=out;
}
function buildRoster(){
 $('roster').replaceChildren();RANGERS.forEach((r,i)=>{const b=document.createElement('button');b.className='ranger';b.style.setProperty('--color',r.color);b.setAttribute('aria-label','Select '+r.name+' Ranger');
 const art=mugshot(r.id);
 const title=document.createElement('strong'),SHORT={'Cell Membrane':'Membrane',Mitochondria:'Mito'};const full=document.createElement('span'),short=document.createElement('span');full.className='full';short.className='short';full.textContent=r.name;short.textContent=SHORT[r.name]||r.name;title.append(full,short);const sub=document.createElement('small');const done=profile.results.some(v=>v.ranger===r.id);sub.textContent=done?'Mission cleared ✓':r.role;
 b.append(art,title,sub);if(done){const st=document.createElement('span');st.className='star';st.textContent='★';st.setAttribute('aria-label','cleared');b.append(st);}b.onclick=()=>{selectRanger(i);tone(520,.05,'square');};$('roster').append(b);});
}
function selectRanger(i){selected=i;showcaseClock=0;ranger=RANGERS[i];const ms=$('missionSelect');if(ms.style){ms.style.setProperty('--rc',ranger.color);if(!ms.dataset.bg&&typeof ASSETS!=='undefined'){ms.dataset.bg=1;ms.style.setProperty('--selbg','url('+ASSETS.environment+')');}}
 const route=$('selRoute');if(route&&route.replaceChildren)route.replaceChildren(...(ranger.zones||[]).map(z=>{const li=document.createElement('li');li.textContent=z;return li;}));
 const cleared=new Set(profile.results.map(v=>v.ranger)).size;if($('selCount'))$('selCount').textContent=cleared+'/'+RANGERS.length+' CLEARED';$('selectedName').textContent=ranger.name+' Ranger';$('selectedRole').textContent=ranger.role.toUpperCase();$('selectedStory').textContent=ranger.intro;
 const g=$('selectedArt').getContext('2d');g.clearRect(0,0,300,280);g.imageSmoothingEnabled=false;g.drawImage(atlases[ranger.id][0],-10,-4,320,280);
 [...$('roster').children].forEach((b,j)=>{b.classList.toggle('selected',i===j);b.setAttribute('aria-pressed',String(i===j));});$('resume').hidden=profile.checkpoint?.id!==ranger.id;
}
function showModal(tag,title,text,actions=[]){$('panel').classList.toggle('scan',false);$('overlay').classList.toggle('full',false);$('modalText').hidden=false;$('modalTag').textContent=tag;$('modalTitle').textContent=title;$('modalText').textContent=text;$('choices').replaceChildren();$('modalActions').replaceChildren();for(const [label,fn]of actions){const b=document.createElement('button');b.textContent=label;b.onclick=fn;$('modalActions').append(b)}$('overlay').hidden=false;keys.clear();taps.clear();}
function talk(lines,done){mode='dialog';dialog=lines.slice();dialogDone=done;$('speech').hidden=false;keys.clear();taps.clear();nextLine()}
/* Story text types out letter by letter. Enter / Continue first finishes the line, then advances. */
let typing=null;
function renderTyping(){const t=typing,n=Math.floor(t.shown);$('lineShown').textContent=t.text.slice(0,n);$('lineRest').textContent=t.text.slice(n);$('next').textContent=n<t.text.length?'Skip ▸▸':'Continue ↵';}
function typeStep(dt){
 const t=typing;if(!t||t.shown>=t.text.length)return;
 if(t.wait>0){t.wait-=dt;return;}
 const before=Math.floor(t.shown);t.shown=Math.min(t.text.length,t.shown+dt*52);const now=Math.floor(t.shown);
 if(now>before){const ch=t.text[now-1];if('.!?'.includes(ch)&&t.text[now]===' ')t.wait=.2;else if(',;:—'.includes(ch))t.wait=.08;
  if(/\S/.test(ch)&&++t.count%2===0)tone(t.pitch+(t.count%3)*40,.025,'triangle',.012);renderTyping();}
}
function nextLine(){if(mode!=='dialog')return;if(typing&&typing.shown<typing.text.length){typing.shown=typing.text.length;typing.wait=0;renderTyping();return;}if(!dialog.length){typing=null;$('speech').hidden=true;dialogDone();canvas.focus();return;}const [id,raw]=dialog.shift(),text=keyWords(raw);$('speaker').textContent=id==='phage'?'PHAGE':(RANGERS.find(r=>r.id===id)?.name||'CRISPR')+' RANGER';typing={text,shown:0,wait:.12,count:0,pitch:id==='phage'?260:id==='crispr'?560:680};$('line').setAttribute('aria-label',text);renderTyping();const g=$('portrait').getContext('2d');g.fillStyle='#203953';g.fillRect(0,0,72,88);g.imageSmoothingEnabled=false;if(portraits[id])g.drawImage(portraits[id],27,0,70,68,0,0,72,88);else g.drawImage(atlases.phage[0],30,0,66,66,0,0,72,88);}
function startMission(resume=false){
 profile.name=$('student').value.trim();const cp=resume&&profile.checkpoint?.id===ranger.id?profile.checkpoint:null;
 run=cp?.run?structuredClone(cp.run):{id:Date.now(),seconds:0,answers:[],retries:0,score:0};
 $('missionSelect').hidden=true;$('screen').hidden=false;$('controls').hidden=false;$('mobile').hidden=false;document.body?.classList?.add('playing');$('pause').hidden=false;loadZone(cp?cp.zone:0);tone(520,.15,'triangle');
}
function makeWorld(index){
 const boss=index===3,route=RANGERS.findIndex(r=>r.id===ranger.id);
 const w=boss?{...newZone('boss'),length:1100,platforms:[[280,110,235],[700,110,235]]}:buildZone(index,route);
 return Object.assign(w,{terminal:{x:boss?170:w.length-180,done:false},boss,cleared:false,shieldUnlocked:false,shieldActive:false});
}
function loadZone(index){
 zone=index;world=makeWorld(index);
 environment=environments[['nucleus','dna','rna','mitosis','crispr'].includes(ranger.id)?'archive':['atp','membrane','mito','golgi','smoother','lysosome'].includes(ranger.id)?'membranes':'environment'];player={x:90,y:FLOOR,vx:0,vy:0,face:1,hp:10,energy:6,ground:true,coyote:.1,jumpBuffer:0,action:null,inv:0,dodge:0,dodgeCool:0,energyClock:0,runClock:0,chain:0,combo:0,queue:false,carry:null,ride:null,latch:null};
 enemies=[];if(world.boss)enemies.push(makeEnemy(790,3));else for(const [x,type] of world.spawns)enemies.push(makeEnemy(x,type));
 camera=0;bolts=[];particles=[];pickups=[];ghosts=[];rings=[];hitStop=0;shake=0;comboCount=0;comboTimer=0;$('overlay').hidden=true;$('speech').hidden=true;
 profile.checkpoint={id:ranger.id,zone,run:structuredClone(run)};save();
 const intro=world.boss?ranger.boss:ranger.tasks[zone][0]+'. '+(zone===0?ranger.intro:'The next station is in '+ranger.zones[zone]+'.');
 const molecule=CARGO[ranger.id][zone]?.toLowerCase();
 const styleLine={platform:'The route ahead is broken. Ride the moving platforms, stay out of the toxic pools, and grab the three '+molecule+' molecules.',
  combat:'Phage forces are massing here. Survive each lockdown wave and I’ll recover a '+molecule+' molecule from every arena.',
  puzzle:'Three gates are sealed with biology locks. Solve each one to free a '+molecule+' molecule.'}[world.style];
 const lines=[['crispr',intro],[ranger.id,world.boss?'At half strength he will raise a shield. I’ll use the control station on the left to disable it, then finish the fight.':styleLine]];
 if(world.style==='puzzle')lines.push([ranger.id,world.rooms[0].cfg.line.replace(/\.$/,'')+'. '+(world.rooms[0].kind==='carry'?'E picks things up and uses machines.':world.rooms[0].kind==='sequence'?'I hit the switches with punches, kicks or dive kicks.':'I hit the switches with punches or kicks.')]);
 if(zone===0)lines.push(['crispr','Z chains two punches into a kick. Press Z in the air to slam down with a dive kick. X draws your blaster and C dodges. Press E at the station when you have all three molecules.']);
 if(zone===0&&!world.boss)lines.push(['crispr',FAMILY[ENEMY_FAMILY[ranger.id]].tip]);
 talk(lines,()=>mode='play');updateHUD();
}
function makeEnemy(x,type){const family=type===3?'phage':ENEMY_FAMILY[ranger.id]||'bacteria',info=FAMILY[family],hp=type===3?70:Math.max(3,5+type*2+(info?.hp||0));return {x,y:FLOOR,home:x,type,family,hp,max:hp,face:-1,state:'approach',timer:.4+(x%5)*.1,clock:0,hurt:0,dead:0,attackCount:0,hit:false,walk:0,scale:1,drop:0,lift:0};}
/* on touch screens, key names in messages become the on-screen button names */
function keyWords(t){if(!touchUI.on)return t;return t.replace(/\bZ chains/g,'B chains').replace(/([Pp])ress Z\b/g,'$1ress B').replace(/\bX draws/g,'X draws').replace(/\bC dodges/g,'L dodges').replace(/\(C\)/g,'(L)').replace(/\b([Pp])ress E\b/g,'$1ress USE');}
function toast(text,seconds=2.8){text=keyWords(text);$('toast').textContent=text;$('toast').hidden=false;toastTimer=seconds;}
function updateHUD(){if(!player)return;$('rangerName').textContent=ranger.name.toUpperCase();$('health').firstElementChild.style.width=player.hp*10+'%';$('health').setAttribute('aria-valuenow',player.hp);$('energy').textContent='BLASTER '+Math.floor(player.energy)+'/6';const count=world.cells.filter(c=>c.taken).length;const extra=world.lock?'LOCKDOWN · wave '+Math.max(1,world.lock.wave+1)+'/'+world.lock.waves.length:world.style==='puzzle'?puzzleObjective():null;$('objective').textContent=world.boss?(world.shieldActive&&!world.shieldUnlocked?'PHAGE SHIELD · Left station [E]':'PHAGE · Final encounter'):ranger.zones[zone]+' · '+(world.terminal.done?'Reach the exit':extra&&count<3?extra+' · '+CARGO[ranger.id][zone]+' '+count+'/3':count<3?CARGO[ranger.id][zone]+' '+count+'/3':'Activate station [E]');}
function burst(x,y,color,count=12){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=30+Math.random()*120;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-40,life:.25+Math.random()*.25,max:.5,color});}}
function attack(kind){if(player.dodge>0||player.inv>.68)return;if(player.action){if(kind==='melee')player.queue=true;return;}if(kind==='shoot'&&player.energy<1){toast('Blaster recharging — melee restores energy');return;}
 if(kind==='melee'){player.combo=player.chain>0?player.combo%3+1:1;player.action={kind:player.combo===3?'kick':'punch',time:0,duration:player.combo===3?.5:.34,hit:false};player.queue=false;}
 else{player.action={kind:'shoot',time:0,duration:.48,hit:false};player.energy-=1;updateHUD();}
}
/* Dive kick: press Z (attack) in the air. A short tuck, then a steep diagonal kick.
   Hitting an enemy bounces the Ranger back up; hitting the floor sends out a small shockwave. */
const DIVE_TUCK=.12;let ghosts=[],rings=[];
function diveKick(){const p=player;if(p.action||p.dodge>0||p.inv>.68)return;p.action={kind:'dive',time:0,duration:Infinity,hit:false};p.queue=false;tone(300,.08,'triangle');}
function updateDive(p,dt){
 const a=p.action;a.time+=dt;if(a.time<DIVE_TUCK)return;
 if(!a.whoosh){a.whoosh=true;tone(620,.16,'sawtooth',.018);}
 a.trail=(a.trail||0)+dt;if(a.trail>.025){a.trail=0;ghosts.push({x:p.x,y:p.y,face:p.face,life:.2});}
 if(Math.random()<.6)particles.push({x:p.x-p.face*(10+Math.random()*30),y:p.y-20-Math.random()*50,vx:-p.face*120,vy:-200,life:.12,max:.12,color:'#e9fff8'});
 const footX=p.x+p.face*29,footY=p.y-2;
 const room=roomAt(p.x);if(room?.switches)for(const s of room.switches){const top=switchBase(room,s)-30;if(Math.abs(s.x-footX)<28&&footY>top-6&&footY<top+30){pressSwitch(room,s);hitStop=.05;p.vy=-300;p.vx=-p.face*60;p.action=null;p.chain=.5;return;}}
 for(const e of enemies){
  if(e.hp<=0)continue;const boss=e.type===3;
  if(Math.abs(e.x-footX)<(boss?46:32)&&footY>e.y-(boss?102:50)&&footY<e.y+6){
   damageEnemy(e,5,36);hitStop=.07;shake=5;burst(footX,footY-6,'#fff4c2',16);
   p.vy=-330;p.vx=-p.face*70;p.action=null;p.chain=.5;p.energy=Math.min(6,p.energy+.5);tone(140,.12,'square',.03);updateHUD();return;
  }
 }
 if(p.ground){
  for(const e of enemies)if(e.hp>0&&Math.abs(e.x-p.x)<72&&Math.abs(e.y-p.y)<24)damageEnemy(e,2,24);
  rings.push({x:p.x+p.face*18,y:p.y,life:.38});shake=Math.max(shake,5);burst(p.x+p.face*18,p.y-4,'#9fe8ff',14);tone(70,.18,'sawtooth',.035);
  p.vx=0;p.action={kind:'land',time:0,duration:.2,hit:true};
 }
}
function damageEnemy(e,amount,knock=14){
 if(e.hp<=0)return;
 if(e.type===3&&!world.shieldUnlocked){
  if(world.shieldActive){toast('Shield active — use the left station [E]');return;}
  if(e.hp-amount<=e.max/2){
   e.hp=e.max/2;world.shieldActive=true;bolts=[];
   toast('Phage shield online — restore the left control station');updateHUD();return;
  }
 }
 e.hp=Math.max(0,e.hp-amount);e.hurt=.16;if(e.latched)releaseLatch(e);
 if(e.family==='mutant'&&!e.child&&e.hp>0&&e.hp<=e.max/2)splitMutant(e);if(e.type!==3){enemyStep(e,e.x+player.face*knock);e.state='recover';e.timer=.3;}
 burst(e.x,e.y-(e.type===3?55:27),'#d0fff0',e.hp?10:24);hitStop=.045;shake=e.type===3?3:2;comboCount++;comboTimer=1.6;run.score+=amount*10;tone(e.hp?120:75,.09,'sawtooth');
  if(e.hp===0){e.dead=.5;if(e.type!==3&&!e.removed)pickups.push({x:e.x,y:FLOOR-20,kind:'energy',life:16});else{world.cleared=true;bolts=[];toast('Phage defeated — the cell is recovering');}}
}
function splitMutant(e){
 e.child=true;e.max=Math.ceil(e.max/2);e.hp=Math.min(e.hp,e.max);e.scale=.74;
 const twin={...e,x:clamp(e.x+player.face*24,35,world.length-35),face:-e.face,timer:.5,state:'recover',hurt:.2};enemies.push(twin);
 burst(e.x,e.y-20,'#c58cff',16);if(!world.splitTold){world.splitTold=true;toast('The mutated cell divided — finish them fast!');}
}
function releaseLatch(e){e.latched=false;if(player.latch===e)player.latch=null;e.x=clamp(e.x-player.face*44,35,world.length-35);e.y=FLOOR;e.state='recover';e.timer=.9;e.hurt=.25;burst(player.x,player.y-30,'#a8ffd9',10);}
function damagePlayer(amount,sourceX){if(player.inv>0||player.dodge>0||mode!=='play')return;/* Rangers are invincible: learning, not reflexes, decides the mission. A hit still flashes and pushes back. */player.inv=.85;player.action=null;player.queue=false;player.vx=(player.x<sourceX?-1:1)*110;shake=4;burst(player.x,player.y-35,'#ff7999');tone(90,.12,'sawtooth');updateHUD();}
function terminal(){
 if(world.terminal.done||Math.abs(player.x-world.terminal.x)>70){if(world.style==='puzzle'&&!world.boss)carryInteract();return;}
 if(world.boss){
  if(!world.shieldActive){toast('The shield controls will activate at half boss health');return;}
  openMissionPuzzle(true);return;
 }
 if(world.cells.some(c=>!c.taken)){toast('Collect the three mission capsules first');return;}
 openMissionPuzzle();
}
function finishMission(){askQuestion(4,correct=>complete(correct));}
function complete(correct){
 const result={name:profile.name||'Player',ranger:ranger.id,mission:ranger.title,date:new Date().toISOString(),seconds:Math.round(run.seconds),score:run.score+(correct?500:0),retries:run.retries,answers:run.answers};
 if(!profile.results.some(r=>r.runId===run.id))profile.results.push({...result,runId:run.id});profile.checkpoint=null;save();mode='complete';
 showModal('MISSION COMPLETE',ranger.name+' Ranger restored the route',ranger.tasks.map(t=>t[4]).join(' '),[['Choose next Ranger',goHome],['Export results',exportResults],['Replay mission',()=>startMission()]]);
}
function goHome(){mode='select';keys.clear();taps.clear();$('screen').hidden=true;$('controls').hidden=true;$('mobile').hidden=true;document.body?.classList?.remove('playing');$('pause').hidden=true;$('missionSelect').hidden=false;buildRoster();selectRanger(selected);}
function exportResults(){
 const rows=[['Student','Ranger','Mission','Completed','Seconds','Score','Retries','Question','Answer','Correct']];for(const result of profile.results){for(const answer of result.answers)rows.push([result.name,RANGERS.find(r=>r.id===result.ranger)?.name||result.ranger,result.mission,result.date,result.seconds,result.score,result.retries,answer.question,answer.answer,answer.correct?'Yes':'No']);}
 const quote=v=>'"'+String(v).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';const blob=new Blob(['\ufeff'+rows.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Organelle-Rangers-results.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function pause(){if(mode==='play'){mode='pause';showModal('PAUSED',ranger.title,'Take a breather. Your current zone will wait.',[['Resume',()=>{$('overlay').hidden=true;mode='play';canvas.focus();}],['Restart zone',()=>loadZone(zone)],['Choose a Ranger',goHome]]);}else if(mode==='pause'){$('overlay').hidden=true;mode='play';canvas.focus();}}
function surfaces(x){/* kept for older callers */const list=world.platforms.filter(([a,w])=>x>=a-6&&x<=a+w+6).map(p=>p[2]);if(!world.gaps.some(([a,b])=>x>a&&x<b))list.push(FLOOR);return list.sort((a,b)=>a-b);}
function step(dt){
 if(mode!=='play')return;
 run.seconds+=dt;clock+=dt;if(hitStop>0){hitStop-=dt;return;}
 const p=player;for(const key of ['inv','dodge','dodgeCool','chain','coyote','jumpBuffer'])p[key]=Math.max(0,p[key]-dt);
 if(comboTimer>0)comboTimer-=dt;else comboCount=0;
 if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').hidden=true;}
 if(p.ground)p.coyote=.1;
 if(taps.has('ArrowUp')||taps.has('Space'))p.jumpBuffer=.12;
 if(p.jumpBuffer&&p.coyote){p.vy=-420;p.ground=false;p.coyote=0;p.jumpBuffer=0;tone(360,.09,'triangle');}
 if(taps.has('KeyZ')){if(!p.ground)diveKick();else attack('melee');}if(taps.has('KeyX'))attack('shoot');
 if(taps.has('KeyC')&&!p.dodgeCool&&!p.action){if(p.latch)releaseLatch(p.latch);p.dodge=.24;p.dodgeCool=.8;burst(p.x,p.y-10,'#8effeb',5);tone(260,.08,'triangle');}
 if(taps.has('KeyE'))terminal();if(mode!=='play')return;
 const direction=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
 if(direction&&!p.action&&!p.dodge)p.face=direction;
 updateLevel(dt);if(mode!=='play')return;
 if(p.ground&&p.ride){p.x+=p.ride.dx||0;p.y+=p.ride.dy||0;}
 const diving=p.action?.kind==='dive';
 if(diving){if(p.action.time<DIVE_TUCK){p.vx=0;p.vy=-40;}else{p.vx=p.face*270;p.vy=660;}}
 else{const target=(p.dodge?p.face*360:direction*(p.action?30:152))*(p.latch?.55:1);const acceleration=p.ground?1500:700;p.vx+=clamp(target-p.vx,-acceleration*dt,acceleration*dt);}
 const oldX=p.x;p.x=blockByWalls(oldX,clamp(p.x+p.vx*dt,20,world.length-25),p.y);p.runClock+=Math.abs(p.vx)*dt/16;
 const oldY=p.y;if(!diving)p.vy+=950*dt;p.y+=p.vy*dt;p.ground=false;
 p.ride=null;for(const s of surfacesAt(p.x))if(p.vy>=0&&oldY<=Math.max(s.y,s.prev)+.5&&p.y>=s.y){p.y=s.y;p.vy=0;p.ground=true;p.ride=s.mover||null;break;}
 if(p.y>H+90){p.inv=0;damagePlayer(2,p.x);if(mode!=='play')return;const gap=world.gaps.find(([a,b])=>p.x>a-30&&p.x<b+30);p.x=gap?gap[0]-35:90;p.y=FLOOR;p.vy=0;p.inv=1;}
 p.energyClock+=dt;if(p.energyClock>=2){p.energyClock=0;p.energy=Math.min(6,p.energy+.5);updateHUD();}
 if(p.action?.kind==='dive')updateDive(p,dt);
 else if(p.action){const a=p.action;a.time+=dt;const contact=a.kind==='shoot'?.2:a.kind==='kick'?.2:.14;
  if(!a.hit&&a.time>=contact){a.hit=true;if(a.kind==='shoot'){bolts.push({x:p.x+p.face*40,y:p.y-48,vx:p.face*500,life:1.2,enemy:false,damage:3});tone(800,.12,'sawtooth');}
   else{tone(a.kind==='kick'?170:240,.07,'triangle');if(p.latch)releaseLatch(p.latch);strikeSwitches(p.x,p.face,a.kind==='kick'?80:62);for(const e of enemies)if(e.hp>0&&(e.x-p.x)*p.face>-15&&Math.abs(e.x-p.x)<(a.kind==='kick'?87:68)&&Math.abs(e.y-p.y)<65){damageEnemy(e,a.kind==='kick'?4:2,a.kind==='kick'?32:12);p.energy=Math.min(6,p.energy+.25);}updateHUD();}}
  if(a.time>=a.duration){const queued=p.queue;p.action=null;p.chain=.5;if(queued)attack('melee');}
 }
 for(const e of enemies)updateEnemy(e,dt);
 for(const b of bolts){const before=b.x;b.x+=b.vx*dt;b.life-=dt;if(b.enemy){if(p.x>=Math.min(before,b.x)-11&&p.x<=Math.max(before,b.x)+11&&Math.abs(b.y-(p.y-35))<30){damagePlayer(b.damage,p.x-Math.sign(b.vx));b.life=0;}}
 else for(const e of enemies)if(e.hp>0&&e.x>=Math.min(before,b.x)-20&&e.x<=Math.max(before,b.x)+20&&Math.abs(b.y-(e.y-(e.type===3?55:25)))<(e.type===3?52:33)){damageEnemy(e,b.damage,9);b.life=0;break;}}
 bolts=bolts.filter(b=>b.life>0);
 for(const cell of world.cells)if(!cell.taken&&!cell.hidden&&Math.abs(cell.x-p.x)<26&&Math.abs(cell.y-(p.y-30))<44){cell.taken=true;burst(cell.x,cell.y,ranger.color,15);run.score+=100;tone(620,.13,'triangle');updateHUD();const n=world.cells.filter(c=>c.taken).length,[name,,fact]=MOLECULES[ranger.id][zone];toast(name+' '+n+'/3 — '+fact,n===1?5:3);}
 for(const item of pickups){item.life-=dt;if(Math.abs(item.x-p.x)<25&&Math.abs(item.y-(p.y-20))<45){if(item.kind==='health')p.hp=Math.min(10,p.hp+2);else p.energy=Math.min(6,p.energy+2);item.life=0;tone(480,.09,'triangle');updateHUD();}}
 pickups=pickups.filter(p=>p.life>0);
 for(const m of particles){m.life-=dt;m.x+=m.vx*dt;m.y+=m.vy*dt;m.vy+=250*dt;}particles=particles.filter(m=>m.life>0);for(const g of ghosts)g.life-=dt;ghosts=ghosts.filter(g=>g.life>0);for(const r of rings)r.life-=dt;rings=rings.filter(r=>r.life>0);shake=Math.max(0,shake-dt*22);
 const camTarget=world.lock?clamp((world.lock.a+world.lock.b)/2-W/2,0,world.length-W):clamp(p.x-W*.38,0,world.length-W);camera+=(camTarget-camera)*Math.min(1,dt*8);
 if(world.boss&&world.cleared&&enemies.every(e=>e.dead<=0)){finishMission();return;}
 if(!world.boss&&p.x>world.length-65){if(world.terminal.done)loadZone(zone+1);else if(toastTimer<=0)toast('Restore the station before leaving this zone');}
}
function enemyStep(e,nx){if(world.gaps.some(([a,b])=>nx>a-18&&nx<b+18))return false;for(const w of world.walls)if(!w.open&&(e.x-w.x)*(nx-w.x)<=0)return false;if(e.arena)nx=clamp(nx,e.arena.a+20,e.arena.b-20);e.x=clamp(nx,35,world.length-35);return true;}
function updateEnemy(e,dt){
 e.clock+=dt;e.hurt=Math.max(0,e.hurt-dt);if(e.hp<=0){e.dead=Math.max(0,e.dead-dt);return;}
 if(e.drop<0){e.drop=Math.min(0,e.drop+520*dt);e.y=FLOOR+e.drop;if(!e.drop){burst(e.x,FLOOR-6,'#d0fff0',10);shake=Math.max(shake,2);}return;}
 const fam=FAMILY[e.family]||{};
 if(e.latched){const p=player;e.x=p.x-p.face*10;e.y=p.y;e.drain=(e.drain||0)+dt;if(e.drain>1.5){e.drain=0;p.inv=0;damagePlayer(1,e.x);}return;}
 if(e.family==='radical'&&e.type!==2){e.y=FLOOR-18-Math.round(Math.sin(e.clock*3.3+e.home)*10+10);}
 if(e.family==='misfolded'&&!e.merged){const o=enemies.find(o=>o!==e&&o.family==='misfolded'&&o.hp>0&&!o.merged&&Math.abs(o.x-e.x)<34);
  if(o){e.mergeT=(e.mergeT||0)+dt;if(e.mergeT>1.3){e.hp+=o.hp;e.max+=o.max;e.merged=true;e.scale=1.28;o.hp=0;o.removed=true;o.dead=.01;burst(e.x,e.y-30,'#ffb3e0',20);toast('Misfolded proteins clumped together!');}}else e.mergeT=0;}
 if(e.family==='miniphage'&&e.type!==1){
  if(e.air){e.x=enemyStep(e,e.x+e.hopVx*dt)?e.x:e.x;e.vy+=950*dt;e.lift+=e.vy*dt;if(e.lift>=0){e.lift=0;e.air=false;e.timer=.9;e.state='recover';burst(e.x,FLOOR-4,'#d0fff0',8);if(Math.abs(e.x-player.x)<38&&Math.abs(player.y-FLOOR)<30)damagePlayer(1,e.x);}e.y=FLOOR+e.lift;return;}
  const dx=player.x-e.x;if(e.state==='approach'&&e.timer<=0&&Math.abs(dx)<260&&Math.abs(dx)>30&&Math.abs(e.x-player.x)<W*.8){e.air=true;e.vy=-360;e.lift=-1;e.hopVx=Math.sign(dx)*Math.min(170,Math.abs(dx)/0.76);e.face=Math.sign(dx)||1;tone(420,.08,'triangle',.015);return;}
 }
 if(Math.abs(e.x-player.x)>W*.8)return;e.timer-=dt;const dx=player.x-e.x,dist=Math.abs(dx);if(e.state==='approach')e.face=dx>=0?1:-1;
 if(e.hurt>0)return;
 const boss=e.type===3;
 if(e.state==='approach'){
  const range=e.type===1?240:boss?170:62;
  if(dist>range){const jitter=e.family==='radical'?Math.sin(e.clock*7+e.home)*.9:0;const nx=e.x+(e.face+jitter)*(boss?47:e.type===2?68:48)*(fam.speed||1)*dt;if(enemyStep(e,nx))e.walk+=dt*9*(fam.speed||1);}
  if(dist<range+30&&e.timer<=0){e.state='windup';e.timer=boss?.7:.48;e.hit=false;e.attackCount++;e.attack=boss?(e.attackCount%3===0?'blast':'slam'):e.type===1?'spit':e.type===2?'charge':'claw';}
 }else if(e.state==='windup'&&e.timer<=0){e.state='active';e.timer=e.attack==='charge'?.38:.22;
  if(e.attack==='blast'||e.attack==='spit'){bolts.push({x:e.x+e.face*35,y:e.y-(boss?49:29),vx:e.face*(boss?250:165),life:2.5,enemy:true,damage:boss?2:1});if(boss&&e.hp<35)bolts.push({x:e.x+e.face*35,y:e.y-90,vx:e.face*220,life:2.5,enemy:true,damage:1});tone(95,.18,'sawtooth');}
 }else if(e.state==='active'){
  if(e.attack==='charge'){enemyStep(e,e.x+e.face*210*(e.family==='misfolded'?.7:1)*dt);}
  if(!e.hit&&e.attack!=='spit'&&e.attack!=='blast'&&Math.abs(e.x-player.x)<(boss?125:55)&&Math.abs(e.y-player.y)<(boss?50:40)){const could=player.inv<=0&&player.dodge<=0;damagePlayer(boss?2:1,e.x);e.hit=true;
   if(could&&e.family==='retrovirus'&&e.type===0&&!player.latch&&mode==='play'){e.latched=true;player.latch=e;e.drain=0;toast('A retrovirus latched on — attack or dodge to shake it off!');}}
  if(e.timer<=0){e.state='recover';e.timer=boss?1.1:.65;}
 }else if(e.state==='recover'&&e.timer<=0){e.state='approach';e.timer=boss?.65:.35;}
}
function frameForPlayer(){const p=player;if(p.inv>.68)return 15;if(p.dodge>0)return 11;if(p.action){const a=p.action,t=a.time/a.duration;
 if(a.kind==='dive')return a.time<DIVE_TUCK?11:9;
 if(a.kind==='land')return 10;
 if(a.kind==='shoot')return t<.28?12:t<.42?13:t<.7?14:13;
 if(a.kind==='kick')return t<.32?8:t<.7?9:10;
 return t<.22?4:t<.41?5:t<.7?6:7;
 }if(!p.ground)return 11;if(Math.abs(p.vx)>15)return [1,2,3,2][Math.floor(p.runClock)%4];return 0;}
function frameForEnemy(e){if(e.type!==3&&(e.air||e.latched))return e.type*4+3;if(e.type===3){if(e.hp<=0)return 7;if(e.hurt>0)return 6;if(e.state==='windup')return e.attack==='blast'?4:2;if(e.state==='active')return e.attack==='blast'?5:3;return Math.floor(e.walk)%2;}return e.type*4+(e.state==='windup'?2:e.state==='active'?3:Math.floor(e.walk)%2);}
function rect(color,x,y,w,h){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
function text(value,x,y,size=10,color='#e8fff5',align='left'){ctx.font='bold '+size+'px monospace';ctx.textAlign=align;ctx.fillStyle='#081120';ctx.fillText(value,x+1,y+1);ctx.fillStyle=color;ctx.fillText(value,x,y);}
function drawSprite(id,index,x,y,face=1,alpha=1,rot=0,scale=1){const art=atlases[id]?.[index];if(!art)return;ctx.save();ctx.translate(Math.round(x-camera),Math.round(y));ctx.scale(face*scale,scale);if(rot){ctx.translate(0,DIVE_DROP-38);ctx.rotate(rot);ctx.translate(0,38);}ctx.globalAlpha=alpha;ctx.drawImage(art,-64,-102);ctx.restore();}
const DIVE_ANGLE=.72,DIVE_DROP=9;
function drawPlatform(x,y,w,base=false){x-=camera;rect('#0a182b',x,y,w,base?60:18);rect('#6ecbbf',x,y,w,3);rect('#a8fbe1',x+2,y,w-4,1);rect('#324b66',x,y+4,w,base?48:12);rect('#17283e',x,y+13,w,3);
 for(let j=0;j<w;j+=32){rect('#52788a',x+j+3,y+6,23,2);rect('#0f1f34',x+j+28,y+5,2,base?42:10);rect('#93d5c5',x+j+8,y+10,2,2);if(base){rect('#243c56',x+j+4,y+20,21,22);rect('#405e75',x+j+6,y+22,18,1);rect('#547b84',x+j+10,y+39,9,2);}}
 if(!base){rect('#42657d',x+7,y+17,5,12);rect('#42657d',x+w-12,y+17,5,12);}}
function draw(){
 if(!world||$('screen').hidden)return;ctx.imageSmoothingEnabled=false;ctx.save();ctx.clearRect(0,0,W,H);if(shake)ctx.translate(Math.round((Math.random()-.5)*shake),Math.round((Math.random()-.5)*shake));
 const bgW=H*environment.width/environment.height,offset=(camera*.26+zone*220)%bgW;ctx.drawImage(environment,-offset,0,bgW,H);ctx.drawImage(environment,bgW-offset,0,bgW,H);rect('#07152655',0,0,W,H);
 // Fine drifting motes give depth without changing the collision surface.
 for(let i=0;i<24;i++){const x=((i*79-clock*(4+i%3)-camera*.12)%W+W)%W,y=70+(i*47)%210;rect(i%3?'#80d8d755':'#f9d98a77',x,y,1,1);}
 let from=0;for(const [a,b]of [...world.gaps,[world.length,world.length]]){if(a>camera&&from<camera+W)drawPlatform(Math.max(from,Math.floor(camera/32)*32),FLOOR,Math.min(a,camera+W+32)-Math.max(from,Math.floor(camera/32)*32),true);from=b;}
 for(const [x,w,y]of world.platforms)if(x+w>camera&&x<camera+W)drawPlatform(x,y,w);
 drawLevelBack();
 world.cells.forEach((cell,i)=>{if(cell.taken||cell.hidden)return;const x=cell.x-camera,y=cell.y+Math.sin(clock*3+cell.x)*3;if(x<-40||x>W+40)return;const [name,icon]=MOLECULES[ranger.id][zone];
  ctx.fillStyle='#7cf7df22';ctx.beginPath();ctx.arc(x,y,17,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#9fffea';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,17+Math.sin(clock*4)*1.5,0,Math.PI*2);ctx.stroke();
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(moleculeIcon(icon,i),Math.round(x-17),Math.round(y-17));ctx.restore();text(name.toUpperCase(),x,y-24,8,'#d4fff1','center');});
 if(world.terminal){const t=world.terminal,x=t.x-camera,have=world.cells.filter(c=>c.taken).length,ready=!t.done&&(world.boss?world.shieldActive:have>=3),near=Math.abs(player.x-t.x)<80;
  // station screen: red = not ready, flashing amber = ready to use, green = done
  const scr=t.done?FB.ok:ready?(Math.floor(clock*3)%2?'#ffd36b':'#c98a1e'):FB.bad;
  rect(t.done?FB.okEdge:ready?'#ffe9a8':FB.badEdge,x-24,FLOOR-55,48,55);rect('#10263f',x-21,FLOOR-52,42,52);rect(scr,x-17,FLOOR-47,34,25);rect('#0b1a2c',x-13,FLOOR-43,26,16);for(let i=0;i<3;i++)rect(t.done?'#b8ffe0':ready?'#fff0b2':'#ffc0cb',x-10,FLOOR-40+i*5,19-i*3,2);rect('#ffd887',x-6,FLOOR-15,12,4);
  if(t.done)mark(x,FLOOR-70,true,10);
  else if(ready)text('E · '+(world.boss?'Shield control':MISSION_STYLES[ranger.id][0]),x,FLOOR-65,10,'#fff0b2','center');
  else if(near||!world.boss)text(world.boss?'SHIELD LOCKED':'NEEDS '+have+'/3',x,FLOOR-65,9,'#ffc0cb','center');}
 if(!world.boss){const x=world.length-48-camera;rect('#11273d',x-23,FLOOR-100,46,100);rect(world.terminal.done?'#8bffe2':'#586c87',x-20,FLOOR-97,40,3);rect('#46798b',x-20,FLOOR-94,3,94);rect('#46798b',x+17,FLOOR-94,3,94);rect(world.terminal.done?'#78edce55':'#ff819833',x-16,FLOOR-90,32,90);text('EXIT',x,FLOOR-106,10,'#d8ffed','center');text(world.terminal.done?'OPEN →':'LOCKED',x,FLOOR-118,8,world.terminal.done?'#9effc4':'#ffc0cb','center');}
 for(const item of pickups){const x=item.x-camera,y=item.y+Math.sin(clock*5)*2;rect(item.kind==='health'?'#ff9faa':'#8deaff',x-5,y-5,10,10);rect('#fff7e6',x-1,y-3,2,6);if(item.kind==='health')rect('#fff7e6',x-3,y-1,6,2);}
 for(const e of enemies)if((e.hp>0||e.dead>0)&&Math.abs(e.x-camera-W/2)<W/2+140){ctx.fillStyle='#08132488';ctx.beginPath();ctx.ellipse(e.x-camera,(e.lift||e.y<FLOOR-4?FLOOR:e.y)+2,(e.type===3?30:23)*(e.scale||1),5,0,0,7);ctx.fill();if(e.drop<0){ctx.globalAlpha=.6;rect('#ff5d8f',e.x-camera-1,0,2,e.y-20);ctx.globalAlpha=1;}drawSprite(e.type===3?'phage':e.family,frameForEnemy(e),e.x,e.y,-e.face,e.hp?1:Math.min(1,e.dead*3),0,e.scale||1);if(e.latched)text('LATCHED',e.x-camera,e.y-62,8,'#a8ffd9','center');
 if(e.type===3&&world.shieldActive&&!world.shieldUnlocked){ctx.strokeStyle='#75e7ff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(e.x-camera,e.y-55,50,63,0,0,Math.PI*2);ctx.stroke();}
 if(e.state==='windup')text('!',e.x-camera,e.y-(e.type===3?115:65),19,'#ffdb8a','center');if(e.type!==3&&e.hp<e.max){rect('#17233c',e.x-camera-18,e.y-59,36,3);rect('#d0ed8e',e.x-camera-18,e.y-59,36*e.hp/e.max,3);}}
 ctx.fillStyle='#08132488';ctx.beginPath();ctx.ellipse(player.x-camera,Math.min(player.y+2,FLOOR+2),22,4,0,0,7);ctx.fill();for(const r of rings){const k=1-r.life/.38;ctx.globalAlpha=r.life/.38;ctx.strokeStyle='#bff4ff';ctx.lineWidth=3-k*2;ctx.beginPath();ctx.ellipse(r.x-camera,r.y+1,18+k*74,4+k*9,0,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;
 for(const g of ghosts)drawSprite(ranger.id,9,g.x,g.y,g.face,g.life/.2*.32,DIVE_ANGLE);
 const diving=player.action?.kind==='dive'&&player.action.time>=DIVE_TUCK;drawSprite(ranger.id,frameForPlayer(),player.x,player.y,player.face,player.inv>0&&Math.floor(clock*16)%2?.55:1,diving?DIVE_ANGLE:0);
 if(player.carry){ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(moleculeIcon(player.carry.key),Math.round(player.x-camera-17),Math.round(player.y-112+Math.sin(clock*6)*2));ctx.restore();}
 for(const b of bolts){const x=b.x-camera;rect(b.enemy?'#ee6fb7':'#48cde8',x-Math.sign(b.vx)*17,b.y-3,18,6);rect(b.enemy?'#ffd0ec':'#e1ffff',x-Math.sign(b.vx)*12,b.y-1,14,2);}
 for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);rect(p.color,p.x-camera,p.y,3,3);}ctx.globalAlpha=1;
 drawStamps();
 if(comboCount>1)text(comboCount+' HIT',W-18,86,15,'#ffe1a1','right');
 if(world.boss){const boss=enemies[0];rect('#10172a',150,H-29,340,15);rect('#b63d73',154,H-25,332*boss.hp/boss.max,7);text('PHAGE',W/2,H-34,10,'#ffc0d8','center');}
 ctx.restore();
}
/* ---------- Title screen ---------- */
const TITLE_FONT='"Press Start 2P", ui-monospace, monospace';
let titleClock=0;const tctx=$('titleArt').getContext('2d');
function tinted(art,color){const c=makeCanvas(art.width,art.height),g=c.getContext('2d');g.drawImage(art,0,0);g.globalCompositeOperation='source-atop';g.fillStyle=color;g.fillRect(0,0,c.width,c.height);return c;}
let phageShadow=null;
function logoLayer(t){
 const c=makeCanvas(640,200),g=c.getContext('2d');g.textAlign='center';g.textBaseline='alphabetic';
 g.font='44px '+TITLE_FONT;g.lineJoin='round';
 // chunky outline, drop shadow, then a two-tone gold fill
 g.lineWidth=12;g.strokeStyle='#120a24';g.strokeText('RANGERS',323,118);g.strokeText('RANGERS',320,115);
 g.lineWidth=5;g.strokeStyle='#ff5d8f';g.strokeText('RANGERS',320,115);
 const fill=g.createLinearGradient(0,78,0,116);fill.addColorStop(0,'#fff6c9');fill.addColorStop(.48,'#ffd35e');fill.addColorStop(.52,'#ffb02e');fill.addColorStop(1,'#ff8a3d');
 g.fillStyle=fill;g.fillText('RANGERS',320,115);
 // a light sweep that crosses the word every few seconds
 const sweep=((t%4.2)/1.3)*900-150;g.save();g.globalCompositeOperation='source-atop';const band=g.createLinearGradient(sweep-40,0,sweep+40,0);band.addColorStop(0,'#fff0');band.addColorStop(.5,'#fffd');band.addColorStop(1,'#fff0');g.fillStyle=band;g.fillRect(0,70,640,60);g.restore();
 g.font='16px '+TITLE_FONT;g.lineWidth=6;g.strokeStyle='#071225';g.strokeText('ORGANELLE',320,60);g.fillStyle='#8ff7e0';g.fillText('ORGANELLE',320,60);
 // CELL RESCUE ribbon
 g.save();g.translate(320,148);g.rotate(-.035);g.fillStyle='#08142a';g.fillRect(-112,-14,230,32);
 const rib=g.createLinearGradient(0,-16,0,16);rib.addColorStop(0,'#ff7fae');rib.addColorStop(1,'#d93a74');g.fillStyle=rib;g.beginPath();g.moveTo(-118,-16);g.lineTo(118,-16);g.lineTo(108,0);g.lineTo(118,16);g.lineTo(-118,16);g.lineTo(-108,0);g.closePath();g.fill();
 g.fillStyle='#fff';g.font='14px '+TITLE_FONT;g.textBaseline='middle';g.fillText('CELL RESCUE',0,2);g.restore();
 return c;
}
function drawTitle(dt){
 titleClock+=dt;const t=titleClock,g=tctx;g.imageSmoothingEnabled=false;
 const bg=environments.environment,bgW=360*bg.width/bg.height,off=(t*14)%bgW;
 g.drawImage(bg,-off,0,bgW,360);g.drawImage(bg,bgW-off,0,bgW,360);
 const shade=g.createLinearGradient(0,0,0,360);shade.addColorStop(0,'#050a1cf2');shade.addColorStop(.55,'#0a1530b0');shade.addColorStop(1,'#050a1ce0');g.fillStyle=shade;g.fillRect(0,0,640,360);
 // Phage looms behind the logo
 phageShadow ||= tinted(atlases.phage[0],'#3a1758');
 g.save();g.globalAlpha=.8;g.shadowColor='#c23cff';g.shadowBlur=10+6*Math.sin(t*2.2);g.translate(470,250+Math.sin(t*.9)*6);g.scale(-2.3,2.3);g.drawImage(phageShadow,-64,-102);g.restore();
 // drifting motes
 for(let i=0;i<40;i++){const x=((i*97-t*(6+i%5*3))%640+640)%640,y=(i*53+Math.sin(t+i)*8)%300;g.fillStyle=i%4?'#7ff5df66':'#ffd88799';g.fillRect(x,y,i%7?1:2,i%7?1:2);}
 g.drawImage(logoLayer(t),0,4);
 // the floor and the Ranger parade chasing two bacteria
 const floorY=330;g.fillStyle='#0a182b';g.fillRect(0,floorY,640,30);g.fillStyle='#6ecbbf';g.fillRect(0,floorY,640,3);g.fillStyle='#a8fbe1';g.fillRect(0,floorY,640,1);
 for(let x=-((t*90)%32);x<640;x+=32){g.fillStyle='#52788a';g.fillRect(x+3,floorY+6,23,2);g.fillStyle='#0f1f34';g.fillRect(x+28,floorY+5,2,22);}
 const spacing=96,loop=(RANGERS.length+6)*spacing;
 const runner=(id,frame,slot,lift=0,scale=1,flip=1)=>{const x=((slot*spacing+t*78)%loop)-120;if(x<-90||x>730)return;const art=atlases[id]?.[frame];if(!art)return;
  g.fillStyle='#04091488';g.beginPath();g.ellipse(x,floorY+2,20,4,0,0,7);g.fill();g.save();g.translate(x,floorY-lift);g.scale(scale*flip,scale);g.drawImage(art,-64,-102);g.restore();};
 const step=Math.floor(t*10);
 runner('bacteria',4+step%2,RANGERS.length+2.2,0,1,-1);runner('bacteria',(step+1)%2,RANGERS.length+1,0,1,-1);
 RANGERS.forEach((r,i)=>{const hop=(Math.floor(t/2.2)+i)%7===0;const phase=(t*10+i*1.7);
  runner(r.id,hop?11:[1,2,3,2][Math.floor(phase)%4],RANGERS.length-1-i,hop?Math.abs(Math.sin((t%2.2)/2.2*Math.PI))*26:0,1);});
 // scanlines
 g.fillStyle='#0000001c';for(let y=0;y<360;y+=3)g.fillRect(0,y,640,1);
}
function showTitle(){mode='title';$('intro')&&($('intro').hidden=true);$('title').hidden=false;$('missionSelect').hidden=true;titleClock=0;$('startBtn').focus();}
function leaveTitle(){$('title').hidden=true;$('howPanel').hidden=true;$('missionSelect').hidden=false;mode='select';tone(660,.1,'triangle');setTimeout(()=>tone(990,.14,'triangle'),90);selectRanger(selected);}
/* ---------- Ranger select: the chosen Ranger shows off its moves ---------- */
let showcaseClock=0;
function drawShowcase(dt){
 showcaseClock+=dt;const t=showcaseClock%4.4,g=$('selectedArt').getContext('2d');g.clearRect(0,0,300,280);
 const glow=g.createRadialGradient(150,200,6,150,175,100);glow.addColorStop(0,ranger.color+'66');glow.addColorStop(1,ranger.color+'00');g.fillStyle=glow;g.fillRect(0,0,300,280);
 g.fillStyle='#04091499';g.beginPath();g.ellipse(150,258,70,10,0,0,7);g.fill();g.strokeStyle=ranger.color+'aa';g.lineWidth=2;g.beginPath();g.ellipse(150,258,80,12,0,0,7);g.stroke();
 const seq=[[2.2,0],[2.32,4],[2.44,5],[2.56,6],[2.68,7],[2.82,8],[3.1,9],[3.24,10],[3.42,12],[3.56,13],[3.8,14],[3.9,13]];
 let frame=0;for(const [end,f]of seq)if(t<end){frame=t<2.2?0:f;break;}
 const bob=frame===0?Math.round(Math.sin(showcaseClock*3)*2):0;
 g.imageSmoothingEnabled=false;g.drawImage(atlases[ranger.id][frame],-10,-4+bob+(frame?0:0),320,280);
}
let shownMode='';function tick(now){if(mode!==shownMode&&document.body?.dataset){shownMode=mode;document.body.dataset.mode=mode;}const dt=Math.min((now-last)/1000,.06);last=now;if(mode==='title')drawTitle(dt);else if(mode==='intro')drawIntro(Math.min(dt,.05));else if(mode==='select'&&!$('missionSelect').hidden)drawShowcase(dt);if(mode==='dialog')typeStep(dt);if(mode==='play'){accumulator+=dt;while(accumulator>=1/60&&mode==='play'){step(1/60);taps.clear();accumulator-=1/60;}}else{accumulator=0;taps.clear();}draw();requestAnimationFrame(tick);}
function keyDown(code){if(!keys.has(code))taps.add(code);keys.add(code);}
addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement)return;
 if(mode==='intro'){e.preventDefault();if(!e.repeat)endIntro();return;}
 if(mode==='introGate'&&(e.code==='Enter'||e.code==='Space')){e.preventDefault();if(!e.repeat)startIntro();return;}
 if(mode==='title'&&(e.code==='Enter'||e.code==='Space')){e.preventDefault();if(!e.repeat)leaveTitle();return;}
 if(mode==='select'&&!$('missionSelect').hidden){const cols=getComputedStyle($('roster')).gridTemplateColumns.split(' ').length||7,mv={ArrowLeft:-1,ArrowRight:1,ArrowUp:-cols,ArrowDown:cols}[e.code];
  if(mv!==undefined){e.preventDefault();const n=selected+mv;if(n>=0&&n<RANGERS.length){selectRanger(n);tone(520,.05,'square');$('roster').children[n]?.focus?.({preventScroll:true});}return;}
  if((e.code==='Enter'||e.code==='Space')&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();if(!e.repeat)startMission();return;}
  if(e.code==='Escape'){e.preventDefault();showTitle();return;}}
 if(e.code==='Escape'){e.preventDefault();if(!e.repeat)pause();return;}
 if((e.code==='Enter'||e.code==='Space')&&mode==='dialog'){e.preventDefault();if(!e.repeat)nextLine();return;}
 if((mode==='task'||mode==='quiz')&&activeQuestion){const n=/^(Digit|Numpad)([1-4])$/.exec(e.code);if(n&&!activeQuestion.solved){e.preventDefault();$('answers').children[+n[2]-1]?.click();return;}}
 if(mode!=='play')return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyS','KeyZ','KeyX','KeyC','KeyE'].includes(e.code)){e.preventDefault();keyDown(e.code);}});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();taps.clear();if(mode==='play')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='play')pause();});
for(const button of document.querySelectorAll('[data-key]')){button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);button.classList.add('on');if(button.dataset.key==='Space'&&mode==='dialog'){nextLine();return;}keyDown(button.dataset.key);});for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>{button.classList.remove('on');keys.delete(button.dataset.key);});}
/* ---- GBA-style touch controls ----
   The pad appears on phones and tablets (and as soon as anyone touches the screen); a real key press
   hands the screen back to the keyboard hints. The D-pad reads the thumb's angle, so diagonals work
   (B in the air is the dive kick; up jumps, like A). */
var touchUI={on:false};
function setTouch(on){if(touchUI.on===on)return;touchUI.on=on;document.body?.classList?.toggle('touch',on);}
setTouch(typeof matchMedia==='function'&&matchMedia('(hover: none) and (pointer: coarse)').matches);
addEventListener('pointerdown',e=>{if(e.pointerType==='touch')setTouch(true);},true);
addEventListener('keydown',e=>{if(e.isTrusted&&!e.repeat&&e.key&&e.key.length>0)setTouch(false);},true);
(function(){const pad=$('dpad');if(!pad||!pad.querySelector)return;const dirs={ArrowUp:pad.querySelector('.du'),ArrowDown:pad.querySelector('.dd'),ArrowLeft:pad.querySelector('.dl'),ArrowRight:pad.querySelector('.dr')};let held=new Set(),id=null;
 function set(next){for(const k of held)if(!next.has(k)){keys.delete(k);dirs[k].classList.remove('on');}for(const k of next)if(!held.has(k)){keyDown(k);dirs[k].classList.add('on');}held=next;}
 function read(e){const r=pad.getBoundingClientRect(),x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2),next=new Set();if(Math.hypot(x,y)<r.width*.12)return set(next);
  const a=Math.atan2(y,x)*180/Math.PI; // 8 directions, 45 degrees each
  if(a>-157.5&&a<-22.5)next.add('ArrowUp');if(a>22.5&&a<157.5)next.add('ArrowDown');if(a>112.5||a<-112.5)next.add('ArrowLeft');if(a>-67.5&&a<67.5)next.add('ArrowRight');set(next);}
 pad.addEventListener('pointerdown',e=>{e.preventDefault();id=e.pointerId;pad.setPointerCapture(id);read(e);});
 pad.addEventListener('pointermove',e=>{if(e.pointerId===id)read(e);});
 for(const n of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(n,e=>{if(e.pointerId===id){id=null;set(new Set());}});
 $('padStart').addEventListener('pointerdown',e=>{e.preventDefault();if(mode==='play')pause();else if(mode==='pause'&&!$('overlay').hidden){$('overlay').hidden=true;mode='play';}});
})();
$('next').onclick=nextLine;$('startBtn').onclick=leaveTitle;$('introBtn').onclick=startIntro;$('playIntro').onclick=startIntro;$('skipGate').onclick=()=>{try{localStorage.setItem('cell-rescue-intro-seen','1');}catch(e){}endIntro();};$('skipIntro').onclick=endIntro;$('introArt').onclick=()=>{if(mode==='intro')endIntro();};$('howBtn').onclick=()=>{$('howPanel').hidden=!$('howPanel').hidden;};$('toTitle').onclick=showTitle;$('pause').onclick=pause;$('launch').onclick=()=>startMission();$('resume').onclick=()=>startMission(true);$('export').onclick=exportResults;$('student').onchange=()=>{profile.name=$('student').value.trim();save();};$('sound').onclick=()=>{muted=!muted;$('sound').textContent=muted?'Sound off':'Sound on';};
load().catch(error=>{$('loading').textContent='Artwork could not load. Reopen the downloaded HTML file to try again.';console.error(error);});
