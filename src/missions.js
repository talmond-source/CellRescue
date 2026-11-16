const MISSION_STYLES = {
 atp:['Energy dispatch','Allocate a limited ATP supply between machines and recharge spent carriers.'],
 ribosome:['Translation assembly','Read codons in order and select the matching tRNA deliveries.'],
 rougher:['Protein folding','Adjust linked folding controls until the protein passes its shape check.'],
 golgi:['Cargo logistics','Read cargo labels and route each shipment to the correct destination.'],
 cytoplasm:['Flow network','Rotate channel tiles to connect a continuous transport route.'],
 membrane:['Selective border','Balance entry and exit while maintaining the cell’s internal supply.'],
 mito:['Gradient engine','Build a proton gradient and spend it through ATP synthase.'],
 nucleus:['Archive security','Unlock the correct gene record and send its message through a pore.'],
 smoother:['Calcium control','Adjust calcium release and storage to stabilize a changing signal.'],
 lysosome:['Salvage workshop','Digest damaged cargo, then assemble useful supplies from its components.'],
 dna:['Replication repair','Repair mismatched base pairs without disturbing the correct pairs.'],
 rna:['Message courier','Plan a delivery route through a maze to reach the ribosome.'],
 mitosis:['Chromosome separation','Move one sister from each duplicated pair to each daughter cell.'],
 crispr:['Sequence targeting','Locate the guide-matching target beside a valid recognition marker.']
};
function createMissionPuzzle(id,level){
 const s={id,level,done:false,moves:0,mistakes:0,message:'',progress:0};
 switch(id){
 case 'atp':s.energy=4;s.demands=[2+level,3,2];s.delivered=[0,0,0];s.spent=0;break;
 case 'ribosome':s.codons=['AUG','GGC',...Array(level+1).fill('UUU'),'UAA'];s.chain=[];break;
 case 'rougher':s.bits=[false,false,false,false];s.target=[[true,false,true,false],[false,true,false,true],[true,true,true,false],[true,false,false,true]][level%4];break;
 case 'golgi':s.cargo=['secreted enzyme','membrane receptor','lysosomal enzyme','membrane receptor','secreted enzyme'].slice(0,3+Math.min(level,2));break;
 case 'cytoplasm':s.tiles=[1,(level+1)%4,0,0,0,1,1,(level+3)%4,1];s.bends=[1,2,6,7];break;
 case 'membrane':s.inside=3;s.target=6+level;s.outside=12;s.waste=3+level;break;
 case 'mito':s.gradient=0;s.fuel=6+level*2;s.atp=0;s.target=3+level;break;
 case 'nucleus':s.code=['A','C','G','T'].slice(0,3+(level>1?1:0));s.entered=[];s.stage='unlock';break;
 case 'smoother':s.calcium=8;s.stable=0;s.demand=[-2,3,-1,2,-3,1].slice(0,4+Math.min(level,2));break;
 case 'lysosome':s.cargo=['protein','lipid','protein','lipid'];s.parts={protein:0,lipid:0};s.products=0;break;
 case 'dna':s.template='ATGCCGTA'.slice(0,5+Math.min(level,3));s.copy=s.template.split('').map((b,i)=>i%2?'A':({A:'T',T:'A',C:'G',G:'C'})[b]);break;
 case 'rna':s.position=0;s.path=[0];s.walls=[[2,6,8,13],[5,6,9,10],[1,5,6,13],[1,6,8,10]][level%4];s.destination=15;break;
 case 'mitosis':s.pairs=3+Math.min(level,2);s.left=[];s.right=[];break;
 case 'crispr':s.guide=['ACGT','TGCA','GATC','CTAG'][level%4];s.strand='TTA'+s.guide+'GG'+'CCATG';s.selected=null;break;
 }
 return s;
}
function flowConnected(s){
 let cell=0,incoming=8;const visited=new Set();
 const direction={1:[-3,4],2:[1,8],4:[3,1],8:[-1,2]};
 while(!visited.has(cell)){
  visited.add(cell);
  const mask=s.bends.includes(cell)?[3,6,12,9][s.tiles[cell]]:[10,5][s.tiles[cell]];
  if(!(mask&incoming))return false;
  const outgoing=mask^incoming;
  if(cell===8&&outgoing===2)return true;
  const [delta,nextIncoming]=direction[outgoing];
  const next=cell+delta;
  if(next<0||next>8||(Math.abs(delta)===1&&Math.floor(cell/3)!==Math.floor(next/3)))return false;
  cell=next;incoming=nextIncoming;
 }
 return false;
}
function missionAction(s,action,value){
 if(s.done)return s;
 s.moves++;s.message='';
 const fail=text=>{s.mistakes++;s.message=text;};
 switch(s.id){
 case 'atp':
  if(action==='charge'){s.energy+=s.spent;s.spent=0;s.message='Energy from fuel recharged the spent carriers.';}
  else if(s.energy>0&&s.delivered[value]<s.demands[value]){s.energy--;s.spent++;s.delivered[value]++;}
  else fail('Recharge spent ADP, or choose a machine that still needs ATP.');
  s.done=s.demands.every((n,i)=>s.delivered[i]>=n);break;
 case 'ribosome':{
  const required={AUG:'UAC',GGC:'CCG',UUU:'AAA',UAA:'release'}[s.codons[s.progress]];
  if(value===required){s.chain.push(value==='release'?'Released':{UAC:'Met',CCG:'Gly',AAA:'Phe'}[value]);s.progress++;s.done=s.progress===s.codons.length;}
  else fail('Match the three bases. At a stop codon, use the release factor.');break;}
 case 'rougher':
  s.bits[value]=!s.bits[value];if(value<3)s.bits[value+1]=!s.bits[value+1];
  s.done=s.bits.every((v,i)=>v===s.target[i]);break;
 case 'golgi':{
  const destination={'secreted enzyme':'outside','membrane receptor':'membrane','lysosomal enzyme':'lysosome'}[s.cargo[s.progress]];
  if(value===destination){s.progress++;s.done=s.progress===s.cargo.length;}else fail('Check the cargo’s label before sending its vesicle.');break;}
 case 'cytoplasm':s.tiles[value]=(s.tiles[value]+1)%(s.bends.includes(value)?4:2);s.done=flowConnected(s);break;
 case 'membrane':
  if(action==='channel'&&s.outside>s.inside){s.outside--;s.inside++;}
  else if(action==='pump'&&s.outside>0){s.outside--;s.inside++;s.message='The pump used ATP to move a solute.';}
  else if(action==='export'&&s.waste>0)s.waste--;
  else if(action==='release'&&s.inside>0){s.inside--;s.outside++;}
  else fail('The channel follows the concentration gradient. Use a pump when needed.');
  s.done=s.inside===s.target&&s.waste===0;break;
 case 'mito':
  if(action==='pump'&&s.fuel>0){s.fuel--;s.gradient+=2;}
  else if(action==='synthase'&&s.gradient>=3){s.gradient-=3;s.atp++;}
  else if(action==='refuel'){s.fuel+=2;s.message='Fuel breakdown supplies more electrons to the transport chain.';}
  else fail('ATP synthase needs a sufficient proton gradient.');
  s.done=s.atp>=s.target;break;
 case 'nucleus':
  if(s.stage==='unlock'){
   if(value===s.code[s.entered.length]){s.entered.push(value);if(s.entered.length===s.code.length)s.stage='transcribe';}
   else{s.entered=[];fail('Read the marked gene address in order.');}
  }else if(s.stage==='transcribe'&&action==='transcribe'){s.stage='export';s.message='A processed mRNA message is ready to leave.';}
  else if(s.stage==='export'&&action==='export')s.done=true;
  else fail('Protect the DNA archive and dispatch its RNA copy.');break;
 case 'smoother':
  if(action==='store')s.calcium=Math.max(0,s.calcium-2);
  if(action==='release')s.calcium+=2;
  if(action==='advance'){
   if(s.calcium>=4&&s.calcium<=6){s.stable++;s.done=s.stable>=s.demand.length;if(!s.done)s.calcium+=s.demand[s.stable];}
   else fail('Bring the signal into the green range of 4–6 before advancing.');
  }break;
 case 'lysosome':
  if(action==='digest'&&s.cargo.length){s.parts[s.cargo.shift()]++;}
  else if(action==='rebuild'&&s.parts.protein>0&&s.parts.lipid>0){s.parts.protein--;s.parts.lipid--;s.products++;s.done=s.products===2;}
  else fail('Digest cargo to recover amino-acid and lipid building blocks first.');break;
 case 'dna':
  s.copy[value]=( {A:'T',T:'C',C:'G',G:'A'})[s.copy[value]];
  s.done=s.copy.every((b,i)=>b===({A:'T',T:'A',C:'G',G:'C'})[s.template[i]]);break;
 case 'rna':{
  const next=s.position+value;
  if(next<0||next>15||s.walls.includes(next)||(Math.abs(value)===1&&Math.floor(next/4)!==Math.floor(s.position/4)))fail('That route is blocked. Find another path.');
  else{s.position=next;s.path.push(next);s.done=next===s.destination;}break;}
 case 'mitosis':{
  const [pair,side]=value;const target=s[side],other=s[side==='left'?'right':'left'];
  if(target.includes(pair))fail('This daughter already has one sister from that pair.');
  else{target.push(pair);s.done=target.length===s.pairs&&other.length===s.pairs;}break;}
 case 'crispr':
  if(action==='select')s.selected=value;
  if(action==='cut'){
   if(s.selected!==null&&s.strand.slice(s.selected,s.selected+4)===s.guide&&s.strand.slice(s.selected+4,s.selected+6)==='GG')s.done=true;
   else fail('Match the highlighted target sequence and its adjacent GG marker before cutting.');
  }break;
 }
 return s;
}
let activePuzzle=null;
function openMissionPuzzle(boss=false){
 activePuzzle=createMissionPuzzle(ranger.id,boss?3:zone);activePuzzle.boss=boss;mode='task';
 showModal(boss?'PHAGE SHIELD CONTROL':'MISSION WORKSHOP',MISSION_STYLES[ranger.id][0],MISSION_STYLES[ranger.id][1]);
 renderMissionPuzzle();
}
function renderMissionPuzzle(){
 const s=activePuzzle,box=$('choices');box.replaceChildren();$('modalActions').replaceChildren();
 const note=content=>{const p=document.createElement('p');p.textContent=content;box.append(p);};
 const button=(label,action,value)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{missionAction(s,action,value);tone(s.message?180:440,.05,'triangle');renderMissionPuzzle();};box.append(b);return b;};
 if(s.done){
  const explanation=s.boss?ranger.tasks[2][4]:ranger.tasks[zone][4];
  note(explanation);run.score+=Math.max(100,400-s.mistakes*30);
  run.answers.push({zone:zone+1,question:MISSION_STYLES[ranger.id][0],answer:s.moves+' actions; '+s.mistakes+' corrections',correct:s.mistakes===0});
  if(s.boss){world.shieldUnlocked=true;world.terminal.done=true;}
  else world.terminal.done=true;
  player.hp=Math.min(10,player.hp+3);player.energy=6;
  const done=document.createElement('button');done.className='primary';done.textContent=s.boss?'Shield disabled — return to battle':'Process restored — continue';done.onclick=()=>{$('overlay').hidden=true;mode='play';activePuzzle=null;updateHUD();canvas.focus();};$('modalActions').append(done);return;
 }
 switch(s.id){
 case 'atp':
  note('Available ATP '+s.energy+' · Spent ADP '+s.spent);
  ['Transport pump','Repair crew','Motor protein'].forEach((name,i)=>button(name+' '+s.delivered[i]+'/'+s.demands[i],'deliver',i));button('Recharge spent ADP using fuel energy','charge');break;
 case 'ribosome':
  note('mRNA  '+s.codons.map((c,i)=>i===s.progress?'['+c+']':c).join(' → '));note('Protein  '+(s.chain.join(' — ')||'Ready to begin'));
  [['UAC','tRNA UAC · methionine'],['CCG','tRNA CCG · glycine'],['AAA','tRNA AAA · phenylalanine'],['release','Release factor']].forEach(([code,label])=>button(label,'match',code));break;
 case 'rougher':
  note('Shape check  '+s.target.map(v=>v?'●':'○').join('   '));note('Current shape  '+s.bits.map(v=>v?'●':'○').join('   '));note('Each control changes its segment and the next segment. This is a simplified folding puzzle.');
  s.bits.forEach((v,i)=>button('Adjust segment '+(i+1),'fold',i));break;
 case 'golgi':
  note('Cargo '+(s.progress+1)+'/'+s.cargo.length+' · '+s.cargo[s.progress]);
  [['outside','Secretion vesicle'],['membrane','Membrane delivery'],['lysosome','Lysosome delivery']].forEach(([id,label])=>button(label,'route',id));break;
 case 'cytoplasm':
  note('Connect the inlet at tile 1’s left edge to the outlet at tile 9’s right edge. The channels represent transport routes through the cytoplasm.');
  {const grid=document.createElement('pre');grid.className='route-grid';grid.textContent=Array.from({length:3},(_,y)=>s.tiles.slice(y*3,y*3+3).map((v,x)=>s.bends.includes(y*3+x)?['└','┌','┐','┘'][v]:['━','┃'][v]).join('   ')).join('\n');box.append(grid);}
  s.tiles.forEach((v,i)=>button('Rotate tile '+(i+1),'rotate',i));break;
 case 'membrane':
  note('Outside solute '+s.outside+' · Inside '+s.inside+' / target '+s.target+' · Waste '+s.waste);note('Assume equal compartment volumes. Channels allow movement down the gradient; pumps can move against it.');
  button('Open inward channel','channel');button('Use inward ATP pump','pump');button('Release one solute outside','release');button('Export one waste package','export');break;
 case 'mito':
  note('Electron supply '+s.fuel+' · Proton gradient '+s.gradient+' · ATP '+s.atp+'/'+s.target);note('Pump builds 2 gradient units. ATP synthase uses 3. These are game units, not molecular stoichiometry.');
  button('Run electron transport pump','pump');button('Run ATP synthase','synthase');button('Supply more fuel-derived electrons','refuel');break;
 case 'nucleus':
  note('Gene address  '+s.code.join('–')+' · Access '+s.entered.join('–'));note('Stage · '+s.stage);
  if(s.stage==='unlock')for(const b of ['A','C','G','T'])button(b,'base',b);
  else if(s.stage==='transcribe')button('Transcribe and process the RNA message','transcribe');
  else button('Export processed mRNA through the pore','export');break;
 case 'smoother':
  note('Calcium signal '+s.calcium+' · Safe range 4–6 · Stable intervals '+s.stable+'/'+s.demand.length);note('Store calcium to lower the cytosolic signal. Release it to raise the signal. Game values represent relative levels.');
  button('Store calcium in ER (−2)','store');button('Release calcium (+2)','release');button('Advance to next signal interval','advance');break;
 case 'lysosome':
  note('Incoming cargo · '+(s.cargo.join(', ')||'All digested'));note('Amino-acid lots '+s.parts.protein+' · Lipid lots '+s.parts.lipid+' · Rebuilt supplies '+s.products+'/2');
  button('Digest next damaged cargo','digest');button('Send one of each building block to the repair workshop','rebuild');break;
 case 'dna':
  note('Template   '+s.template.split('').join('   '));note('New strand '+s.copy.join('   '));note('Cycle a mismatched base until it complements the template. Keep the correct pairs.');
  s.copy.forEach((b,i)=>button('Position '+(i+1)+' · '+b,'repair',i));break;
 case 'rna':{
  const grid=document.createElement('pre');grid.className='route-grid';grid.textContent=Array.from({length:4},(_,y)=>Array.from({length:4},(_,x)=>{const i=y*4+x;return i===s.position?'✉':i===15?'R':s.walls.includes(i)?'■':'·';}).join('  ')).join('\n');box.append(grid);note('Deliver the message ✉ to ribosome R. Blocked tiles are ■.');
  button('↑','move',-4);button('←','move',-1);button('→','move',1);button('↓','move',4);break;}
 case 'mitosis':
  note('Left daughter · '+(s.left.join(', ')||'empty'));note('Right daughter · '+(s.right.join(', ')||'empty'));
  for(let i=1;i<=s.pairs;i++){if(!s.left.includes(i))button('Send sister from pair '+i+' LEFT','separate',[i,'left']);if(!s.right.includes(i))button('Send sister from pair '+i+' RIGHT','separate',[i,'right']);}break;
 case 'crispr':
  note('Guide-matching DNA target · '+s.guide+' · Required adjacent marker GG');note('DNA  '+s.strand.split('').join(' '));note('This puzzle uses a simplified matching target and marker. Real guide RNAs pair complementarily and PAM requirements depend on the Cas system.');
  for(let i=0;i<=s.strand.length-6;i++)button((s.selected===i?'▶ ':'')+'Site '+(i+1)+' · '+s.strand.slice(i,i+4)+' | '+s.strand.slice(i+4,i+6),'select',i);
  button('Cut selected site','cut');break;
 }
 if(s.message)note(s.message);
 const back=document.createElement('button');back.textContent='Return to the level';back.onclick=()=>{activePuzzle=null;$('overlay').hidden=true;mode='play';canvas.focus();};$('modalActions').append(back);
}
