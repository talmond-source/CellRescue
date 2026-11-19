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
  const room={a,b:a+520,r,kind:Array.isArray(kind)?kind[r]:kind,solved:false,mistakes:0,count:0,flash:0,pos:0,meter:0};
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
/* each Ranger's three puzzle rooms; a list gives each room its own kind */
const PUZZLE_KIND={ribosome:'sequence',dna:'sequence',rna:'sequence',crispr:'sequence',mitosis:['sequence','carry','sequence'],
 atp:'carry',rougher:'carry',golgi:'carry',cytoplasm:'carry',membrane:'carry',nucleus:'carry',
 mito:['carry','carry','meter'],lysosome:['meter','carry','carry'],smoother:['carry','carry','meter']};
const PAIR={A:'T',T:'A',G:'C',C:'G'},RNA_PAIR={A:'U',T:'A',G:'C',C:'G'},CODON_TRNA={AUG:'UAC',GGC:'CCG',UUU:'AAA',UAA:'STOP'},CODON_AA={AUG:'Met',GGC:'Gly',UUU:'Phe'};
const PHASES=['prophase','metaphase','anaphase','telophase'];
function sequenceConfig(id,r){
 if(id==='dna'&&r>0)return proofConfig(r);if(id==='rna'&&r>0)return spliceConfig(r);
 if(id==='dna'){const t=['TACG','GATTC','CGTAAG'][r];return {template:t,title:'BASE-PAIR BRIDGE',prompt:'Template  '+t.split('').join(' '),answer:t.split('').map(b=>PAIR[b]),options:['A','T','G','C','U'],line:'Build the matching DNA strand',hint:'A pairs with T, and G pairs with C. U belongs to RNA, not DNA.'};}
 if(id==='rna'){const t=['TACG','GCATT','TACGTA'][r];return {template:t,rna:true,title:'TRANSCRIPTION GATE',prompt:'DNA template  '+t.split('').join(' '),answer:t.split('').map(b=>RNA_PAIR[b]),options:['A','U','G','C','T'],line:'Build the mRNA copy',hint:'RNA pairs U with A and has no T. G pairs with C.'};}
 if(id==='ribosome'){const c=[['AUG','GGC'],['AUG','UUU','GGC'],['AUG','GGC','UUU','UAA']][r];return {title:'TRANSLATION BAY',prompt:'mRNA  '+c.join(' '),answer:c.map(x=>CODON_TRNA[x]),options:['UAC','CCG','AAA','STOP','AUG','CAU','GGC'],line:'Send the tRNA that pairs with each codon',hint:'The tRNA anticodon pairs with the codon (A–U, G–C) — it is not a copy of the codon. A stop codon gets the release factor.',codons:c};}
 if(id==='mitosis'){const a=[['metaphase'],['prophase','metaphase','anaphase'],PHASES.slice()][r];return {title:'SPINDLE CONTROL',prompt:r===0?'Find metaphase':'Put the stages in order',answer:a,options:PHASES.slice(),line:r===0?'Hit the cell in metaphase':'Hit the stages in the order they happen',hint:'Prophase → metaphase → anaphase → telophase. Metaphase lines chromosomes up in the middle.',pictures:true};}
 if(id==='crispr'){const guides=[['AUGCCA'],['GCAUUC','CCGAUG'],['UAGCGA','AACGUC']][r];
  const target=g=>g.split('').map(b=>({A:'T',U:'A',G:'C',C:'G'})[b]).join('');
  return {title:'TARGET CHECKPOINT',prompt:'Guide RNA  '+guides.join('  then  '),answer:guides.map((g,i)=>target(g)+'|'+['AGG','TGG','CGG','GGG'][(r+i)%4]),options:null,guides,line:'Pairs with the guide AND sits beside a PAM (N G G)',hint:'The DNA must pair with the guide (A–T, U–A, G–C, C–G) and sit right beside a PAM: any base, then G G. Every base must pair — one mismatch and Cas9 will not cut.'};}
}
/* DNA proofreading: one or two bases in a new strand don't pair. Find them and fix them. */
function proofConfig(r){const tmpl=['TACGGA','GATTCGCA'][r-1],bad=[[[3,'T']],[[1,'G'],[6,'A']]][r-1];
 const pairs=tmpl.split('').map((b,i)=>{const w=bad.find(x=>x[0]===i);return {top:b,bot:w?w[1]:PAIR[b],fix:PAIR[b],bad:!!w};});
 const values=pairs.map((q,i)=>i+':'+q.top+q.bot);
 return {title:'PROOFREADING',proof:pairs,fixed:true,anyOrder:true,values,answer:values.filter((v,i)=>pairs[i].bad),
  okSay:v=>{const q=pairs[+v.split(':')[0]];return 'Fixed: '+q.top+' now pairs with '+q.fix;},
  line:'DNA polymerase proofreads. Hit the pair that breaks the rule.',hint:'A pairs with T, and G pairs with C. Every other pair is a mistake.'};}
/* RNA splicing: cut the introns (they start with GU and end with AG) out of the pre-mRNA. */
function spliceConfig(r){const segs=[[['AUGGCC',0],['GUACAG',1],['GUCCUA',0]],[['AUGCAG',0],['GUUCAG',1],['CCAGUA',0],['GUGAAG',1],['GCUUAA',0]]][r-1];
 const values=segs.map(([q],i)=>i+':'+q);
 return {title:'SPLICING STATION',splice:segs.map(([seq,intron])=>({seq,intron:!!intron})),fixed:true,anyOrder:true,cutAway:true,values,answer:values.filter((v,i)=>segs[i][1]),
  okSay:()=>'Intron cut out — the exons are joined',line:'Cut out the introns: they start with G U and end with A G.',hint:'An intron starts with G U and ends with A G. Exons are kept: they EXit the nucleus and are EXpressed.'};}
/* CRISPR choices: the right target beside a PAM, the right target with no PAM, a one-base mismatch, and a copy of the guide */
function crisprOptions(cfg,step){
 const [right,pam]=cfg.answer[step].split('|'),g=cfg.guides[step],swap={A:'G',G:'A',C:'T',T:'C'},noPam=['ATC','GAT','TCA','CTA'][step%4];
 const copy=g.replace(/U/g,'T');                                  // copies the guide instead of pairing with it
 const k=1+((step*3+right.length)%(right.length-2)),mismatch=right.slice(0,k)+swap[right[k]]+right.slice(k+1); // one base wrong
 return [...new Set([right+'|'+pam,right+'|'+noPam,mismatch+'|'+pam,copy+'|'+pam])];
}
const CARRY={
 atp:r=>({title:'PUMP POWER',line:'Charge ADP into ATP, then spend it at the pump',goal:r+1,
  items:[['adp',90]],machines:[{id:'charger',label:'PHOSPHATE CHARGER',icon:'phosphate',x:230,accept:{adp:{give:'atp',say:'ADP + phosphate → ATP'}},reject:'The charger adds a phosphate to ADP.'},
   {id:'pump',label:'ION PUMP',icon:'ions',x:420,accept:{atp:{count:true,drop:'adp',say:'ATP → ADP + phosphate: the pump runs!'}},reject:'The pump only runs on charged ATP.'}],
  hint:'ATP powers the pump and becomes ADP. Recharge the ADP and use it again.'}),
 rougher:r=>{const sets=[[['ribosomeSig',60]],[['ribosomeSig',40],['ribosomeFree',112]],[['ribosomeSig',40],['ribosomeFree',112],['ribosomeSig',184]]][r];
  const sig=sets.filter(x=>x[0]==='ribosomeSig').length,free=sets.length-sig;
  return {title:'DOCKING BAY',line:'Ribosomes with a signal sequence dock on the ER. The rest stay in the cytosol.',goal:sets.length,items:sets,
  labels:{ribosomeSig:'Ribosome + signal',ribosomeFree:'Ribosome, no signal',vesicleOrange:'ER vesicle'},
  machines:[{id:'dock',label:'ER DOCK',icon:'ribosomeSig',x:250,accept:{ribosomeSig:{give:'vesicleOrange',say:'Signal docks it: the protein threads into the ER, folds, and buds off in a vesicle'}},reject:'No signal sequence, so it can’t dock. This protein is made in the cytosol.'},
   {id:'cyto',label:'CYTOSOL',icon:'ribosomeFree',x:350,need:free,accept:{ribosomeFree:{count:true,consume:true,say:'No signal: this protein is built and used in the cytosol'}},reject:'Ribosomes with a signal sequence go to the ER dock.'},
   {id:'golgi',label:'TO GOLGI',icon:'vesicleGold',x:450,need:sig,accept:{vesicleOrange:{count:true,consume:true,say:'Vesicle shipped to the Golgi'}},reject:'Only ER vesicles go to the Golgi. Dock the ribosome first.'}],
  hint:'Signal sequence → ER dock → vesicle → Golgi. No signal → it stays in the cytosol.'};},
 golgi:r=>{const all=[['digest','Digestive enzymes'],['membraneProtein','Membrane protein'],['vesicleGold','Hormone to secrete']];const items=all.slice(0,r+1);
  return {title:'SORTING CISTERNAE',line:'Send each cargo to the right address',goal:items.length,items:items.map(([k],i)=>[k,40+i*72]),labels:Object.fromEntries(all),
  machines:[{id:'lyso',label:'TO LYSOSOME',icon:'digest',x:250,accept:{digest:{count:true,consume:true,say:'Enzymes delivered to the lysosome'}},reject:'Lysosomes take digestive enzymes.'},
   {id:'mem',label:'TO MEMBRANE',icon:'membraneProtein',x:350,accept:{membraneProtein:{count:true,consume:true,say:'Protein built into the membrane'}},reject:'The membrane takes membrane proteins.'},
   {id:'out',label:'OUT OF CELL',icon:'vesicleGold',x:450,accept:{vesicleGold:{count:true,consume:true,say:'Hormone secreted'}},reject:'Only secreted cargo leaves the cell.'}],
  hint:'Digestive enzymes → lysosome. Membrane proteins → membrane. Hormones → out of the cell.'};},
 cytoplasm:r=>[
  {title:'REACTION SOUP',line:'Reactions happen right here in the cytosol. Bring each molecule to its reaction.',goal:3,drift:true,decor:'soup',
   items:[['glucose',60],['aminoAcid',150],['glucose',240]],labels:{glucose:'Glucose',aminoAcid:'Amino acids'},
   machines:[{id:'gly',label:'GLYCOLYSIS',icon:'enzyme',x:340,need:2,accept:{glucose:{count:true,consume:true,say:'Glucose → 2 pyruvate + 2 ATP, made right here in the cytosol'}},reject:'Glycolysis enzymes split glucose.'},
    {id:'ribo',label:'FREE RIBOSOME',icon:'aminoAcid',x:450,need:1,accept:{aminoAcid:{count:true,consume:true,say:'Amino acids linked into a protein, also in the cytosol'}},reject:'Free ribosomes link amino acids into proteins.'}],
   hint:'The cytosol is where many reactions happen: glycolysis splits glucose, and free ribosomes build proteins.'},
  {title:'SCAFFOLD REPAIR',line:'The cytoskeleton holds organelles in place. Rebuild the broken fibers.',goal:3,decor:'scaffold',
   dispensers:[{x:70,item:'tubulin',label:'TUBULIN'}],
   machines:['mito','golgi','er'].map((o,i)=>({id:'fib'+i,label:'BROKEN FIBER',icon:'tubulin',x:210+i*120,need:1,organelle:o,
    accept:{tubulin:{count:true,consume:true,say:'Microtubule rebuilt: the '+{mito:'mitochondrion',golgi:'Golgi',er:'ER'}[o]+' is anchored again'}},reject:'Fibers are rebuilt from tubulin.'})),
   hint:'Microtubules are built from tubulin. They anchor organelles and give the cell its shape.'},
  {title:'MOTOR HIGHWAY',line:'A motor protein walks a vesicle along a microtubule. Fix the track ahead of it.',goal:2,decor:'highway',motor:{start:16,speed:28},
   dispensers:[{x:110,item:'tubulin',label:'TUBULIN'}],
   machines:[250,400].map((x,i)=>({id:'t'+i,label:'TRACK BREAK',icon:'tubulin',x,need:1,track:true,accept:{tubulin:{count:true,consume:true,say:'Track repaired: the motor protein keeps walking'}},reject:'The track is rebuilt from tubulin.'})),
   hint:'Motor proteins walk along microtubules, carrying vesicles to where they are needed.'}][r],
 mito:r=>[
  {title:'FUEL THE CHAIN',line:'Break pyruvate down in the matrix, then hand its electrons to the transport chain.',goal:2,
   dispensers:[{x:70,item:'pyruvate',label:'PYRUVATE IN'}],labels:{nadh:'NADH'},
   machines:[{id:'krebs',label:'KREBS CYCLE',icon:'pyruvate',x:240,accept:{pyruvate:{give:'nadh',say:'Pyruvate broken down: CO₂ released, electrons loaded onto NADH'}},reject:'The Krebs cycle takes pyruvate.'},
    {id:'etc',label:'TRANSPORT CHAIN',icon:'nadh',x:420,need:2,accept:{nadh:{count:true,say:'NADH hands over electrons: the chain pumps H⁺ ions'}},reject:'The chain takes electrons from NADH. Break pyruvate down first.'}],
   hint:'Pyruvate → Krebs cycle → NADH → electron transport chain.'},
  {title:'LAST STOP: OXYGEN',line:'Electrons need somewhere to go at the end of the chain.',goal:2,
   items:[['nadh',40],['nadh',112]],labels:{nadh:'NADH',o2:'Oxygen (O₂)'},dispensers:[{x:200,item:'o2',label:'O₂ FROM BLOOD'}],
   machines:[{id:'etc',label:'TRANSPORT CHAIN',icon:'nadh',x:330,need:2,accept:{nadh:{count:true,consume:true,after:'o2',wait:'Jammed! With no oxygen at the end, electrons have nowhere to go and the chain stops.',say:'Electrons flow down the chain to O₂, which becomes water. H⁺ pumped!'}},reject:'The chain takes NADH.'},
    {id:'o2',label:'OXYGEN SITE',icon:'o2',x:450,accept:{o2:{say:'O₂ in place: it will take the electrons and become water'}},reject:'This site holds oxygen, the final electron acceptor.'}],
   hint:'Oxygen is the final electron acceptor. Without O₂ the chain stops.'}][r],
 lysosome:r=>{const sets=r===1?[['oldProtein',40],['oldProtein',112]]:[['oldProtein',40],['oldMembrane',100],['oldDNA',160]];
  const made={oldProtein:'aminoAcid',oldMembrane:'fattyAcid',oldDNA:'nucleotide'};
  const dest=[['ribo','RIBOSOME','aminoAcid','Amino acids reused to build new proteins'],['ser','SMOOTH ER','fattyAcid','Fatty acids reused to build new lipids'],['nuc','NUCLEUS','nucleotide','Nucleotides reused to build new DNA and RNA']].slice(0,r===1?1:3);
  return {title:r===1?'DIGEST AND RECYCLE':'RECYCLING CENTER',line:'Digest worn-out parts into building blocks, then send each block where it gets reused.',goal:sets.length,items:sets,
  labels:{oldProtein:'Worn-out protein',oldMembrane:'Old membrane',oldDNA:'Broken DNA',aminoAcid:'Amino acids',fattyAcid:'Fatty acids',nucleotide:'Nucleotides'},
  machines:[{id:'vat',label:'ENZYME VAT',icon:'digest',x:220,accept:{oldProtein:{give:'aminoAcid',say:'Protein digested into amino acids'},oldMembrane:{give:'fattyAcid',say:'Membrane lipids digested into fatty acids'},oldDNA:{give:'nucleotide',say:'DNA digested into nucleotides'}},reject:'That is already a building block. Send it on to be reused.'},
   ...dest.map(([id,label,key,say],i)=>({id,label,icon:key,x:r===1?400:305+i*88,need:sets.filter(x=>made[x[0]]===key).length,accept:{[key]:{count:true,consume:true,say}},reject:'Digest it in the vat first, then send each building block where it is reused.'}))],
  hint:'Proteins → amino acids → ribosome. Lipids → fatty acids → smooth ER. DNA → nucleotides → nucleus.'};},
 smoother:r=>[
  {title:'LIPID WORKSHOP',line:'Build phospholipids from fatty acids, then patch the torn membrane.',goal:2,dispensers:[{x:70,item:'fattyAcid',label:'FATTY ACIDS'}],labels:{phospholipid:'Phospholipid'},
   machines:[{id:'lip',label:'LIPID ENZYMES',icon:'enzyme',x:240,accept:{fattyAcid:{give:'phospholipid',say:'Fatty acids built into a phospholipid'}},reject:'Lipid enzymes build with fatty acids.'},
    {id:'tear',label:'MEMBRANE TEAR',icon:'phospholipid',x:420,need:2,accept:{phospholipid:{count:true,consume:true,say:'Phospholipid patched into the membrane'}},reject:'Raw fatty acids can’t patch a membrane. Build a phospholipid first.'}],
   hint:'The smooth ER builds lipids, like the phospholipids that make up membranes.'},
  {title:'DETOX STATION',line:'Make the toxins water-soluble so they can be flushed out.',goal:2,items:[['toxin',40],['toxin',112]],labels:{toxin:'Toxin',cleanToxin:'Water-soluble waste'},
   machines:[{id:'detox',label:'DETOX ENZYMES',icon:'enzyme',x:260,accept:{toxin:{give:'cleanToxin',say:'Enzymes changed the toxin so it dissolves in water'}},reject:'Detox enzymes take raw toxins.'},
    {id:'flush',label:'FLUSH OUT',icon:'cleanToxin',x:430,need:2,accept:{cleanToxin:{count:true,consume:true,say:'Waste flushed out of the cell'}},reject:'It won’t dissolve in water yet. Run it through the detox enzymes first.'}],
   hint:'Smooth ER enzymes (liver cells have lots) change toxins so they dissolve in water and can be flushed away.'}][r],
 mitosis:r=>({title:'METAPHASE PLATE',line:'Line the duplicated chromosomes up across the middle of the cell.',goal:3,items:[['chromosome',40],['chromosome',100],['chromosome',160]],labels:{chromosome:'Chromosome'},
  machines:[{id:'pole',label:'SPINDLE POLE',icon:'kinetochore',x:250,accept:{},reject:'Not yet. In metaphase the chromosomes line up in the middle first.'},
   {id:'plate',label:'METAPHASE PLATE',icon:'chromosome',x:380,need:3,accept:{chromosome:{count:true,consume:true,say:'Chromosome lined up on the metaphase plate'}},reject:''}],
  hint:'In metaphase the chromosomes line up across the middle, held by spindle fibers from both poles.'}),
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
/* answers land in a random spot every time, so students read the choices instead of memorising a position */
function shuffled(list){const o=list.slice();for(let i=o.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[o[i],o[j]]=[o[j],o[i]];}return o;}
function reshuffle(room,avoid){const cfg=room.cfg,opts=cfg.options||crisprOptions(cfg,room.pos),want=cfg.answer[room.pos];
 for(let tries=0;tries<12;tries++){const vals=shuffled(opts);room.switches.forEach((sw,n)=>{sw.value=vals[n];sw.swap=.3;});if(room.switches[avoid]?.value!==want)break;}}
function setupRoom(w,room,id){
 const a=room.a;
 if(room.kind==='sequence'){
  room.cfg=sequenceConfig(id,room.r);
  room.switches=[];
  const cfg=room.cfg,opts=cfg.values||cfg.options||crisprOptions(cfg,0),fixed=cfg.fixed;
  const pic=cfg.pictures,span=fixed?Math.min(130,380/Math.max(1,opts.length-1)):pic?92:cfg.options?Math.min(72,380/(opts.length-1)):110;
  const sw=fixed?(cfg.splice?Math.min(84,span-8):Math.min(46,span-10)):pic?60:cfg.options?40:92;
  // fixed rooms (a strand to proofread, a gene to splice) keep their order; choice rooms are shuffled
  (fixed?opts:shuffled(opts)).forEach((v,n)=>room.switches.push({x:a+70+n*span,value:v,flash:0,good:0,swap:0,w:sw}));
 }
 if(room.kind==='carry'){
  room.cfg=CARRY[id](room.r);
  for(const [key,dx] of room.cfg.items||[])w.items.push({key,x:a+dx,y:FLOOR-14,room:room.r});
  room.machines=room.cfg.machines.map(m=>{const keys=Object.keys(m.accept).filter(k=>m.accept[k].count),fromItems=(room.cfg.items||[]).filter(([k])=>keys.includes(k)).length;
   const sorting=keys.some(k=>m.accept[k].consume);return {...m,x:a+m.x,flash:0,ok:0,bad:0,got:0,need:m.need??(sorting?fromItems:keys.length?room.cfg.goal:0)};});
  room.dispensers=(room.cfg.dispensers||[]).map(d=>({...d,x:a+d.x}));
  // cytosol rooms: loose molecules drift in the gel
  if(room.cfg.drift)w.items.forEach((it,i)=>{if(it.room===room.r)it.drift={home:it.x,ph:i*1.9};});
  // a motor protein that walks a vesicle along the track
  if(room.cfg.motor)room.motor={x:a+room.cfg.motor.start,speed:room.cfg.motor.speed,step:0};
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
   if(ar.wave>=ar.waves.length){ar.state='done';world.lock=null;revealCell(i);stamp((ar.a+ar.b)/2,'ARENA '+(i+1)+' CLEAR');toast('Arena clear — grab the '+CARGO[ranger.id][zone].toLowerCase());tone(660,.2,'triangle');}
   else{ar.waves[ar.wave].forEach((type,n)=>{const e=makeEnemy(n%2?ar.b-50-n*18:ar.a+50+n*18,type);e.arena=ar;e.drop=-220-n*60;e.face=n%2?-1:1;if(ar.elite&&n===0){e.hp=e.max=e.max+6;e.elite=true;}enemies.push(e);});ar.delay=.9;if(ar.wave>0)toast('Wave '+(ar.wave+1)+' of '+ar.waves.length);}
  }}
 }
}
/* Puzzle rooms */
function updateRoom(room,dt){
 room.flash=Math.max(0,room.flash-dt);
 if(room.swapIn>0){room.swapIn-=dt;if(room.swapIn<=0)reshuffle(room,room.swapAvoid);}
 for(const s of room.switches||[]){s.recent=Math.max(0,(s.recent||0)-dt);s.flash=Math.max(0,s.flash-dt);s.good=Math.max(0,(s.good||0)-dt);s.swap=Math.max(0,(s.swap||0)-dt);if(s.cool!==undefined)s.cool=Math.max(0,s.cool-dt);}
 for(const m of room.machines||[]){m.flash=Math.max(0,m.flash-dt);m.ok=Math.max(0,(m.ok||0)-dt);m.bad=Math.max(0,(m.bad||0)-dt);}
 if(!room.entered&&player.x>room.a-20&&player.x<room.b){room.entered=true;toast(room.cfg.line+(room.kind==='carry'?'  (E picks up and uses)':room.kind==='sequence'?'  (punch the right switch)':''));}
 if(room.cfg.drift)for(const it of world.items)if(it.room===room.r&&it.drift){it.x=it.drift.home+Math.sin(clock*.6+it.drift.ph)*38;it.y=FLOOR-14-Math.abs(Math.sin(clock*.8+it.drift.ph))*26;}
 if(room.motor&&!room.solved){const mo=room.motor,gap=room.machines.filter(m=>m.track&&m.got<1).map(m=>m.x).sort((x,y)=>x-y).find(x=>x>mo.x),stop=gap!==undefined?gap-44:room.b-30;
  const was=mo.x;mo.x=Math.min(stop,mo.x+mo.speed*dt);mo.walking=mo.x>was;if(mo.walking)mo.step+=dt;mo.blocked=gap!==undefined&&mo.x>=stop-.5;
  if(mo.x>=room.b-31){burst(mo.x,FLOOR-110,'#ffd36b',18);solveRoom(room);}}
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
 toast(room.cfg.title+' unlocked');stamp(room.a+260,'LOCK '+(room.r+1)+' OF 3 COMPLETE');burst(room.wall.x,FLOOR-60,ranger.color,26);shake=3;
}
function roomAt(x){return world.rooms?.find(r=>x>r.a-40&&x<r.b+10&&!r.solved);}
/* Melee and dive kicks also strike puzzle switches. Returns true if a switch was hit. */
function strikeSwitches(x,face,reach){
 const room=roomAt(player.x);if(!room||!room.switches)return false;
 const p=player;let best=null;
 for(const s of room.switches){
  if(s.cut)continue;
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
  s.cool=room.cfg.cool;s.flash=.45;room.meter=Math.min(100,room.meter+room.cfg.gain);tone(300+room.meter*4,.08,'square',.02);burst(s.x,switchBase(room,s)-30,'#9fe8ff',8);return;
 }
 if(room.swapIn>0)return;
 const cfg=room.cfg,want=cfg.answer[room.pos];
 if(cfg.anyOrder){if(s.done)return;
  if(cfg.answer.includes(s.value)){s.done=true;s.good=.9;s.flash=0;if(cfg.cutAway)s.cut=true;room.pos++;tone(520+room.pos*70,.1,'triangle');burst(s.x,FLOOR-34,'#9effc4',14);toast(cfg.okSay?cfg.okSay(s.value):'Correct');
   if(room.pos>=cfg.answer.length)solveRoom(room);}
  else{s.flash=.9;s.good=0;room.mistakes++;room.flash=.6;tone(110,.18,'sawtooth',.03);toast('Not quite — '+cfg.hint);}
  return;}
 if(s.value===want){
  s.good=room.pos+1>=cfg.answer.length?.9:.5;s.flash=0;room.pos++;tone(520+room.pos*70,.1,'triangle');burst(s.x,FLOOR-34,'#9effc4',10);
  if(room.pos>=cfg.answer.length)solveRoom(room);
  else{room.swapIn=.45;room.swapAvoid=room.switches.indexOf(s);}  // the choices scramble once the green check has shown
 }else{
  s.flash=.9;s.good=0;room.mistakes++;room.flash=.6;tone(110,.18,'sawtooth',.03);toast('Not quite — '+cfg.hint);
 }
}
/* Carrying: E picks up, delivers or drops. */
function carryInteract(){
 const p=player,room=roomAt(p.x);
 if(p.carry){
  const m=room?.machines?.find(m=>Math.abs(m.x-p.x)<42);
  if(m){
   const rule=m.accept[p.carry.key];
   if(rule&&rule.count&&m.need&&m.got>=m.need){m.flash=.3;tone(200,.08,'triangle');toast('That one is done — try another station');return true;}
   if(rule&&rule.after&&!room.machines.find(x=>x.id===rule.after)?.got){m.flash=.5;m.bad=.9;m.ok=0;room.mistakes++;tone(110,.18,'sawtooth',.03);toast(rule.wait);return true;}
   if(!rule){m.flash=.5;m.bad=.9;m.ok=0;room.mistakes++;tone(110,.18,'sawtooth',.03);toast('Rejected — '+m.reject);return true;}
   m.flash=.4;m.ok=.9;m.bad=0;tone(620,.1,'triangle');burst(m.x,FLOOR-50,'#9effc4',12);toast(rule.say);
   if(rule.give)p.carry={key:rule.give};else p.carry=null;
   if(rule.drop)world.items.push({key:rule.drop,x:m.x+30,y:FLOOR-14,room:room.r,bounce:.4});
   m.got=(m.got||0)+1;
   if(rule.count){room.count++;if(room.count>=room.cfg.goal&&!room.cfg.motor)solveRoom(room);}
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
const ITEM_NAMES={adp:'ADP',atp:'ATP',polypeptide:'a new protein chain',vesicleOrange:'a protein vesicle',glucose:'glucose',pyruvate:'pyruvate',tubulin:'tubulin',nadh:'NADH',o2:'oxygen (O₂)',
 aminoAcid:'amino acids',fattyAcid:'fatty acids',nucleotide:'nucleotides',phospholipid:'a phospholipid',cleanToxin:'water-soluble waste',chromosome:'a duplicated chromosome'};
function itemName(key,room){return room?.cfg?.labels?.[key]||ITEM_NAMES[key]||key;}
function puzzleObjective(){
 const room=world.rooms.find(r=>!r.solved);if(!room)return null;
 return 'Lock '+(room.r+1)+'/3';
}

/* ---------- Task feedback ----------
   Every task station reads at a glance: red background = still to do, green = done.
   Every press or delivery flashes the whole box green with a check (right) or red with a cross (wrong),
   and finishing a lock, an arena or a station puts a big banner on screen. */
const FB={ok:'#26b566',okDim:'#145c3a',okEdge:'#b9ffd8',bad:'#d23b57',badDim:'#5c1828',badEdge:'#ffc0cb',wait:'#7a1f33',waitEdge:'#ff7d93'};
function stamp(x,label,color='#9effc4'){(world.stamps||(world.stamps=[])).push({x,label,color,born:clock});}
function drawStamps(){
 for(const m of laterMarks)mark(...m);laterMarks=[];
 for(const st of world.stamps||[]){const age=clock-st.born;if(age>2.8)continue;const pop=Math.min(1,age/.18),fade=age>2.2?1-(age-2.2)/.6:1;
  ctx.save();ctx.font='16px "Press Start 2P", monospace';const w=ctx.measureText(st.label).width+60,x=Math.min(W-w/2-10,Math.max(w/2+10,st.x-camera));ctx.globalAlpha=Math.max(0,fade);ctx.translate(x,128);ctx.scale(.6+.4*pop,.6+.4*pop);
  rect('#04100a',-w/2-4,-26,w+8,44);rect(st.color,-w/2-2,-24,w+4,40);rect('#0a2a1c',-w/2+2,-20,w-4,32);ctx.textAlign='center';ctx.fillStyle='#000';ctx.fillText(st.label,14,6);ctx.fillStyle=st.color;ctx.fillText(st.label,12,4);mark(-w/2+16,-4,true,10);ctx.restore();}
 if(world.stamps)world.stamps=world.stamps.filter(st=>clock-st.born<=2.8);
}
/* a round ✓ or ✗ badge */
let laterMarks=[];function markLater(x,y,ok,r){laterMarks.push([x,y,ok,r]);}
function mark(x,y,ok,r=9){ctx.fillStyle='#04070e';ctx.beginPath();ctx.arc(x+1,y+1,r+1,0,7);ctx.fill();ctx.fillStyle=ok?FB.ok:FB.bad;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();
 ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(2,r/4);ctx.lineCap='round';ctx.beginPath();if(ok){ctx.moveTo(x-r*.45,y);ctx.lineTo(x-r*.1,y+r*.38);ctx.lineTo(x+r*.48,y-r*.38);}else{ctx.moveTo(x-r*.38,y-r*.38);ctx.lineTo(x+r*.38,y+r*.38);ctx.moveTo(x+r*.38,y-r*.38);ctx.lineTo(x-r*.38,y+r*.38);}ctx.stroke();ctx.lineCap='butt';}
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
function drawSign(x,y,w,title,lines,color='#7cf7df',bg='#06101ecc'){
 ctx.font='bold 9px monospace';w=Math.max(w,...lines.map(l=>ctx.measureText(l).width+24));
 x-=camera;if(x+w/2<0||x-w/2>W)return;rect(bg,x-w/2,y,w,14+lines.length*12);rect(color,x-w/2,y,w,2);text(title,x,y+11,8,color,'center');
 lines.forEach((l,i)=>text(l,x,y+24+i*12,9,'#e8f6ff','center'));rect('#2f4a63',x-w/2+10,0,2,y);rect('#2f4a63',x+w/2-12,0,2,y);}
function drawRoom(room){
 const cfg=room.cfg,a=room.a;
 // the room's gate
 const gx=room.wall.x-camera;
 if(room.kind==='meter'&&cfg.variant==='lift'){rect('#10263f',gx-14,cfg.ledge+12,28,FLOOR-cfg.ledge-12);for(let y=cfg.ledge+16;y<FLOOR;y+=12)rect('#22405c',gx-12,y,24,5);}
 else if(!room.wall.open){rect('#0d1b2e',gx-10,70,20,FLOOR-70);for(let y=74;y<FLOOR;y+=10)rect(room.flash>0?'#ff6b8a':ranger.color,gx-8,y,16,4);text('LOCKED',gx,64,8,'#ffd887','center');}
 else if(!room.solved){rect('#9effc455',gx-10,70,20,FLOOR-70);if(Math.floor(clock*3)%2)text('OPEN — GO →',gx,64,8,'#9effc4','center');}
 if(room.solved&&!(room.kind==='meter'&&cfg.variant==='lift')){rect(FB.ok,gx-14,64,4,FLOOR-64);rect(FB.ok,gx+10,64,4,FLOOR-64);rect(FB.ok,gx-14,64,28,4);mark(gx,48,true,10);text('OPEN →',gx,FLOOR-8,8,'#b9ffd8','center');}
 if(room.kind==='sequence'){
  drawBoard(room);
  for(const s of room.switches)drawSwitch(s,room);
 }
 if(room.kind==='carry'){
  if(cfg.decor)drawDecor(room);
  drawSign(a+260,70,300,room.solved?'✓ '+cfg.title+' — COMPLETE':cfg.title,[cfg.line,room.solved?'All cargo delivered · gate open →':'Delivered '+room.count+' of '+cfg.goal],room.solved?'#9effc4':'#ff9aab',room.solved?'#0d3a26e6':'#2a0b16dd');
  for(const d of room.dispensers)drawMachine(d.x,d.label,d.item,0,'#2bb5a4');
  for(const m of room.machines)drawMachine(m.x,m.label,m.icon,m.flash,'#7cf7df',m,room.solved);
  if(room.motor)drawMotor(room);
 }
 if(room.kind==='meter'){
  const v=cfg.variant,pct=room.meter/100;
  const label=v==='dissolve'?'pH '+(7.2-2.2*pct).toFixed(1):cfg.label+' '+Math.round(room.meter)+'%';
  const ready=v==='gate'&&room.wall.open;
  drawSign(a+(v==='lift'?175:300),62,v==='lift'?300:320,room.solved?'✓ '+cfg.title+' — COMPLETE':cfg.title,[cfg.line.length>52?cfg.line.slice(0,cfg.line.indexOf('.')+1):cfg.line,room.solved?'Done · path open →':ready?label+' · GATE OPEN — GO!':label],room.solved||ready?'#9effc4':'#ff9aab',room.solved?'#0d3a26e6':ready?'#0d3a26cc':'#2a0b16dd');
  const mx=a+(v==='lift'?175:300)-camera-100;rect('#0b1424',mx,104+12,200,8);rect(room.solved||ready?FB.ok:v==='dissolve'?'#ff7a9a':'#ffd36b',mx+1,104+13,198*pct,6);
  if(v==='gate'){const t=cfg.threshold/100*200;rect('#ffffff',mx+t,112,2,16);text('OPEN',mx+t,138,7,'#ffffff','center');}
  if(v==='dissolve'){rect('#ffffff',mx+198,112,2,16);text('GOAL pH 5',mx+200,138,7,'#ffffff','center');}
  if(v==='gate'&&!room.solved){const gx2=room.wall.x-camera;ctx.save();ctx.translate(gx2,FLOOR-130);ctx.rotate(clock*(room.wall.open?8:.4));for(let k=0;k<6;k++){ctx.rotate(Math.PI/3);rect('#ffbd6d',-2,-22,4,22);}ctx.restore();text('ATP SYNTHASE',gx2,FLOOR-160,8,'#ffd9a8','center');}
  if(v==='dissolve'&&!room.solved){const gx2=room.wall.x-camera,melt=pct;
   // a clog of worn-out organelle debris; it sags and pales as the acid builds
   for(let k=0;k<9;k++){const bx=gx2+((k*37)%3-1)*12,by=FLOOR-14-k*22+melt*k*5,rx=15-k%2*3,ry=9;ctx.fillStyle=k%3===0?'#7a4a2c':k%3===1?'#5c3a2a':'#8a6a50';ctx.globalAlpha=1-melt*.45;ctx.beginPath();ctx.ellipse(bx,by,rx,ry,(k%2?.4:-.3),0,7);ctx.fill();ctx.strokeStyle='#c99a6e';ctx.lineWidth=1;ctx.stroke();ctx.strokeStyle='#3a2216';ctx.beginPath();ctx.moveTo(bx-rx+4,by);for(let q=0;q<4;q++)ctx.lineTo(bx-rx+6+q*(rx-3)/2,by+(q%2?3:-3));ctx.stroke();}
   ctx.globalAlpha=1;text('WORN-OUT DEBRIS',gx2,FLOOR-212,8,'#ffc0d0','center');}
  if(v==='lift'&&!room.solved){const L=room.lift,high=L.y<=L.top+8,lx=room.b-100-camera;
   rect(high?FB.ok:'#ff7d93',lx,cfg.ledge-3,130,3);text(high?'HIGH ENOUGH — JUMP TO THE LEDGE →':'LEDGE · raise the lift to here',lx+65,cfg.ledge-10,8,high?'#b9ffd8':'#ffc0cb','center');
   if(high)rect(FB.ok+'66',L.x-camera-2,L.y-3,L.w+4,5);}
  for(const s of room.switches)drawSwitch(s,room);
 }
}
/* Cytoplasm rooms: the gel, the organelles the cytoskeleton holds, and the motor-protein highway */
function drawOrganelle(kind,x,y){ctx.save();ctx.translate(x,y);ctx.lineJoin='round';
 if(kind==='mito'){ctx.fillStyle='#ff9a4a';ctx.strokeStyle='#5a2a0a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,30,15,0,0,7);ctx.fill();ctx.stroke();ctx.strokeStyle='#ffd2a8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-22,0);for(let i=0;i<8;i++)ctx.lineTo(-20+i*6,i%2?-8:8);ctx.stroke();}
 if(kind==='golgi'){for(let i=0;i<4;i++){ctx.strokeStyle='#3a2208';ctx.lineWidth=8;ctx.beginPath();ctx.arc(0,26+i*7,32-i*3,-2.4,-.74);ctx.stroke();ctx.strokeStyle=['#ffd36b','#ffb84a','#ff9f43','#ffd36b'][i];ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,26+i*7,32-i*3,-2.4,-.74);ctx.stroke();}}
 if(kind==='er'){for(let i=0;i<4;i++){ctx.strokeStyle='#5a1830';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-26,-11+i*7);ctx.bezierCurveTo(-10,-19+i*7,10,-3+i*7,26,-11+i*7);ctx.stroke();ctx.strokeStyle='#ff8fb0';ctx.lineWidth=4;ctx.stroke();}}
 ctx.restore();}
function drawDecor(room){const a=room.a-camera,b=room.b-camera;if(b<0||a>W)return;const d=room.cfg.decor;
 if(d==='soup'){ctx.save();for(let i=0;i<16;i++){const x=a+30+((i*67)%480)+Math.sin(clock*.5+i)*12,y=140+((i*41)%130)+Math.cos(clock*.4+i*2)*8,r=10+(i*7)%16;ctx.fillStyle=i%3?'rgba(124,247,223,.07)':'rgba(255,211,107,.07)';ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();}ctx.restore();
  text('CYTOSOL · the gel where reactions happen',a+260,128,8,'#9fd8cf','center');}
 if(d==='scaffold')for(const m of room.machines){const x=m.x-camera,fixed=m.got>=1,y=FLOOR-148,ox=fixed?0:Math.sin(clock*1.2+m.x)*20,oy=fixed?0:Math.cos(clock*.9+m.x)*9;
  ctx.lineWidth=4;ctx.strokeStyle=fixed?'#3ddc84':'#2d6b4b';
  if(fixed){ctx.beginPath();ctx.moveTo(x,FLOOR-52);ctx.lineTo(x,y+18);ctx.moveTo(x,y-18);ctx.lineTo(x,116);ctx.stroke();for(let yy=122;yy<FLOOR-56;yy+=8)if(yy<y-20||yy>y+20)rect('#9effc4',x-3,yy,6,2);}
  else{ctx.beginPath();ctx.moveTo(x,116);ctx.lineTo(x,138);ctx.lineTo(x+4,144);ctx.moveTo(x,FLOOR-52);ctx.lineTo(x,FLOOR-80);ctx.lineTo(x-4,FLOOR-86);ctx.stroke();}
  ctx.save();ctx.translate(x+ox,y+oy);ctx.rotate(fixed?0:Math.sin(clock+m.x)*.25);drawOrganelle(m.organelle,0,0);ctx.restore();
  text(fixed?'ANCHORED':'DRIFTING!',x,y-30,7,fixed?'#9effc4':(Math.floor(clock*3)%2?'#ffc0cb':'#ff7d93'),'center');}
 if(d==='highway'){const ty=FLOOR-96;for(let x=Math.max(a,0);x<Math.min(b,W);x+=6){const gap=room.machines.some(m=>m.track&&m.got<1&&Math.abs(m.x-camera-x)<22);if(gap)continue;rect(((x-a)/6|0)%2?'#3ddc84':'#9effc4',x,ty,6,4);rect('#1d5a3c',x,ty+4,6,2);}
  for(const m of room.machines)if(m.track&&m.got<1){const x=m.x-camera;text('✕',x,ty+4,10,'#ff7d93','center');ctx.strokeStyle='#ff7d9388';ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(x,ty+10);ctx.lineTo(x,FLOOR-56);ctx.stroke();ctx.setLineDash([]);}
  text('MICROTUBULE TRACK',a+40,ty-50,7,'#9fd8cf','left');}}
function drawMotor(room){const mo=room.motor,x=mo.x-camera,ty=FLOOR-96;if(x<-40||x>W+40)return;const ph=Math.sin(mo.step*9);
 // kinesin: two heads stepping on the track, a stalk, and the vesicle it hauls
 ctx.strokeStyle='#ffd36b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-6+ph*5,ty-2);ctx.lineTo(x,ty-14);ctx.lineTo(x+6-ph*5,ty-2);ctx.moveTo(x,ty-14);ctx.lineTo(x,ty-30);ctx.stroke();
 for(const hx of [x-6+ph*5,x+6-ph*5]){ctx.fillStyle='#ffb84a';ctx.beginPath();ctx.arc(hx,ty-2,4,0,7);ctx.fill();}
 ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(moleculeIcon('vesicleGold'),x-17,ty-64);ctx.restore();
 text('MOTOR PROTEIN',x,ty-70,7,'#ffd9a8','center');if(mo.blocked&&Math.floor(clock*3)%2)text('TRACK BROKEN!',x,ty+18,7,'#ff7d93','center');}
/* Sequence puzzles get a picture board: colored bases, codons, chains and stage thumbnails. */
function blocks(seq,cx,y,size=15,gap=2,ghost=false){const n=seq.length,x0=cx-(n*(size+gap)-gap)/2;
 for(let i=0;i<n;i++){const b=seq[i],x=x0+i*(size+gap);if(b==='_'){ctx.strokeStyle='#7d93a8';ctx.setLineDash([2,2]);ctx.strokeRect(Math.round(x)+.5,y+.5,size-1,size-1);ctx.setLineDash([]);continue;}
  rect(BASE_ICON[b]||'#9fb6c8',x,y,size,size);rect('#0b1424',x,y+size-2,size,2);text(b,x+size/2,y+size-4,size-5,'#0b1424','center');}
 return x0;}
function drawBoard(room){
 const cfg=room.cfg,cx=room.a+260-camera,y=64,w=330,h=88;if(cx+w/2<0||cx-w/2>W)return;
 const done=room.solved,wrong=room.flash>0&&!done,color=done?'#9effc4':wrong?'#ffc0cb':'#7cf7df';
 rect('#2f4a63',cx-w/2+12,0,2,y);rect('#2f4a63',cx+w/2-14,0,2,y);
 rect(done?'#0d3a26f0':wrong?'#5c1828f0':'#06101ee6',cx-w/2,y,w,h);rect(color,cx-w/2,y,w,done||wrong?4:2);text(done?'✓ '+cfg.title+' — COMPLETE':wrong?'✗ NOT A MATCH — TRY AGAIN':cfg.title,cx,y+12,8,color,'center');
 const label=(s,yy)=>text(s,cx-w/2+8,yy,8,'#a9c7d8','left');
 if(cfg.template){
  label('TEMPLATE',y+31);blocks(cfg.template,cx+20,y+20);
  const built=cfg.answer.map((b,i)=>i<room.pos?b:'_').join('');label(cfg.rna?'mRNA':'NEW',y+52);const bx=blocks(built,cx+20,y+41);
  if(!done&&Math.floor(clock*3)%2){ctx.strokeStyle='#ffd36b';ctx.lineWidth=2;ctx.strokeRect(Math.round(bx+room.pos*17)-1.5,y+39.5,18,18);ctx.lineWidth=1;}
  for(let i=0;i<cfg.template.length;i++){const x0=cx+20-(cfg.template.length*17-2)/2+i*17+7;rect('#4b6275',x0,y+36,1,4);}
 }else if(cfg.codons){
  label('mRNA',y+31);const n=cfg.codons.length;cfg.codons.forEach((c,i)=>{const gx=cx+20+(i-(n-1)/2)*58;blocks(c,gx,y+20,14,1);if(i===room.pos&&!done){ctx.strokeStyle='#ffd36b';ctx.strokeRect(Math.round(gx-25)+.5,y+18.5,50,18);}});
  label('CHAIN',y+56);cfg.codons.slice(0,room.pos).forEach((c,i)=>{const gx=cx+20+(i-(n-1)/2)*58;if(CODON_AA[c]){ctx.fillStyle='#ffd36b';ctx.beginPath();ctx.arc(gx,y+52,8,0,7);ctx.fill();text(CODON_AA[c],gx,y+55,7,'#2b1d04','center');if(i)rect('#ffd36b',gx-50,y+51,42,2);}else text('RELEASED!',gx,y+55,8,'#9effc4','center');});
 }else if(cfg.guides){
  const step=Math.min(room.pos,cfg.guides.length-1);label('GUIDE RNA',y+31);blocks(cfg.guides[step],cx+30,y+20);if(cfg.guides.length>1)text((done?cfg.guides.length:room.pos+1)+'/'+cfg.guides.length,cx+w/2-10,y+31,8,'#a9c7d8','right');
  label('PAM',y+56);text(done?'All targets cut!':'Cas9 also needs N G G beside it',cx+10,y+56,8,'#e8f6ff','center');blocks('NGG',cx+130,y+45,13,1);
 }else if(cfg.proof){
  label('RULE',y+31);blocks('AT',cx-30,y+20,15,2);text('and',cx+12,y+31,8,'#e8f6ff','center');blocks('GC',cx+52,y+20,15,2);
  label('FIXED',y+56);text(room.pos+' of '+cfg.answer.length+' mismatch'+(cfg.answer.length>1?'es':'')+' repaired',cx+20,y+56,8,done?'#b9ffd8':'#e8f6ff','center');
 }else if(cfg.splice){
  label('INTRON',y+31);blocks('GU',cx-10,y+20,14,1);text('· · ·',cx+28,y+31,9,'#e8f6ff','center');blocks('AG',cx+64,y+20,14,1);
  const msg=cfg.splice.filter((sg,i)=>!room.switches[i]?.cut).map(sg=>sg.seq).join(''),sz=msg.length>24?8:10;label('mRNA',y+56);blocks(msg,cx+24,y+46,sz,1);
 }else if(cfg.pictures){
  label('ORDER',y+40);const n=cfg.answer.length;cfg.answer.forEach((st,i)=>{const gx=cx+20+(i-(n-1)/2)*52;rect('#0b1a2c',gx-22,y+20,44,36);
   if(i<room.pos){ctx.save();ctx.translate(gx,y+38);ctx.scale(.3,.3);dgMitosisCell(ctx,0,0,st,52);ctx.restore();}else text('?',gx,y+43,14,'#ffd36b','center');
   if(i<n-1)text('→',gx+26,y+42,9,'#a9c7d8','center');});
 }
 text(done?'Gate open — keep going →':cfg.line,cx,y+h-10,9,done?'#b9ffd8':'#e8f6ff','center');
}
function drawSwitch(s,room){
 const seq=room.kind==='sequence',good=seq?(s.good>0||!!s.done):s.flash>0,bad=seq&&s.flash>0,done=room.solved;
 const x=s.x-camera+(bad?Math.sin(clock*60)*2*Math.min(1,s.flash*3):0),base=switchBase(room,s),w=s.w||34,h=room.cfg.pictures?52:room.cfg.proof?40:room.cfg.guides?44:30;if(x<-60||x>W+60)return;
 if(s.cut){ctx.strokeStyle='#9effc488';ctx.setLineDash([3,3]);ctx.strokeRect(Math.round(x-w/2)+.5,base-h+4.5,w-1,h-8);ctx.setLineDash([]);text('SPLICED',x,base-h/2-2,7,'#9effc4','center');text('OUT',x,base-h/2+8,7,'#9effc4','center');return;}
 const kept=s.done&&!s.cut;
 const edge=bad?FB.badEdge:good?FB.okEdge:done?FB.ok:s.cool>0?'#4b6275':'#ffd36b',fill=bad?FB.bad:good?FB.ok:done?FB.okDim:s.cool>0?'#16263a':'#1b3550';
 rect(s.swap>0?'#ffffff':edge,x-w/2-2,base-h-8,w+4,h+10);rect('#0b1a2c',x-w/2,base-h-6,w,h+6);rect(s.swap>.15?'#e8f6ff':fill,x-w/2+2,base-h-4,w-4,h+2);
 if(bad||good)markLater(x,base-h-22,good,10);else if(done)markLater(x,base-h-18,true,6);
 if(s.lift){rect('#2f4a63',x-2,base-26,4,26);rect(s.cool>0?'#33485a':'#ff8fa8',x-7,base-36,14,12);text('Ca²⁺',x,base-27,7,'#1b0d14','center');text('Z · '+room.cfg.pumpLabel,x,base+24,8,'#fff0b2','center');return;}
 if(room.kind==='meter'){text(room.cfg.pumpLabel,x,base-h-12,8,'#fff0b2','center');rect(s.cool>0?'#33485a':'#ff8fa8',x-7,base-h+6,14,14);text('Z',x,base-h+17,9,'#1b0d14','center');return;}
 if(room.cfg.proof){const q=room.cfg.proof[+s.value.split(':')[0]],bot=kept?q.fix:q.bot;
  rect(BASE_ICON[q.top],x-11,base-h+1,22,15);text(q.top,x,base-h+13,10,'#0b1424','center');rect('#d8e6ef',x-1,base-h+16,2,4);rect(BASE_ICON[bot],x-11,base-h+20,22,15);text(bot,x,base-h+32,10,'#0b1424','center');return;}
 if(room.cfg.splice){const q=s.value.split(':')[1],n=q.length,bw=Math.min(13,(w-6)/n);for(let i=0;i<n;i++){rect(BASE_ICON[q[i]]||'#ccc',x-n*bw/2+i*bw,base-h+3,bw-1,20);text(q[i],x-n*bw/2+i*bw+bw/2-.5,base-h+17,9,'#0b1424','center');}return;}
 if(room.cfg.guides){const [tg,pam]=s.value.split('|'),n=tg.length,bw=Math.min(13,(w-6)/n);for(let i=0;i<n;i++){rect(BASE_ICON[tg[i]]||'#ccc',x-n*bw/2+i*bw,base-h+2,bw-1,18);text(tg[i],x-n*bw/2+i*bw+bw/2-.5,base-h+15,9,'#0b1424','center');}
  text('PAM',x-26,base-h+34,7,'#c9b0ff','center');for(let i=0;i<3;i++){rect(BASE_ICON[pam[i]]||'#ccc',x-12+i*12,base-h+24,11,13);text(pam[i],x-6.5+i*12,base-h+34,8,'#0b1424','center');}return;}
 if(room.cfg.pictures){ctx.save();ctx.translate(x,base-h/2-2);ctx.scale(.36,.36);dgMitosisCell(ctx,0,0,s.value,52);ctx.restore();return;}
 const v=s.value,col=v.length===1?(BASE_ICON[v]||'#ffd36b'):'#e8f6ff';
 if(v.length===1){rect(col,x-12,base-h+3,24,20);text(v,x,base-h+18,13,'#0b1424','center');}
 else if(v==='STOP'){text('RELEASE',x,base-h+11,8,'#ffb0bd','center');text('FACTOR',x,base-h+21,8,'#ffb0bd','center');}
 else{const n=v.length,bw=Math.min(14,(w-6)/n);for(let i=0;i<n;i++){rect(BASE_ICON[v[i]]||'#ccc',x-n*bw/2+i*bw,base-h+3,bw-1,20);text(v[i],x-n*bw/2+i*bw+bw/2-.5,base-h+17,9,'#0b1424','center');}}
 if(room.cfg.codons&&!good&&!bad)text('tRNA',x,base-h-12,8,'#c9b0ff','center');
}
function drawMachine(x,label,icon,flash,color,st,solved){
 x-=camera;if(x<-50||x>W+50)return;
 const need=st?.need||0,got=st?.got||0,done=need>0&&got>=need,waiting=need>0&&!done&&!solved,ok=st?.ok>0,bad=st?.bad>0;
 if(bad)x+=Math.sin(clock*60)*2*Math.min(1,st.bad*3);
 const edge=bad?FB.badEdge:ok?FB.okEdge:done?FB.ok:waiting?FB.waitEdge:color,fill=bad?FB.bad:ok?FB.ok:done?FB.okDim:waiting?FB.wait:'#1d4c63';
 rect(edge,x-24,FLOOR-50,48,50);rect('#10263f',x-22,FLOOR-48,44,48);rect(fill,x-19,FLOOR-45,38,36);
 const ic=moleculeIcon(icon);ctx.save();ctx.imageSmoothingEnabled=true;ctx.globalAlpha=.9;ctx.drawImage(ic,Math.round(x-17),FLOOR-44);ctx.restore();
 text(label,x,FLOOR-56,8,'#d8ffed','center');
 if(need>0)text(done?'✓ DONE':got+'/'+need,x,FLOOR-2,8,done?'#b9ffd8':'#ffc0cb','center');
 if(ok||bad)markLater(x,FLOOR-80,ok,11);
 else if(done)mark(x+20,FLOOR-48,true,7);
 else if(Math.abs(player.x-(x+camera))<42)text(player.carry?'E · deliver':'E · use',x,FLOOR-68,8,'#fff0b2','center');
}

