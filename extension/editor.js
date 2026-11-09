import {db} from './db.js';import {imagePdf} from './pdf.js';
const $=s=>document.querySelector(s),canvas=$('#canvas'),ctx=canvas.getContext('2d');let item,tool='arrow',drag=null,undo=[],urls=[];
const message=t=>$('#message').textContent=t;
const blob=(type='image/png')=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not encode image')),type,.92));
function dimensions(){$('#dimensions').textContent=`${canvas.width} × ${canvas.height}`;$('#undo').disabled=!undo.length;}
function snapshot(){const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;c.getContext('2d').drawImage(canvas,0,0);return c;}
function restore(c){canvas.width=c.width;canvas.height=c.height;ctx.drawImage(c,0,0);dimensions();}
function remember(c){undo.push(c);while(undo.length>5||undo.reduce((n,c)=>n+c.width*c.height,0)>100000000)undo.shift();dimensions();}
const point=e=>{const r=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(canvas.width,(e.clientX-r.left)*canvas.width/r.width)),y:Math.max(0,Math.min(canvas.height,(e.clientY-r.top)*canvas.height/r.height))};};
function paint(a,b){
 ctx.strokeStyle=$('#color').value;ctx.fillStyle=$('#color').value;ctx.lineWidth=Math.max(1,Math.min(40,Number($('#size').value)||4));ctx.lineCap='round';
 const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(b.x-a.x),h=Math.abs(b.y-a.y);
 if(tool==='rectangle'||tool==='crop'||tool==='blur'){ctx.strokeRect(x,y,w,h);}
 if(tool==='arrow'){const angle=Math.atan2(b.y-a.y,b.x-a.x),size=Math.max(15,ctx.lineWidth*4);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.moveTo(b.x-size*Math.cos(angle-.5),b.y-size*Math.sin(angle-.5));ctx.lineTo(b.x,b.y);ctx.lineTo(b.x-size*Math.cos(angle+.5),b.y-size*Math.sin(angle+.5));ctx.stroke();}
}
canvas.onpointerdown=e=>{if(e.button!==0||!item)return;e.preventDefault();const p=point(e);const before=snapshot();
 if(tool==='text'){const text=$('#text').value.trim();if(!text){message('Enter annotation text first.');return;}ctx.fillStyle=$('#color').value;ctx.font=`${Math.max(18,(Number($('#size').value)||4)*6)}px sans-serif`;ctx.fillText(text,p.x,p.y);remember(before);return;}
 drag={start:p,before,id:e.pointerId};canvas.setPointerCapture(e.pointerId);
};
canvas.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;restore(drag.before);paint(drag.start,point(e));};
canvas.onpointerup=e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;const b=point(e),a=d.start;restore(d.before);
 const x=Math.floor(Math.min(a.x,b.x)),y=Math.floor(Math.min(a.y,b.y)),w=Math.floor(Math.abs(a.x-b.x)),h=Math.floor(Math.abs(a.y-b.y));
 if(w<2&&h<2)return;
 if(tool==='crop'){if(w<2||h<2)return;canvas.width=w;canvas.height=h;ctx.drawImage(d.before,x,y,w,h,0,0,w,h);}
 else if(tool==='blur'){if(w<2||h<2)return;ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.filter=`blur(${Math.max(8,(Number($('#size').value)||4)*3)}px)`;ctx.drawImage(d.before,0,0);ctx.restore();message('Blur applied. For highly sensitive information, use a fully opaque cover instead.');}
 else paint(a,b);
 remember(d.before);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
};
canvas.onpointercancel=()=>{if(drag){restore(drag.before);drag=null;}};
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;document.querySelectorAll('[data-tool]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
$('#undo').onclick=()=>{if(undo.length)restore(undo.pop());};
async function loadImage(b){const img=await createImageBitmap(b);canvas.width=img.width;canvas.height=img.height;ctx.drawImage(img,0,0);img.close();dimensions();}
$('#reset').onclick=async()=>{if(!item)return;remember(snapshot());await loadImage(item.blob);message('Restored the original capture.');};
$('#save').onclick=async()=>{try{item.edited=await blob();await db('put',item);message('Edits saved locally.');}catch(e){message(e.message);}};
$('#download').onclick=async()=>{if(!item)return;try{const format=$('#format').value;let output=await blob(format==='png'?'image/png':'image/jpeg');if(format==='pdf')output=imagePdf(new Uint8Array(await output.arrayBuffer()),canvas.width,canvas.height);const url=URL.createObjectURL(output),a=document.createElement('a');a.href=url;a.download=`ScrollShot-${item.title.replace(/[^a-z0-9 -]/gi,'').slice(0,70)||'page'}.${format==='jpeg'?'jpg':format}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);message('Export sent to downloads.');}catch(e){message(e.message);}};
$('#copy').onclick=async()=>{if(!item)return;try{await navigator.clipboard.write([new ClipboardItem({'image/png':blob()})]);message('Image copied. Paste it into your app.');}catch(e){message('Copy failed. Download the PNG instead.');}};
async function openCapture(id){try{item=await db('get',id);if(!item)throw Error('Capture no longer exists.');$('#editing').hidden=false;$('#history').hidden=true;$('#title').textContent=item.title;$('#download').disabled=false;$('#copy').disabled=false;undo=[];await loadImage(item.edited||item.blob);history.replaceState({},'',`?id=${id}`);}catch(e){await recent();alert(e.message);}}
async function recent(){item=null;urls.forEach(URL.revokeObjectURL);urls=[];$('#editing').hidden=true;$('#history').hidden=false;$('#history').replaceChildren();$('#title').textContent='Recent captures';$('#download').disabled=true;$('#copy').disabled=true;history.replaceState({},'','editor.html');
 const captures=(await db('list')).sort((a,b)=>b.created-a.created);if(!captures.length)$('#history').textContent='No captures yet. Click ScrollShot on a website to begin.';
 for(const c of captures){const card=document.createElement('article');card.className='card';const img=document.createElement('img');const url=URL.createObjectURL(c.edited||c.blob);urls.push(url);img.src=url;img.alt='Screenshot thumbnail';const title=document.createElement('h2');title.textContent=c.title;const date=document.createElement('p');date.textContent=new Date(c.created).toLocaleString();const open=document.createElement('button');open.textContent='Open';open.onclick=()=>openCapture(c.id);const del=document.createElement('button');del.textContent='Delete';del.onclick=async()=>{await db('delete',c.id);await recent();};card.append(img,title,date,open,del);$('#history').append(card);}
}
$('#recent').onclick=recent;document.querySelector('[data-tool=arrow]').click();
const id=new URLSearchParams(location.search).get('id');(id?openCapture(id):recent()).catch(e=>{$('#history').textContent=e.message;});
