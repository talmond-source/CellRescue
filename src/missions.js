/* Station names and the one-line mission brief each Ranger gives. */
const MISSION_STYLES = {
 atp:['Energy scanner','Each station runs a bio-scan on how ATP stores and delivers energy.'],
 ribosome:['Translation scanner','Each station runs a bio-scan on how ribosomes read mRNA and build proteins.'],
 rougher:['Protein-route scanner','Each station runs a bio-scan on how the rough ER builds and ships proteins.'],
 golgi:['Shipping scanner','Each station runs a bio-scan on how the Golgi labels, sorts and ships proteins.'],
 cytoplasm:['Cytosol scanner','Each station runs a bio-scan on what fills the cell and how things move through it.'],
 membrane:['Border scanner','Each station runs a bio-scan on how the membrane controls what enters and leaves.'],
 mito:['Power scanner','Each station runs a bio-scan on how mitochondria turn food into ATP.'],
 nucleus:['Archive scanner','Each station runs a bio-scan on how the nucleus protects DNA and sends out instructions.'],
 smoother:['Lipid scanner','Each station runs a bio-scan on the smooth ER’s lipid, detox and calcium jobs.'],
 lysosome:['Recycling scanner','Each station runs a bio-scan on how lysosomes digest and recycle.'],
 dna:['Code scanner','Each station runs a bio-scan on DNA base pairing and copying.'],
 rna:['Message scanner','Each station runs a bio-scan on how RNA carries and uses genetic messages.'],
 mitosis:['Division scanner','Each station runs a bio-scan on the stages of mitosis.'],
 crispr:['Defense scanner','Each station runs a bio-scan on how CRISPR finds and cuts virus DNA.']
};
const SCAN_LABELS=['ZONE 1 STATION','ZONE 2 STATION','ZONE 3 STATION','PHAGE SHIELD CONTROL','MISSION DEBRIEF'];
let activeQuestion=null;
/* Choices that point at lettered parts of a diagram keep their letter order; the rest are shuffled. */
function choiceOrder(q,random=Math.random){
 const order=q.c.map((_,i)=>i);
 if(q.c.every(c=>/^[A-D](\s—|$)/.test(c)))return order;
 for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 return order;
}
/* index 0–2: zone stations, 3: Phage shield, 4: final debrief. */
function askQuestion(index,finish){
 const q=QUESTIONS[ranger.id][index];
 activeQuestion={index,q,order:choiceOrder(q),tries:0,first:null,solved:false,finish};
 mode=index===4?'quiz':'task';
 showModal(SCAN_LABELS[index]+' · BIO-SCAN '+(index+1)+' OF 5',MISSION_STYLES[ranger.id][0],'');
 $('panel').classList.toggle('scan',true);$('overlay').classList.toggle('full',true);$('modalText').hidden=true;
 const box=$('choices');
 const figure=document.createElement('canvas');figure.className='diagram';figure.width=1280;figure.height=540;
 figure.setAttribute('role','img');figure.setAttribute('aria-label','Diagram for the question');
 drawDiagram(figure,q.d,q.o);
 const question=document.createElement('p');question.className='question';question.textContent=q.q;
 const list=document.createElement('div');list.className='answers';list.id='answers';
 activeQuestion.order.forEach((original,n)=>{
  const b=document.createElement('button');b.className='answer';
  const key=document.createElement('span');key.className='key';key.textContent=String(n+1);
  const label=document.createElement('span');label.textContent=q.c[original];
  b.append(key,label);b.onclick=()=>answerQuestion(b,original);list.append(b);
 });
 const feedback=document.createElement('div');feedback.className='feedback';feedback.id='feedback';feedback.hidden=true;
 box.append(figure,question,list,feedback);
 if(index<4){const back=document.createElement('button');back.className='ghost';back.textContent='Back to the level';back.onclick=closeQuestion;$('modalActions').append(back);}
}
function answerQuestion(button,original){
 const s=activeQuestion;if(!s||s.solved)return;
 const q=s.q,feedback=$('feedback');
 if(s.first===null)s.first=q.c[original];
 feedback.hidden=false;feedback.replaceChildren();
 const message=document.createElement('p');feedback.append(message);
 if(original!==q.a){
  s.tries++;button.disabled=true;button.classList.add('bad');feedback.className='feedback miss';
  message.textContent='Not quite. Hint: '+HINTS[ranger.id][s.index];tone(150,.12,'triangle');
  return;
 }
 s.solved=true;button.classList.add('good');
 for(const b of $('answers').children)b.disabled=true;
 feedback.className='feedback hit';
 message.textContent=(s.tries?'That’s it. ':'Correct! ')+q.why;
 tone(520,.08,'triangle');setTimeout(()=>tone(780,.12,'triangle'),90);
 run.score+=Math.max(50,300-s.tries*125);
 run.answers.push({zone:s.index+1,question:q.q,answer:s.first,correct:s.tries===0});
 const next=document.createElement('button');next.className='primary';next.id='scanContinue';
 next.textContent=s.index===4?'Complete mission':s.index===3?'Shield disabled — back to the fight':'Station restored — continue';
 next.onclick=()=>s.finish(s.tries===0);feedback.append(next);
 $('modalActions').replaceChildren();
 feedback.scrollIntoView?.({block:'nearest',behavior:'smooth'});next.focus?.();
}
function closeQuestion(){activeQuestion=null;$('overlay').hidden=true;$('panel').classList.toggle('scan',false);$('overlay').classList.toggle('full',false);mode='play';canvas.focus();}
function openMissionPuzzle(boss=false){
 askQuestion(boss?3:zone,()=>{
  world.terminal.done=true;if(boss)world.shieldUnlocked=true;
  player.hp=Math.min(10,player.hp+3);player.energy=6;closeQuestion();updateHUD();
 });
}
