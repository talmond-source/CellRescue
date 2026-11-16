function solvePuzzle(s){
 const act=(a,v)=>missionAction(s,a,v);
 let guard=0;
 switch(s.id){
 case 'atp':for(let i=0;i<3;i++)while(s.delivered[i]<s.demands[i]){if(!s.energy)act('charge');act('deliver',i);}break;
 case 'ribosome':while(!s.done)act('match',{AUG:'UAC',GGC:'CCG',UUU:'AAA',UAA:'release'}[s.codons[s.progress]]);break;
 case 'rougher':for(let i=0;i<4;i++)if(s.bits[i]!==s.target[i])act('fold',i);break;
 case 'golgi':while(!s.done)act('route',{'secreted enzyme':'outside','membrane receptor':'membrane','lysosomal enzyme':'lysosome'}[s.cargo[s.progress]]);break;
 case 'cytoplasm':for(const [i,target]of [[0,0],[1,2],[4,1],[7,0],[8,0]])while(!s.done&&s.tiles[i]!==target)act('rotate',i);break;
 case 'membrane':while(s.inside<s.target)act(s.outside>s.inside?'channel':'pump');while(s.waste>0)act('export');break;
 case 'mito':while(!s.done&&guard++<100){if(s.gradient>=3)act('synthase');else if(s.fuel>0)act('pump');else act('refuel');}break;
 case 'nucleus':for(const b of s.code)act('base',b);act('transcribe');act('export');break;
 case 'smoother':while(!s.done&&guard++<100){if(s.calcium>6)act('store');else if(s.calcium<4)act('release');else act('advance');}break;
 case 'lysosome':while(s.cargo.length)act('digest');act('rebuild');act('rebuild');break;
 case 'dna':for(let i=0;i<s.copy.length;i++)while(s.copy[i]!==({A:'T',T:'A',G:'C',C:'G'})[s.template[i]])act('repair',i);break;
 case 'rna':{
  const queue=[[0,[]]],seen=new Set([0]);let path;
  for(let n=0;n<queue.length;n++){
   const [at,steps]=queue[n];if(at===15){path=steps;break;}
   for(const d of [-4,1,4,-1]){const next=at+d;if(next<0||next>15||s.walls.includes(next)||seen.has(next)||(Math.abs(d)===1&&Math.floor(next/4)!==Math.floor(at/4)))continue;seen.add(next);queue.push([next,[...steps,d]]);}
  }
  if(!path)throw Error('Courier route has no path');for(const d of path)act('move',d);break;}

 case 'mitosis':for(let i=1;i<=s.pairs;i++){act('separate',[i,'left']);act('separate',[i,'right']);}break;
 case 'crispr':act('select',3);act('cut');break;
 }
 if(!s.done)throw Error('Unsolvable puzzle '+s.id+' level '+s.level);
 return s;
}
function verifyPuzzles(){
 let count=0;
 for(const id of Object.keys(MISSION_STYLES))for(let level=0;level<4;level++){
  const s=solvePuzzle(createMissionPuzzle(id,level));
  if(s.mistakes)throw Error('Correct solution penalized '+id);
  const before=JSON.stringify(s);missionAction(s,'invalid',null);
  if(JSON.stringify(s)!==before)throw Error('Completed puzzle accepts more actions');count++;
 }
 return count;
}
