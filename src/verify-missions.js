// Content checks for the bio-scan questions: every Ranger has five, every diagram draws, and choice shuffling is safe.
function verifyQuestions(){
 let count=0;
 for(const r of RANGERS){
  const list=QUESTIONS[r.id];
  if(!list||list.length!==5)throw Error('Five questions needed for '+r.id);
  if(!HINTS[r.id]||HINTS[r.id].length!==5)throw Error('Five hints needed for '+r.id);
  list.forEach((q,i)=>{
   const where=r.id+' #'+(i+1);
   if(!DIAGRAMS[q.d])throw Error('Unknown diagram '+q.d+' in '+where);
   if(!q.q||!q.why||!HINTS[r.id][i])throw Error('Missing text in '+where);
   if(q.c.length<3||q.c.length>4||!(q.a>=0&&q.a<q.c.length))throw Error('Bad choices in '+where);
   if(new Set(q.c).size!==q.c.length)throw Error('Duplicate choice in '+where);
   const lettered=q.c.every(c=>/^[A-D](\s—|$)/.test(c));
   if(lettered&&q.c.some((c,n)=>c[0]!=='ABCD'[n]))throw Error('Letters out of order in '+where);
   if(lettered&&!q.o.marks&&!q.o.cells&&!q.o.targets&&!q.o.routes)throw Error('Lettered answers but no lettered diagram in '+where);
   for(let seed=0;seed<6;seed++){
    let x=seed+1;const order=choiceOrder(q,()=>((x=x*9301+49297)%233280)/233280);
    if(order.slice().sort().join()!==q.c.map((_,n)=>n).join())throw Error('Shuffle lost a choice in '+where);
    if(lettered&&order.join()!==q.c.map((_,n)=>n).join())throw Error('Lettered choices were shuffled in '+where);
   }
   drawDiagram(document.createElement('canvas'),q.d,q.o);
   count++;
  });
 }
 return count;
}
