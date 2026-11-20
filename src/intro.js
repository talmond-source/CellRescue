
/* ================= Animated intro: "The Phage That Broke the Rules" =================
   Drawn live from the game's own sprites (no video file). About 86 seconds, skippable at any time.
   Plays once on a student's first visit (after a click, so sound can play) and from the title's
   WATCH INTRO button. Scenes are on one timeline (seconds); each scene draws itself from its own clock. */
const INTRO_LEN=86;
let introClock=0,introShake=0,introFlash=0,introFlashColor='#fff',introDrone=null,introSfxDone=new Set(),introParts=[];
const ictx=$('introArt')?.getContext?.('2d');
const IW=640,IH=360,IFLOOR=318;

/* ---------- small drawing helpers ---------- */
function ispr(id,frame,x,y,scale=1,face=1,o={}){const art=atlases[id]?.[frame];if(!art)return;const g=ictx;g.save();g.translate(Math.round(x),Math.round(y));
 if(o.rot)g.rotate(o.rot);g.scale(face*scale,scale);g.globalAlpha=o.alpha??1;g.imageSmoothingEnabled=!!o.smooth;g.imageSmoothingQuality='high';
 const src=o.tint?introTint(id,frame,o.tint):art;g.drawImage(src,-64,-102);g.restore();}
const introTints={};
function introTint(id,frame,color){const k=id+frame+color;return introTints[k]||(introTints[k]=tinted(atlases[id][frame],color));}
function ishadow(x,w=26,y=IFLOOR){const g=ictx;g.fillStyle='#02050c88';g.beginPath();g.ellipse(x,y+2,w,w*.18,0,0,7);g.fill();}
function ibg(name,off=0,dark=0,tint=null){const g=ictx,bg=environments[name];if(!bg)return;const bw=IH*bg.width/bg.height,x=-(((off%bw)+bw)%bw);
 g.imageSmoothingEnabled=false;g.drawImage(bg,x,0,bw,IH);g.drawImage(bg,x+bw,0,bw,IH);
 if(tint){g.fillStyle=tint;g.fillRect(0,0,IW,IH);}if(dark){g.fillStyle='rgba(3,6,16,'+dark+')';g.fillRect(0,0,IW,IH);}}
function ifloor(color='#6ecbbf',scroll=0){const g=ictx;g.fillStyle='#0a182b';g.fillRect(0,IFLOOR,IW,IH-IFLOOR);g.fillStyle=color;g.fillRect(0,IFLOOR,IW,3);
 for(let x=-((scroll%32)+32)%32;x<IW;x+=32){g.fillStyle='#52788a';g.fillRect(x+3,IFLOOR+8,23,2);g.fillStyle='#0f1f34';g.fillRect(x+28,IFLOOR+6,2,30);}}
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,clamp01=v=>Math.max(0,Math.min(1,v)),lerp=(a,b,t)=>a+(b-a)*t,seg=(t,a,b)=>clamp01((t-a)/(b-a));
function ipart(x,y,vx,vy,life,color,size=2,grav=0){introParts.push({x,y,vx,vy,life,max:life,color,size,grav});}
function iburst(x,y,color,n=16,speed=160){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=speed*(.3+Math.random()*.7);ipart(x,y,Math.cos(a)*s,Math.sin(a)*s,.3+Math.random()*.4,color,2+Math.random()*2,200);}}
function idust(x,n=18){for(let i=0;i<n;i++)ipart(x+(Math.random()-.5)*60,IFLOOR,(Math.random()-.5)*260,-40-Math.random()*90,.5+Math.random()*.5,'#9fb6c8',3,120);}

/* ---------- sound: built from tones and noise, so nothing to download ---------- */
function inoise(dur=.3,vol=.2,freq=900,type='lowpass'){if(muted)return;try{audioContext ||= new (window.AudioContext||window.webkitAudioContext)();const a=audioContext,n=Math.floor(a.sampleRate*dur),buf=a.createBuffer(1,n,a.sampleRate),d=buf.getChannelData(0);
 for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=buf;f.type=type;f.frequency.value=freq;g.gain.value=vol;s.connect(f);f.connect(g);g.connect(a.destination);s.start();}catch(e){}}
const ISFX={
 boom(){inoise(.9,.35,260);tone(70,.7,'sine',.14);},
 clang(){inoise(.25,.18,3000,'highpass');tone(1900,.45,'square',.035);tone(2850,.35,'triangle',.04);},
 whoosh(){inoise(.35,.12,1400,'bandpass');},
 glitch(){for(let i=0;i<6;i++)setTimeout(()=>tone(200+Math.random()*1400,.04,'square',.018),i*45);},
 alarm(){for(let i=0;i<4;i++){setTimeout(()=>tone(880,.22,'square',.03),i*500);setTimeout(()=>tone(620,.22,'square',.03),i*500+250);}},
 blip(f=660){tone(f,.09,'square',.03);setTimeout(()=>tone(f*1.5,.11,'triangle',.03),70);},
 slam(){inoise(.5,.3,500);tone(110,.5,'sawtooth',.06);setTimeout(()=>tone(220,.6,'triangle',.05),120);},
 ignite(){tone(300,.5,'sawtooth',.03);setTimeout(()=>tone(600,.6,'triangle',.035),120);inoise(.4,.08,2500,'highpass');},
};
function introDroneStart(){if(muted||introDrone)return;try{audioContext ||= new (window.AudioContext||window.webkitAudioContext)();const a=audioContext;if(a.state==='suspended')a.resume();
 const g=a.createGain();g.gain.value=0;g.gain.linearRampToValueAtTime(.035,a.currentTime+2);g.connect(a.destination);
 const o1=a.createOscillator(),o2=a.createOscillator(),f=a.createBiquadFilter();o1.type='sawtooth';o2.type='sine';o1.frequency.value=55;o2.frequency.value=82.4;f.type='lowpass';f.frequency.value=220;
 o1.connect(f);o2.connect(f);f.connect(g);o1.start();o2.start();introDrone={g,o1,o2,f};}catch(e){}}
function introDroneSet(freq,cut,vol=.035){if(!introDrone)return;const a=audioContext,t=a.currentTime;introDrone.o1.frequency.linearRampToValueAtTime(freq,t+1.2);introDrone.o2.frequency.linearRampToValueAtTime(freq*1.498,t+1.2);introDrone.f.frequency.linearRampToValueAtTime(cut,t+1.2);introDrone.g.gain.linearRampToValueAtTime(vol,t+.6);}
function introDroneStop(){if(!introDrone)return;try{const a=audioContext;introDrone.g.gain.linearRampToValueAtTime(0,a.currentTime+.4);const d=introDrone;setTimeout(()=>{d.o1.stop();d.o2.stop();},500);}catch(e){}introDrone=null;}
/* sound cues: [time, name, ...args] — each fires once */
const ICUES=[[0.2,'drone',55,200],[17,'drone',73.4,420],[23.4,'whoosh'],[26.4,'boom'],[26.4,'drone',41.2,180,.05],[34,'glitch'],[34.6,'whoosh'],[35.8,'glitch'],[37.2,'glitch'],[38,'boom'],
 [44,'drone',49,260,.03],[47.5,'ignite'],[48.6,'whoosh'],[49.45,'clang'],[52.6,'whoosh'],[53.5,'boom'],[54,'drone',36.7,140,.03],[58,'alarm'],[58,'drone',61.7,300,.04],
 ...Array.from({length:14},(_,i)=>[64+i*.6,'blip',440+i*40]),[72.4,'drone',82.4,600,.045],[81,'slam'],[81,'drone',110,900,.03]];
function introCues(t){for(const c of ICUES){const key=c.join();if(t>=c[0]&&!introSfxDone.has(key)){introSfxDone.add(key);if(c[1]==='drone'){introDroneStart();introDroneSet(c[2],c[3],c[4]);}else ISFX[c[1]]?.(c[2]);}}}

/* ---------- captions ---------- */
const ICAPS=[
 [0.6,5.2,'','Outside the cell, a bacterial colony drifts in the dark, and phages hunt it.'],
 [5.2,10,'','Phages are viruses that infect only bacteria. But one of them was born different.'],
 [10,15,'','A random mutation reshaped the tail fibres it uses to grip a cell. Now it could grip ours.'],
 [15.3,19,'','Inside every cell is a city that never sleeps.'],
 [19,23,'','Every organelle has a job, and the city lives because they do them.'],
 [27.4,31.8,'THE PHAGE','Bacteria were never enough for me.'],
 [32.6,38,'','It injected its DNA, and the city’s own machines began building more phages.'],
 [39.4,43.8,'THE PHAGE','Your city builds for ME now.'],
 [45.2,48.2,'CRISPR RANGER','Then I’ll cut you out of it.'],
 [50.4,52.5,'THE PHAGE','…Cute.'],
 [54.4,58,'','Even the bacteria’s own defence could not stop it alone.'],
 [58.4,63.8,'NUCLEUS RANGER','Archive to all Rangers: the cell is under attack. Cell Protocol, NOW!'],
 [72.8,77,'','Fourteen Rangers. Fourteen jobs. Do your job, and the city fights back.'],
 [77.3,81,'THE PHAGE','Then come and find me… if you can.'],
];
const ISPEAKER={'THE PHAGE':'#ff9a5a','CRISPR RANGER':'#6bf4dc','NUCLEUS RANGER':'#be86ff'};
function introCaption(t){const c=ICAPS.find(c=>t>=c[0]&&t<c[1]);if(!c)return;const g=ictx,[t0,t1,who,line]=c,shown=line.slice(0,Math.floor((t-t0)*48)),fade=Math.min(1,(t1-t)*4);
 // on a small screen (a phone held upright) the words are drawn bigger so they stay readable
 const k=Math.min(1.5,Math.max(1,520/(g.canvas.clientWidth||640))),m=k>1?14:40,fs=Math.round(15*k),lh=Math.round(17*k),lab=Math.round(8*k);
 g.save();g.globalAlpha=fade;g.font='bold '+fs+'px system-ui, sans-serif';
 const words=shown.split(' '),lines=[''];for(const w of words){const test=(lines.at(-1)+' '+w).trim();if(g.measureText(test).width>IW-2*m-30)lines.push(w);else lines[lines.length-1]=test;}
 const full=[''];for(const w of line.split(' ')){const test=(full.at(-1)+' '+w).trim();if(g.measureText(test).width>IW-2*m-30)full.push(w);else full[full.length-1]=test;}
 const n=Math.min(3,full.length),h=(who?lab+12:8)+n*lh+6,y=IH-12-h;
 g.fillStyle='#030814dd';g.fillRect(m,y,IW-2*m,h);g.fillStyle=who?ISPEAKER[who]:'#7cf7df';g.fillRect(m,y,3,h);
 if(who){g.font=lab+'px "Press Start 2P", monospace';g.fillStyle=ISPEAKER[who];g.textAlign='left';g.fillText(who,m+12,y+5+lab);}
 g.font='bold '+fs+'px system-ui, sans-serif';g.fillStyle='#eef6ff';g.textAlign='left';
 lines.slice(0,3).forEach((l,i)=>g.fillText(l,m+12,y+(who?lab+12:6)+lh*(i+1)-4));g.restore();}

/* ---------- scene 1: the colony (0-15) ---------- */
function sceneColony(t){const g=ictx;
 const sky=g.createRadialGradient(470,170,10,470,170,520);sky.addColorStop(0,'#162a3e');sky.addColorStop(1,'#03060e');g.fillStyle=sky;g.fillRect(0,0,IW,IH);
 for(let i=0;i<70;i++){const x=(i*137+t*(4+i%3*3))%IW,y=(i*71)%IH;g.fillStyle=i%5?'#7ff5df44':'#ffd88766';g.fillRect(x,y,1,1);}
 // the cell city: a huge glowing membrane wall on the left
 const wallX=lerp(-40,30,seg(t,8,15));g.fillStyle='#3a1d4a';g.beginPath();g.moveTo(-200,0);g.lineTo(wallX+Math.sin(t)*4,0);for(let y=0;y<=IH;y+=20)g.lineTo(wallX+Math.sin(y*.05+t*1.5)*8,y);g.lineTo(-200,IH);g.fill();
 g.strokeStyle='#ff89bd';g.lineWidth=3;g.beginPath();for(let y=0;y<=IH;y+=10)g.lineTo(wallX+Math.sin(y*.05+t*1.5)*8,y);g.stroke();g.lineWidth=1;
 if(t>8){g.save();g.globalAlpha=seg(t,8,10);g.font='8px "Press Start 2P", monospace';g.fillStyle='#ffb3d2';g.textAlign='left';g.fillText('CELL CITY',wallX+16,40);g.restore();}
 // the colony: bacteria drifting, mini-phages clinging to them
 const cam=t*6;
 for(let i=0;i<7;i++){const bx=330+i*58-cam*(.4+i%3*.1)+((i*37)%40),by=120+((i*83)%160)+Math.sin(t*1.2+i)*6;
  ispr('bacteria',i%2,bx,by,1.05,i%2?1:-1,{alpha:.95});
  if(i%2===0&&t<10)ispr('miniphage',4+Math.floor(t*4+i)%2,bx+8,by-40,.6,-1);}
 // the one that was born different
 const rise=ease(seg(t,5.6,9)),px=500,py=lerp(420,250,rise);
 if(t>5.6){g.save();g.shadowColor='#c23cff';g.shadowBlur=18;ispr('phage',t<12?0:2,px,py,1.3,1);g.restore();
  // the mutated tail fibres glitch with green light
  if(t>10){const k=Math.floor(t*14)%3;g.save();g.globalCompositeOperation='lighter';g.strokeStyle=['#b6ff4f','#ff4fd8','#4ff0ff'][k];g.lineWidth=2;
   for(let i=0;i<4;i++){const a=-1.9+i*.42+Math.sin(t*9+i)*.08;g.beginPath();g.moveTo(px+((i%2)?14:-14),py-58);g.quadraticCurveTo(px+Math.cos(a)*60,py-40+Math.sin(a)*20,px+Math.cos(a)*44+(k-1)*3,py+4);g.stroke();}
   g.restore();if(Math.random()<.25)ipart(px+(Math.random()-.5)*60,py-40+Math.random()*40,0,-30,.4,'#b6ff4f',2);}}
 if(t>12.5){g.save();g.globalAlpha=seg(t,12.5,13.5)*(.5+.5*Math.sin(t*10));g.font='8px "Press Start 2P", monospace';g.fillStyle='#b6ff4f';g.textAlign='center';g.fillText('MUTATION: NEW HOST',px,py-120);g.restore();}
 // turns toward the city
 if(t>13.2){g.fillStyle='rgba(255,40,80,'+(seg(t,13.2,15)*.25)+')';g.fillRect(0,0,IW,IH);}
}
/* ---------- scene 2: Cell City (15-23) ---------- */
function sceneCity(t){const g=ictx,lt=t-15;ibg('environment',lt*22,.15);ifloor('#6ecbbf',lt*60);
 // Rangers at work: running deliveries across the street
 const crew=[['atp',0],['ribosome',1.6],['golgi',3],['mito',4.3],['rna',5.5]];
 crew.forEach(([id,d],i)=>{const x=-60+(lt-d)*150;if(x<-70||x>IW+70)return;ishadow(x);ispr(id,[1,2,3,2][Math.floor(lt*10+i)%4],x,IFLOOR,1.3,1);
  const ic=moleculeIcon(['atp','polypeptide','vesicleGold','phosphate','nucleotide'][i]);if(ic)g.drawImage(ic,x-14,IFLOOR-128+Math.sin(lt*8)*2,28,28);});
 for(let i=0;i<10;i++){const x=(i*91+lt*30)%IW,y=60+(i*47)%120+Math.sin(lt+i)*10;g.fillStyle=['#62e28e66','#ffd77766','#78a8ff66'][i%3];g.beginPath();g.arc(x,y,3,0,7);g.fill();}
 if(lt>7){g.fillStyle='rgba(20,0,10,'+seg(lt,7,8)*.5+')';g.fillRect(0,0,IW,IH);}
}
/* ---------- scene 3: the breach (23-32) ---------- */
function sceneBreach(t){const g=ictx,lt=t-23;ibg('membranes',lt*4,.35);
 // alarm wash
 const pulse=.5+.5*Math.sin(lt*6);g.fillStyle='rgba(255,30,60,'+(lt>3.4?.12+.1*pulse:0)+')';g.fillRect(0,0,IW,IH);ifloor('#ff6b8a');
 // shadow grows, then the Phage drops in
 const fall=seg(lt,.6,3.4),py=lerp(-140,IFLOOR,fall*fall),px=400;
 if(lt>.2&&lt<3.4){g.fillStyle='rgba(0,0,0,'+(.2+fall*.4)+')';g.beginPath();g.ellipse(px,IFLOOR+3,30+fall*30,6,0,0,7);g.fill();}
 if(lt>.6){if(lt<3.4){g.save();g.globalAlpha=.4;for(let i=1;i<5;i++)ispr('phage',0,px,py-i*26,1.6,1,{alpha:.25,tint:'#ff9a5a'});g.restore();ispr('phage',0,px,py,1.6,1);}
  else{ishadow(px,46);ispr('phage',lt<4.6?3:lt<5.4?7:0,px,IFLOOR,1.6,1);}}
 if(lt>=3.4&&!introSfxDone.has('breachfx')){introSfxDone.add('breachfx');introShake=14;idust(px,30);iburst(px,IFLOOR-10,'#ff9a5a',20,220);}
 // cracks in the floor
 if(lt>3.4){g.strokeStyle='#ff9a5acc';g.lineWidth=2;for(let i=0;i<5;i++){g.beginPath();g.moveTo(px,IFLOOR+2);let x=px,y=IFLOOR+2;for(let k=0;k<4;k++){x+=(i-2)*14+Math.sin(i*3+k)*8;y+=6;g.lineTo(x,y);}g.stroke();}g.lineWidth=1;}
}
/* ---------- the glitching double-helix dragon (viral DNA) ---------- */
const dragonLayer=typeof document!=='undefined'?makeCanvas(IW,IH):null;
function dragonPath(u){// head path: out of the Phage's hand, a loop across the sky, then a dive into the city
 const P=[[452,196],[380,90],[200,60],[80,140],[170,230],[330,150],[250,60],[120,90],[60,260]];const n=P.length-1,s=clamp01(u)*n,i=Math.min(n-1,Math.floor(s)),f=s-i;
 const p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(n,i+2)];const c=(a,b,c2,d)=>.5*((2*b)+(-a+c2)*f+(2*a-5*b+4*c2-d)*f*f+(-a+3*b-3*c2+d)*f*f*f);
 return [c(p0[0],p1[0],p2[0],p3[0]),c(p0[1],p1[1],p2[1],p3[1])];}
function drawDragon(t,u){if(!dragonLayer)return;const d=dragonLayer.getContext('2d');d.clearRect(0,0,IW,IH);
 const N=64,pts=[];for(let i=0;i<N;i++)pts.push(dragonPath(u-i*.0085));
 // each body point: the two strands twist around the spine; the body thins toward the tail
 const body=pts.map((p,i)=>{const q=pts[Math.min(N-1,i+1)],nx=-(q[1]-p[1]),ny=q[0]-p[0],len=Math.hypot(nx,ny)||1,taper=1-i/N,r=(5+17*taper)*Math.sin(i*.42-t*8),depth=Math.cos(i*.42-t*8);
  return {x:p[0],y:p[1],ax:p[0]+nx/len*r,ay:p[1]+ny/len*r,bx:p[0]-nx/len*r,by:p[1]-ny/len*r,w:1.6+6*taper,depth};});
 const strand=(side,color,dark)=>{for(let i=N-2;i>=0;i--){const p=body[i],q=body[i+1],front=(side>0?p.depth:-p.depth)>0;
   const x1=side>0?p.ax:p.bx,y1=side>0?p.ay:p.by,x2=side>0?q.ax:q.bx,y2=side>0?q.ay:q.by;
   d.lineCap='round';d.strokeStyle='#07020c';d.lineWidth=p.w+4;d.beginPath();d.moveTo(x1,y1);d.lineTo(x2,y2);d.stroke();
   d.strokeStyle=front?color:dark;d.lineWidth=p.w;d.beginPath();d.moveTo(x1,y1);d.lineTo(x2,y2);d.stroke();
   if(front&&p.w>4){d.strokeStyle='#ffffffaa';d.lineWidth=1.4;d.beginPath();d.moveTo(x1,y1-p.w*.25);d.lineTo(x2,y2-p.w*.25);d.stroke();}}};
 // back strand, then base-pair rungs (the game's A/T/G/C colours), then the front strand
 strand(-1,'#ff4fd8','#7a1d6a');
 body.forEach((p,i)=>{if(i%2||i<3)return;d.lineCap='butt';d.strokeStyle='#07020c';d.lineWidth=p.w*.7+3;d.beginPath();d.moveTo(p.ax,p.ay);d.lineTo(p.bx,p.by);d.stroke();
  d.strokeStyle=['#ff5c6c','#ffd23f','#3ddc84','#4aa3ff'][(i/2)%4];d.lineWidth=p.w*.7;d.beginPath();d.moveTo(p.ax,p.ay);d.lineTo(p.bx,p.by);d.stroke();});
 strand(1,'#c4ff4f','#4f7a16');
 // dorsal spikes: torn data shards along the spine
 for(let i=4;i<N-10;i+=5){const p=body[i],q=body[i+1],a=Math.atan2(q.y-p.y,q.x-p.x)-Math.PI/2,h=4+p.w*1.6;d.fillStyle=i%10?'#ff4fd8':'#c4ff4f';d.strokeStyle='#07020c';d.lineWidth=2;
  d.beginPath();d.moveTo(p.x+Math.cos(a+1.2)*5,p.y+Math.sin(a+1.2)*5);d.lineTo(p.x+Math.cos(a)*(h+18),p.y+Math.sin(a)*(h+18));d.lineTo(p.x+Math.cos(a-1.2)*5,p.y+Math.sin(a-1.2)*5);d.closePath();d.fill();d.stroke();}
 // the head: long angular jaws, fangs, swept-back horns made of the two strands, one glowing eye
 const [hx,hy]=pts[0],[bx,by]=pts[3],a=Math.atan2(hy-by,hx-bx),open=.5+.5*Math.sin(t*11),S=2.3;d.save();d.translate(hx,hy);d.rotate(a);d.scale(S,S);
 d.lineJoin='round';d.lineWidth=1.6;d.strokeStyle='#07020c';
 d.fillStyle='#ff4fd8';d.beginPath();d.moveTo(-12,-6);d.lineTo(-34,-20);d.lineTo(-22,-8);d.closePath();d.fill();d.stroke();// horns
 d.fillStyle='#c4ff4f';d.beginPath();d.moveTo(-8,-8);d.lineTo(-30,-28);d.lineTo(-16,-9);d.closePath();d.fill();d.stroke();
 d.fillStyle='#2a0f3a';d.beginPath();d.moveTo(-14,4);d.lineTo(18,6+open*7);d.lineTo(22,9+open*8);d.lineTo(4,12);d.lineTo(-12,10);d.closePath();d.fill();d.stroke();// lower jaw
 d.fillStyle='#fff';for(let k=0;k<3;k++){d.beginPath();d.moveTo(2+k*6,6+open*(2+k*2));d.lineTo(5+k*6,1+open*(2+k*2));d.lineTo(8+k*6,6+open*(2+k*2));d.fill();}// lower fangs
 d.fillStyle='#3d1554';d.beginPath();d.moveTo(-16,-9);d.lineTo(6,-11);d.lineTo(26,-4);d.lineTo(28,1);d.lineTo(-2,3);d.lineTo(-16,4);d.closePath();d.fill();d.stroke();// upper jaw
 d.strokeStyle='#c4ff4f';d.lineWidth=1.2;d.beginPath();d.moveTo(-12,-6);d.lineTo(6,-8);d.lineTo(24,-3);d.stroke();d.strokeStyle='#ff4fd8';d.beginPath();d.moveTo(-12,1);d.lineTo(26,0);d.stroke();
 d.fillStyle='#fff';for(let k=0;k<4;k++){d.beginPath();d.moveTo(2+k*6,2);d.lineTo(5+k*6,7);d.lineTo(8+k*6,2);d.fill();}// upper fangs
 const eg=d.createRadialGradient(-2,-5,0,-2,-5,8);eg.addColorStop(0,'#ffffffff');eg.addColorStop(.35,'#ff2266ee');eg.addColorStop(1,'#ff226600');d.fillStyle=eg;d.beginPath();d.arc(-2,-5,8,0,7);d.fill();
 d.fillStyle='#fff';d.beginPath();d.moveTo(-6,-5);d.lineTo(-2,-7);d.lineTo(3,-5);d.lineTo(-2,-3.5);d.closePath();d.fill();
 d.restore();
 // stray code bits shed from the tail
 for(let i=0;i<10;i++){const p=body[N-1-((i*5)%20)];d.fillStyle=i%2?'#c4ff4f':'#ff4fd8';d.font='8px "Press Start 2P", monospace';d.fillText('ATGC'[(i+Math.floor(t*10))%4],p.x+Math.sin(t*7+i)*18,p.y+Math.cos(t*5+i*2)*18);}
 // composite with an RGB split and torn horizontal slices
 const g=ictx;g.save();g.globalCompositeOperation='lighter';g.globalAlpha=.55;g.drawImage(introTintCanvas(dragonLayer,'#ff0040'),-3,0);g.drawImage(introTintCanvas(dragonLayer,'#00e5ff'),3,0);g.restore();
 g.drawImage(dragonLayer,0,0);
 for(let k=0;k<5;k++){if(Math.random()<.5)continue;const y=Math.floor(Math.random()*IH),h=2+Math.floor(Math.random()*10),dx=(Math.random()-.5)*26;g.drawImage(dragonLayer,0,y,IW,h,dx,y,IW,h);}
 if(Math.random()<.08)ISFX.glitch();}
const _tintC=typeof document!=='undefined'?makeCanvas(IW,IH):null;
function introTintCanvas(src,color){const c=_tintC,g=c.getContext('2d');g.clearRect(0,0,IW,IH);g.drawImage(src,0,0);g.globalCompositeOperation='source-atop';g.fillStyle=color;g.fillRect(0,0,IW,IH);g.globalCompositeOperation='source-over';return c;}
/* ---------- scene 4: the hijack (32-44) ---------- */
function sceneHijack(t){const g=ictx,lt=t-32;ibg('environment',80+lt*3,.35);
 // the city's factories turn red as the viral DNA takes over
 const taken=seg(lt,5.5,8);if(taken){g.fillStyle='rgba(255,20,70,'+(taken*.28*(.7+.3*Math.sin(lt*14)))+')';g.fillRect(0,0,IW,IFLOOR);
  for(let i=0;i<8;i++){const x=40+i*76,h=40+((i*53)%60);g.fillStyle='rgba(255,60,90,'+taken*(.5+.5*Math.sin(lt*10+i))+')';g.fillRect(x,IFLOOR-h-90,18,6);}}
 ifloor(taken>.5?'#ff6b8a':'#6ecbbf');
 const px=520;ishadow(px,46);
 const frame=lt<1?0:lt<2.2?4:lt<5.6?5:0;ispr('phage',frame,px,IFLOOR,1.6,1);
 if(lt>1&&lt<2.4){g.save();g.globalCompositeOperation='lighter';const r=10+Math.sin(lt*30)*3+seg(lt,1,2.2)*14;const gr=g.createRadialGradient(px-40,IFLOOR-118,1,px-40,IFLOOR-118,r*2);gr.addColorStop(0,'#ffffffee');gr.addColorStop(.4,'#c4ff4fcc');gr.addColorStop(1,'#c4ff4f00');g.fillStyle=gr;g.beginPath();g.arc(px-40,IFLOOR-118,r*2,0,7);g.fill();g.restore();}
 // the dragon flies from 2.2 to 6.4 seconds
 if(lt>2.2&&lt<7.4)drawDragon(t,seg(lt,2.2,6.4));
 if(lt>6&&!introSfxDone.has('dive')){introSfxDone.add('dive');introShake=10;iburst(60,IFLOOR-60,'#c4ff4f',30,260);iburst(60,IFLOOR-60,'#ff4fd8',30,220);}
 // what the hijacked city now builds
 const army=[['miniphage',4,120,6.4],['miniphage',4,200,6.8],['radical',0,270,7.3],['miniphage',4,330,7.6],['mutant',0,160,8],['miniphage',4,400,8.3],['radical',0,80,8.7],['mutant',0,250,9]];
 for(const [id,f,x,at] of army){if(lt<at)continue;const pop=ease(seg(lt,at,at+.35));ispr(id,f+Math.floor(lt*6)%2,x,IFLOOR,.8*pop+.01,-1);if(lt-at<.05)iburst(x,IFLOOR-20,'#ff4fd8',8,120);}
}
/* ---------- the Cas9 sword ---------- */
function drawSword(x,y,angle,len,glow=1,W=1){const g=ictx;g.save();g.translate(x,y);g.rotate(angle);g.scale(1,W);
 g.fillStyle='#2b3550';g.fillRect(-10,-3,10,6);g.fillStyle='#ffd23f';g.fillRect(-2,-9,4,18);// hilt and guard
 g.globalCompositeOperation='lighter';const gr=g.createLinearGradient(0,0,len,0);gr.addColorStop(0,'#6bf4dcff');gr.addColorStop(1,'#6bf4dc55');
 g.shadowColor='#6bf4dc';g.shadowBlur=14*glow;g.fillStyle=gr;g.beginPath();g.moveTo(2,-5);g.lineTo(len,-1.5);g.lineTo(len+8,0);g.lineTo(len,1.5);g.lineTo(2,5);g.closePath();g.fill();
 g.shadowBlur=0;g.fillStyle='#ffffffcc';g.fillRect(4,-1,len-4,2);
 // the guide RNA wound along the blade
 g.strokeStyle='#b47cff';g.lineWidth=1.5;g.beginPath();for(let s=4;s<len;s+=2)g.lineTo(s,Math.sin(s*.35+introClock*12)*3.5);g.stroke();g.restore();}
/* ---------- scene 5: the valiant strike (44-58) ---------- */
function sceneValiant(t){const g=ictx,lt=t-44;ibg('environment',120,.45,'rgba(255,20,70,.12)');ifloor('#ff6b8a');
 const px=470,impact=lt>=5.45&&lt<5.85,close=lt>=5.85&&lt<8.6;
 // background crowd of hijack spawn
 for(let i=0;i<4;i++)ispr('miniphage',Math.floor(lt*5+i)%2,560+i*30,IFLOOR,.7,-1,{alpha:.7});
 if(impact){introImpact(lt-5.45);return;}
 if(close){introPinch(lt-5.85);return;}
 // CRISPR runs in, speaks, ignites the sword, leaps and strikes
 let cx,cy=IFLOOR,frame=0,face=1,sword=null;
 if(lt<1.2){cx=lerp(-50,210,seg(lt,0,1.2));frame=[1,2,3,2][Math.floor(lt*12)%4];}
 else if(lt<4.6){cx=210;frame=lt>3.5?4:0;if(lt>3.5){const grow=ease(seg(lt,3.5,4.2));sword={a:-1.1,len:4+grow*62};}}
 else if(lt<5.45){const u=seg(lt,4.6,5.3);cx=lerp(210,px-58,u);cy=IFLOOR-Math.sin(u*Math.PI)*120+(u>.9?0:0);frame=u<.75?11:6;sword={a:u<.75?-2.3:lerp(-2.3,.6,seg(u,.75,1)),len:66};}
 else if(lt<9.6){// thrown back after the pinch
  const u=seg(lt,8.6,9.6);cx=lerp(px-58,120,ease(u));cy=IFLOOR-Math.sin(u*Math.PI)*70;frame=15;}
 else{cx=120;frame=lt<10.4?11:15;}
 const hand=introHand('crispr',frame);
 if(lt>=8.6&&lt<9.6)ispr('crispr',15,cx,cy,1.6,1,{rot:-u2(lt)*6});
 else{ishadow(cx,30);ispr('crispr',frame,cx,cy,1.6,face);}
 if(sword)drawSword(cx+hand[0]*1.6,cy+hand[1]*1.6,sword.a,sword.len);
 if(lt>=8.6&&lt<8.75)for(let i=0;i<20;i++)ipart(px-60,IFLOOR-150,(Math.random()-.5)*400,(Math.random()-.5)*300,.6,'#6bf4dc',3,300);// the blade shatters
 if(lt>=9.6&&!introSfxDone.has('land')){introSfxDone.add('land');idust(120,14);introShake=6;}
 // the Phage: raises a hand at the last moment, then turns away
 ishadow(px,46);const pf=lt<5.1?0:lt<9?2:lt<10.5?0:1;ispr('phage',pf,lt>10.5?px+(lt-10.5)*60:px,IFLOOR,1.6,lt>10.5?-1:1);
 if(lt>10){g.fillStyle='rgba(0,0,0,'+seg(lt,10,14)*.5+')';g.fillRect(0,0,IW,IH);}
}
function u2(lt){return seg(lt,8.6,9.6);}
/* the anime impact frame: hard black/white flashes, speed lines, silhouettes, the blade meeting two fingers */
function introImpact(k){const g=ictx,phase=Math.floor(k/.1)%4,inv=phase%2===1,ink=inv?'#fff':'#000',paper=inv?'#000':'#fff';
 g.fillStyle=paper;g.fillRect(0,0,IW,IH);
 const fx=400,fy=130;g.save();g.translate(fx,fy);for(let i=0;i<72;i++){const a=i*Math.PI*2/72+((i*7)%5)*.02,r1=34+((i*31)%70),w=.01+((i*13)%5)*.006;g.fillStyle=i%9===0?'#ff1e3c':ink;g.beginPath();g.moveTo(Math.cos(a-w)*r1,Math.sin(a-w)*r1);g.lineTo(Math.cos(a)*900,Math.sin(a)*900);g.lineTo(Math.cos(a+w)*r1,Math.sin(a+w)*r1);g.fill();}g.restore();
 // the Phage, hand raised; CRISPR mid-swing, blade down onto that hand
 ispr('phage',2,476,IFLOOR+16,1.9,1,{tint:ink});ispr('crispr',6,250,IFLOOR-40,1.9,1,{tint:ink});
 const ph=introTop('phage',2),ch=introHand('crispr',6),cx=476+ph[0]*1.9,cy=IFLOOR+16+ph[1]*1.9,hx=250+ch[0]*1.9,hy=IFLOOR-40+ch[1]*1.9,ang=Math.atan2(cy-hy,cx-hx),len=Math.hypot(cx-hx,cy-hy);
 g.save();g.translate(hx,hy);g.rotate(ang);g.fillStyle=ink;g.beginPath();g.moveTo(-6,-9);g.lineTo(len,-6);g.lineTo(len+10,0);g.lineTo(len,6);g.lineTo(-6,9);g.fill();
 g.fillStyle=inv?'#ff1e3c':paper;g.beginPath();g.moveTo(4,-3);g.lineTo(len,-2);g.lineTo(len+4,0);g.lineTo(len,2);g.lineTo(4,3);g.fill();g.restore();
 // the contact point: a starburst
 g.save();g.translate(cx,cy);g.fillStyle=inv?'#ff1e3c':'#fff';g.strokeStyle=ink;g.lineWidth=3;g.beginPath();for(let i=0;i<16;i++){const r=i%2?10:26+((i*7)%3)*6,a=i*Math.PI/8+k*4;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();g.stroke();g.restore();}
/* close-up, after the Doomsday shot: two raised fingers stop the blade dead, lightning everywhere; then his visor */
function introPinch(k){const g=ictx;
 const shake=k<.35?(1-k/.35)*8:k<1.2?1.2:0,sx=(Math.random()-.5)*shake,sy=(Math.random()-.5)*shake;
 // cold blue night, soft out-of-focus lights
 const bg=g.createLinearGradient(0,0,IW,0);bg.addColorStop(0,'#0b2a44');bg.addColorStop(.45,'#123a5c');bg.addColorStop(1,'#050d1a');g.fillStyle=bg;g.fillRect(0,0,IW,IH);
 for(let i=0;i<14;i++){const x=(i*173)%IW,y=60+(i*67)%230,r=6+(i*7)%14;const bk=g.createRadialGradient(x,y,0,x,y,r);bk.addColorStop(0,'rgba(140,200,255,.18)');bk.addColorStop(1,'rgba(140,200,255,0)');g.fillStyle=bk;g.fillRect(x-r,y-r,2*r,2*r);}
 const push=1+Math.min(k,2.75)*.035;g.save();g.translate(sx,sy);g.translate(322,166);g.scale(push,push);g.translate(-322,-166);
 // the Phage in profile on the right, facing the blade, half in shadow
 const top=introTop('phage',0),S=7.2,hx=560,hy=150;g.save();try{g.filter='blur(1.2px) brightness(.7)';}catch(e){}
 ispr('phage',0,hx-top[0]*S,hy-(top[1]+8)*S,S,1);try{g.filter='none';}catch(e){}g.restore();
 const shade=g.createLinearGradient(470,0,IW,0);shade.addColorStop(0,'rgba(5,13,26,0)');shade.addColorStop(1,'rgba(5,13,26,.75)');g.fillStyle=shade;g.fillRect(470,0,IW-470,IH);
 // the blade, swung in from the left, stopped at the fingertips
 const cx=322,cy=166,A=-.06,L=380;drawSword(cx-Math.cos(A)*L,cy-Math.sin(A)*L,A,L-8,1.7,3);
 g.save();g.translate(327,166);g.scale(1.7,1.7);g.translate(-327,-166);
 // the hand, upright: forearm and cuff, palm side-on, two fingers straight up, the rest curled
 const out='#04070d',glove='#20232c',lit='#5f7c99',fin=(x1,y1,x2,y2,w,col)=>{g.lineCap='round';g.strokeStyle=out;g.lineWidth=w+5;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();};
 const poly=(pts,fill)=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=fill;g.strokeStyle=out;g.lineWidth=3;g.lineJoin='round';g.fill();g.stroke();};
 poly([[322,262],[378,258],[392,IH+10],[312,IH+10]],'#6e3e1d');g.fillStyle='#ffd23f';g.fillRect(328,280,5,IH-280);g.fillStyle='#93552a';g.fillRect(352,272,14,IH-272);// sleeve
 poly([[318,240],[380,236],[382,264],[320,268]],'#ffd23f');g.fillStyle='#c48f12';g.fillRect(322,256,58,8);// cuff
 fin(358,196,374,182,13,glove);fin(374,182,370,200,12,glove);fin(364,206,378,196,12,glove);fin(378,196,372,214,11,glove);// curled ring and little fingers
 poly([[324,190],[368,186],[378,212],[374,240],[322,242],[318,214]],glove);// palm, side-on
 g.fillStyle='#343846';g.beginPath();g.ellipse(352,214,16,20,0,0,7);g.fill();
 fin(344,192,346,130,12,'#2a2d38');// middle finger, just behind
 fin(334,194,334,138,13,glove);// index finger, in front
 fin(326,236,332,206,13,glove);fin(332,206,340,196,11,glove);// thumb folded across
 // cold light from the blade along the finger pads and knuckles
 g.strokeStyle='rgba(180,250,255,.95)';g.lineWidth=2.5;g.beginPath();g.moveTo(327,140);g.lineTo(327,192);g.moveTo(319,214);g.lineTo(321,238);g.stroke();
 g.strokeStyle=lit;g.lineWidth=2;g.beginPath();g.moveTo(340,140);g.lineTo(340,188);g.stroke();g.restore();
 // the contact: a bloom and forked lightning crawling out of it
 g.save();g.globalCompositeOperation='lighter';const bl=g.createRadialGradient(cx,cy,0,cx,cy,90+Math.sin(k*50)*8);bl.addColorStop(0,'rgba(255,255,255,.85)');bl.addColorStop(.14,'rgba(140,240,255,.55)');bl.addColorStop(1,'rgba(60,160,255,0)');g.fillStyle=bl;g.fillRect(cx-110,cy-110,220,220);
 const bolt=(x,y,a,len,w,depth)=>{g.lineWidth=w;g.beginPath();g.moveTo(x,y);let px=x,py=y;const n=6;for(let i=1;i<=n;i++){const t=i/n,jit=(Math.random()-.5)*len*.35;px=x+Math.cos(a)*len*t-Math.sin(a)*jit;py=y+Math.sin(a)*len*t+Math.cos(a)*jit;g.lineTo(px,py);if(depth&&Math.random()<.35)bolt(px,py,a+(Math.random()-.5)*1.6,len*.45,w*.6,depth-1);}g.stroke();};
 for(let i=0;i<7;i++){const a=Math.PI+(Math.random()-.5)*3.6;g.strokeStyle=i%3?'rgba(170,240,255,.9)':'#ffffff';g.shadowColor='#7fe8ff';g.shadowBlur=10;bolt(cx,cy,a,60+Math.random()*110,2.4,1);}
 g.shadowBlur=0;g.restore();
 g.restore();
 // wide letterbox, like the trailer's middle panel
 g.fillStyle='#000';g.fillRect(0,0,IW,52);g.fillRect(0,IH-52,IW,52);}
/* ---------- scene 6: the alarm (58-64) ---------- */
function sceneAlarm(t){const g=ictx,lt=t-58;ibg('archive',lt*6,.3);
 const sweep=lt*3;g.save();g.globalCompositeOperation='lighter';for(const s of [0,Math.PI]){const a=sweep+s,gr=g.createRadialGradient(320,40,0,320,40,500);gr.addColorStop(0,'rgba(255,40,70,.5)');gr.addColorStop(1,'rgba(255,40,70,0)');g.fillStyle=gr;g.beginPath();g.moveTo(320,40);g.arc(320,40,500,a-.3,a+.3);g.fill();}g.restore();
 g.fillStyle='rgba(255,30,60,'+(.08+.08*Math.sin(lt*12))+')';g.fillRect(0,0,IW,IH);ifloor('#be86ff');
 ishadow(320,34);ispr('nucleus',lt<1.2?0:lt<1.6?5:6,320,IFLOOR,2,1);
 const on=Math.floor(lt*4)%2;g.fillStyle='#14040ae6';g.fillRect(150,26,340,36);g.fillStyle=on?'#ff2d55':'#ffd23f';g.fillRect(150,26,340,3);g.fillRect(150,59,340,3);
 for(let x=150;x<490;x+=24){g.fillStyle=on?'#ff2d5533':'#ffd23f22';g.fillRect(x,30,12,28);}
 g.font='14px "Press Start 2P", monospace';g.textAlign='center';g.fillStyle=on?'#ff5d78':'#ffe1e6';g.fillText('CELL PROTOCOL',320,51);}
/* ---------- scene 7: roll call (64-72.4) ---------- */
function sceneRoll(t){const g=ictx,lt=t-64,i=Math.min(13,Math.floor(lt/.6)),k=(lt-i*.6)/.6,r=RANGERS[i];
 g.fillStyle='#050a1c';g.fillRect(0,0,IW,IH);
 // diagonal colour slash
 const slide=ease(clamp01(k*3)),band=()=>{g.beginPath();g.moveTo(0,70);g.lineTo(IW,30);g.lineTo(IW,250);g.lineTo(0,290);g.fill();};
 if(i>0&&slide<1){g.fillStyle=RANGERS[i-1].color;band();g.fillStyle='#ffffff22';for(let y=40;y<300;y+=6)g.fillRect(0,y,IW,2);}
 g.save();g.translate(lerp(-IW,0,slide),0);g.fillStyle=r.color;g.beginPath();g.moveTo(0,70);g.lineTo(IW,30);g.lineTo(IW,250);g.lineTo(0,290);g.fill();
 g.fillStyle='#ffffff22';for(let y=40;y<300;y+=6)g.fillRect(0,y,IW,2);g.restore();
 // previous Rangers as a strip of small faces
 for(let j=0;j<i;j++){const art=atlases[RANGERS[j].id]?.[0];if(art){g.save();g.globalAlpha=.8;g.drawImage(art,10+j*44,IH-58,48,42);g.restore();}}
 const drop=ease(clamp01(k*2.6)),y=lerp(-60,250,drop),frame=k<.35?11:(i%2?9:6);
 ispr(r.id,frame,200,y,2.2,1);
 g.save();g.globalAlpha=clamp01(k*5-.6);g.translate((1-ease(clamp01(k*4-.5)))*40,0);g.font='22px "Press Start 2P", monospace';g.textAlign='left';const name=r.name.toUpperCase();
 g.lineWidth=6;g.strokeStyle='#050a1c';g.strokeText(name,300,150);g.fillStyle='#fff';g.fillText(name,300,150);
 let rs=9;g.font=rs+'px "Press Start 2P", monospace';while(rs>6&&g.measureText(r.role.toUpperCase()).width>IW-320){rs--;g.font=rs+'px "Press Start 2P", monospace';}g.fillStyle='#050a1c';g.fillText(r.role.toUpperCase(),302,176);g.restore();
 if(k<.1){g.fillStyle='rgba(255,255,255,'+(1-k*10)*.6+')';g.fillRect(0,0,IW,IH);}}
/* ---------- scene 8: the stand (72.4-81) ---------- */
function sceneStand(t){const g=ictx,lt=t-72.4;ibg('environment',200+Math.max(0,lt-6.6)*120,.1,'rgba(255,190,90,.08)');
 // the Phage fades into the dark on the right
 if(lt>4.6){const a=1-seg(lt,6.6,8.6);g.save();g.globalAlpha=a*.85;g.shadowColor='#c23cff';g.shadowBlur=16;ispr('phage',0,560+seg(lt,4.6,8.6)*40,IFLOOR-20,1.8-seg(lt,6.6,8.6)*.6,1,{tint:'#2a0f3a'});g.restore();}
 ifloor('#9effc4',Math.max(0,lt-6.6)*240);
 const charge=lt>6.6;
 RANGERS.forEach((r,i)=>{const row=i%2,x=40+i*38+(charge?(lt-6.6)*260:0)+(row?14:0),y=IFLOOR-(row?14:0);if(x>IW+60)return;
  const f=charge?[1,2,3,2][Math.floor(lt*12+i)%4]:(r.id==='crispr'?(lt<1.4?11:0):0);ishadow(x,18,y);ispr(r.id,f,x,y,1.1,1);});
 if(lt<.2){g.fillStyle='rgba(255,255,255,'+(1-lt*5)+')';g.fillRect(0,0,IW,IH);}}
/* ---------- scene 9: title (81-86) ---------- */
function sceneTitle(t){const g=ictx,lt=t-81;ibg('environment',lt*14,.6);
 const s=lt<.35?lerp(2.6,1,ease(lt/.35)):1;g.save();g.translate(IW/2,110);g.scale(s,s);g.translate(-IW/2,-110);g.drawImage(logoLayer(t),0,10);g.restore();
 if(lt<.35&&!introSfxDone.has('titleshake')){}
 if(lt>=.35&&!introSfxDone.has('titleshake')){introSfxDone.add('titleshake');introShake=12;introFlash=.5;introFlashColor='#fff';}
 if(lt>1.2&&Math.floor(lt*2.5)%2){g.font='14px "Press Start 2P", monospace';g.textAlign='center';g.fillStyle='#ffd35e';g.fillText('CHOOSE YOUR RANGER',IW/2,280);}}

const ISCENES=[[0,15,sceneColony],[15,23,sceneCity],[23,32,sceneBreach],[32,44,sceneHijack],[44,58,sceneValiant],[58,64,sceneAlarm],[64,72.4,sceneRoll],[72.4,81,sceneStand],[81,INTRO_LEN,sceneTitle]];
/* where each Ranger's fist is in a frame, found once from the sprite itself */
const introHands={};
function introHand(id,frame){const k=id+frame;if(introHands[k])return introHands[k];if(typeof SPRITE_META!=='undefined'&&SPRITE_META.hand[k])return introHands[k]=SPRITE_META.hand[k];const art=atlases[id]?.[frame];if(!art)return [10,-50];
 const d=art.getContext?.('2d')?.getImageData?.(0,0,128,112)?.data;if(!d||!d.length)return introHands[k]=[10,-50];let best=[10,-50],bx=-1;for(let y=30;y<75;y++)for(let x=127;x>=0;x--){if(d[(y*128+x)*4+3]>60){if(x>bx){bx=x;best=[x-64,y-102];}break;}}return introHands[k]=best;}

function introTop(id,frame){const k='top'+id+frame;if(introHands[k])return introHands[k];if(typeof SPRITE_META!=='undefined'&&SPRITE_META.top[id+frame])return introHands[k]=SPRITE_META.top[id+frame];const art=atlases[id]?.[frame];
 const d=art?.getContext?.('2d')?.getImageData?.(0,0,128,112)?.data;if(!d||!d.length)return introHands[k]=[-10,-98];
 for(let y=0;y<112;y++)for(let x=0;x<128;x++)if(d[(y*128+x)*4+3]>60)return introHands[k]=[x-64,y-102+4];return introHands[k]=[-10,-98];}
function drawIntro(dt){if(!ictx)return;introClock+=dt;const t=introClock;introCues(t);
 if(t>=INTRO_LEN){endIntro();return;}
 const g=ictx;g.save();if(introShake>0){g.translate((Math.random()-.5)*introShake,(Math.random()-.5)*introShake);introShake=Math.max(0,introShake-dt*30);}
 const sc=ISCENES.find(s=>t>=s[0]&&t<s[1]);sc?.[2](t);
 // particles
 introParts=introParts.filter(p=>(p.life-=dt)>0);for(const p of introParts){p.vy+=p.grav*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;g.globalAlpha=clamp01(p.life/p.max);g.fillStyle=p.color;g.fillRect(p.x,p.y,p.size,p.size);}g.globalAlpha=1;
 g.restore();
 // fade between scenes
 for(const [a,b] of ISCENES){const near=Math.min(Math.abs(t-a),Math.abs(t-b));if(near<.25&&a!==44){g.fillStyle='rgba(0,0,0,'+(1-near/.25)+')';g.fillRect(0,0,IW,IH);}}
 if(introFlash>0){g.globalAlpha=Math.min(1,introFlash*2);g.fillStyle=introFlashColor;g.fillRect(0,0,IW,IH);g.globalAlpha=1;introFlash-=dt;}
 // cinematic bars and captions
 g.fillStyle='#000';g.fillRect(0,0,IW,14);g.fillRect(0,IH-8,IW,8);introCaption(t);
 g.fillStyle='#0000001c';for(let y=0;y<IH;y+=3)g.fillRect(0,y,IW,1);}

function startIntro(){$('title').hidden=true;$('missionSelect').hidden=true;$('intro').hidden=false;$('introGate').hidden=true;$('skipIntro').hidden=false;
 introClock=0;introShake=0;introFlash=0;introParts=[];introSfxDone=new Set();mode='intro';try{localStorage.setItem('cell-rescue-intro-seen','1');}catch(e){}$('skipIntro').focus?.();}
function endIntro(){introDroneStop();$('intro').hidden=true;mode='title';showTitle();}
function showIntroGate(){$('title').hidden=true;$('missionSelect').hidden=true;$('intro').hidden=false;$('introGate').hidden=false;$('skipIntro').hidden=true;mode='introGate';
 // a still from the intro behind the buttons
 if(ictx){introClock=26;sceneBreach(26.6);ictx.fillStyle='#000a';ictx.fillRect(0,0,IW,IH);}}
function introSeen(){try{return localStorage.getItem('cell-rescue-intro-seen')==='1';}catch(e){return true;}}
