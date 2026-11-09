(()=>{
 if(document.querySelector('#scrollshot-selection'))return;
 const overlay=document.createElement('div');overlay.id='scrollshot-selection';overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#0006;cursor:crosshair;touch-action:none';
 const box=document.createElement('div');box.style.cssText='position:absolute;border:2px solid #a6edcf;background:#a6edcf22;pointer-events:none';
 const help=document.createElement('div');help.textContent='Drag to select an area · Escape to cancel';help.style.cssText='position:absolute;top:16px;left:50%;transform:translateX(-50%);background:#151c24;color:white;padding:12px 20px;border-radius:8px;font:14px system-ui;pointer-events:none';overlay.append(box,help);document.documentElement.append(overlay);
 let start=null;
 const clean=()=>{overlay.remove();document.removeEventListener('keydown',key,true);};
 const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();clean();}};document.addEventListener('keydown',key,true);
 overlay.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();start={x:e.clientX,y:e.clientY};overlay.setPointerCapture(e.pointerId);};
 const rectangle=e=>({x:Math.max(0,Math.min(start.x,e.clientX)),y:Math.max(0,Math.min(start.y,e.clientY)),width:Math.min(innerWidth,Math.max(start.x,e.clientX))-Math.max(0,Math.min(start.x,e.clientX)),height:Math.min(innerHeight,Math.max(start.y,e.clientY))-Math.max(0,Math.min(start.y,e.clientY))});
 overlay.onpointermove=e=>{if(!start)return;const r=rectangle(e);Object.assign(box.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});};
 overlay.onpointerup=e=>{if(!start)return;const rect=rectangle(e);clean();if(rect.width>=8&&rect.height>=8)setTimeout(()=>chrome.runtime.sendMessage({type:'selection',rect}),150);};
 overlay.onpointercancel=clean;
})();
