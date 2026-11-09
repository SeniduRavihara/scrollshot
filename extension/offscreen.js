import {storeCapture} from './db.js';
let canvas,ctx,scale=1;
chrome.runtime.onMessage.addListener((m,s,reply)=>{
 if(m.target!=='offscreen')return;
 (async()=>{
  if(m.type==='clear'){canvas=null;ctx=null;return {};}
  if(m.type==='tile'){
   const bitmap=await createImageBitmap(await (await fetch(m.data)).blob());
   try{
    if(!canvas){scale=bitmap.width/m.viewportWidth;const w=Math.round(m.width*scale),h=Math.round(m.height*scale);if(w*h>80000000||h>32760||w>32760)throw Error('Capture is too large. Reduce browser zoom or capture a smaller area.');canvas=new OffscreenCanvas(w,h);ctx=canvas.getContext('2d');}
    const x=Math.round(m.x*scale),y=Math.round(m.y*scale),w=Math.round(m.copyWidth*scale),h=Math.round(m.copyHeight*scale);
    ctx.drawImage(bitmap,x,y,w,h,0,Math.round(m.destY*scale),w,h);
   }finally{bitmap.close();}
   return {};
  }
  if(m.type==='finish'){if(!canvas)throw Error('No screenshot pixels captured.');const id=await storeCapture(await canvas.convertToBlob({type:'image/png'}),m.title,canvas.width,canvas.height);canvas=null;ctx=null;return {id};}
 })().then(result=>reply({ok:true,...result})).catch(e=>reply({ok:false,error:e.message}));return true;
});
