class Raster {
 constructor(){this.width=0;this.height=0;this.data=null;}
 getContext(){const c=this;return {
 drawImage(image,sx,sy,sw,sh){c.data=new Uint8ClampedArray(c.width*c.height*4);for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const source=((sy+y)*image.width+sx+x)*4;c.data.set(image.data.subarray(source,source+4),(y*c.width+x)*4);}},
 getImageData(){return {data:c.data.slice()}},putImageData(d){c.data=d.data}
 };}
}
const sandbox={document:{createElement:()=>new Raster()},console};
const start=engineText.indexOf('function cleanCell('),end=engineText.indexOf('async function loadAtlas(',start);
const clean=vm.runInNewContext("const makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});"+engineText.slice(start,end)+';cleanCell',sandbox);
const report=[];
for(const [name,image]of Object.entries(pixelInputs)){
 const rows=name==='phage-sheet'?2:name==='bacteria-sheet'?3:4,sw=image.width/4,sh=image.height/rows;
 for(let i=0;i<rows*4;i++){
  const result=clean(image,(i%4)*sw,Math.floor(i/4)*sh,sw,sh);
  const [left,top,right,bottom]=result.bounds;
  const width=right-left+1,height=bottom-top+1;
  const opaque=result.canvas.data.filter((v,j)=>j%4===3&&v>149).length;
  if(width<sw*.25||height<sh*.3||opaque<sw*sh*.08)throw Error(name+' frame '+i+' lost its silhouette');
  if(width>=sw-3||height>=sh-3)report.push({name,frame:i,warning:'Figure touches cell boundary',width,height});
 }
}
console.log(JSON.stringify({sheets:Object.keys(pixelInputs).length,frames:244,warnings:report}));
