let job=null;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const run=async(tabId,func,args=[])=>{const results=await chrome.scripting.executeScript({target:{tabId},func,args});if(results[0]?.error)throw Error(results[0].error.message);return results[0]?.result;};
async function status(data){await chrome.storage.session.set({captureStatus:data});}
async function render(type,args={}){const result=await chrome.runtime.sendMessage({target:'offscreen',type,...args});if(!result?.ok)throw Error(result?.error||'Image processing failed');return result;}
async function ensureRenderer(){if(!await chrome.offscreen.hasDocument())await chrome.offscreen.createDocument({url:'offscreen.html',reasons:['BLOBS'],justification:'Combine captured pixels and save the resulting screenshot locally.'});}
async function check(){if(job.cancel)throw Error('Capture cancelled.');const active=(await chrome.tabs.query({active:true,windowId:job.windowId}))[0];if(active?.id!==job.tabId)throw Error('Capture stopped because you switched tabs. Keep the website selected until capture completes.');}
async function capture(tab,mode,selection){
 if(job)throw Error('A capture is already running.');
 if(!['full','visible','selection'].includes(mode))throw Error('Unknown capture mode.');
 if(selection && !['x','y','width','height'].every(k=>Number.isFinite(selection[k]) && selection[k]>=0))throw Error('Invalid capture area.');
 if(!/^https?:\/\//.test(tab.url||''))throw Error('Open an HTTP or HTTPS website first.');
 job={tabId:tab.id,windowId:tab.windowId,cancel:false};let prepared=false;
 try{
  await status({running:true,progress:0,message:'Preparing capture…'});await ensureRenderer();await render('clear');
  const info=await run(tab.id,()=>{
   if(window.__scrollshotV2)throw Error('A previous capture is still restoring.');
   const style=document.createElement('style');style.textContent='html{scroll-behavior:auto!important}*{scroll-snap-type:none!important;animation-play-state:paused!important;caret-color:transparent!important}';document.documentElement.append(style);
   const fixed=[...document.querySelectorAll('body *')].filter(el=>['fixed','sticky'].includes(getComputedStyle(el).position)).map(el=>({el,value:el.style.getPropertyValue('visibility'),priority:el.style.getPropertyPriority('visibility')}));
   const state={x:scrollX,y:scrollY,style,fixed};
   state.restore=()=>{style.remove();fixed.forEach(({el,value,priority})=>value?el.style.setProperty('visibility',value,priority):el.style.removeProperty('visibility'));scrollTo(state.x,state.y);delete window.__scrollshotV2;};
   state.timer=setTimeout(state.restore,180000);window.__scrollshotV2=state;
   return {width:innerWidth,height:innerHeight,total:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),title:document.title};
  });prepared=true;
  if(selection && (selection.width<8||selection.height<8||selection.x+selection.width>info.width||selection.y+selection.height>info.height))throw Error('Selection is outside the visible page.');
  if(mode==='full'){
   if(info.total>30000)throw Error('Page exceeds the 30,000-pixel limit. Use selected-area capture.');
   const started=Date.now();
   for(let y=0;y<info.total;y+=info.height){
    await check();if(Date.now()-started>45000)throw Error('Page is taking too long to load. Try visible-area capture.');
    await run(tab.id,y=>{scrollTo(0,y);},[y]);await pause(180);
    await status({running:true,progress:Math.round(y/info.total*20),message:'Loading images along the page…'});
   }
   await run(tab.id,async()=>{await Promise.race([Promise.all([...document.images].filter(i=>!i.complete).map(i=>new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true});}))),new Promise(r=>setTimeout(r,2000))]);});
   const total=await run(tab.id,()=>Math.max(document.documentElement.scrollHeight,document.body.scrollHeight));
   if(total>info.total+info.height*2||total>30000)throw Error('This page keeps growing. Use visible-area or selected-area capture.');
   info.total=total;
  }
  let covered=0;const height=mode==='full'?info.total:selection?.height||info.height,width=selection?.width||info.width;
  while(covered<height){
   await check();
   const position=await run(tab.id,(mode,y,first)=>{
    const s=window.__scrollshotV2;if(!s)throw Error('Capture expired.');
    if(mode==='full'){if(!first)s.fixed.forEach(({el})=>el.style.setProperty('visibility','hidden','important'));scrollTo(0,y);}
    return {y:scrollY,width:innerWidth,height:innerHeight};
   },[mode,Math.min(covered,Math.max(0,info.total-info.height)),covered===0]);
   if(position.width!==info.width||position.height!==info.height)throw Error('Window resized during capture. Please try again.');
   await pause(650);await check();
   const data=await chrome.tabs.captureVisibleTab(tab.windowId,{format:'png'});await check();
   const end=mode==='full'?Math.min(info.total,position.y+info.height):height;
   if(end<=covered)throw Error('The main document cannot scroll further. Nested scrolling panels are not supported.');
   await render('tile',{data,viewportWidth:info.width,width,height,x:selection?.x||0,y:mode==='full'?covered-position.y:selection?.y||0,copyWidth:width,copyHeight:end-covered,destY:covered});covered=end;
   await status({running:true,progress:Math.round(20+covered/height*80),message:'Capturing page…'});
  }
  await check();const {id}=await render('finish',{title:info.title});
  await run(tab.id,()=>{const s=window.__scrollshotV2;if(s){clearTimeout(s.timer);s.restore();}});prepared=false;
  await status({running:false,progress:100,message:'Capture ready',id});
  await chrome.windows.create({url:chrome.runtime.getURL(`editor.html?id=${id}`),type:'popup',width:1100,height:820});
 }catch(e){await status({running:false,message:e.message,error:true});}
 finally{
  if(prepared)await run(tab.id,()=>{const s=window.__scrollshotV2;if(s){clearTimeout(s.timer);s.restore();}}).catch(()=>{});
  await render('clear').catch(()=>{});job=null;
 }
}
async function selectArea(tab){
 if(job)throw Error('A capture is already running.');
 await chrome.scripting.executeScript({target:{tabId:tab.id},files:['select.js']});
}
chrome.runtime.onMessage.addListener((m,s,reply)=>{
 if(m.target==='offscreen')return;
 if(m.type==='selection'){
  if(!s.tab)return;capture(s.tab,'selection',m.rect).catch(e=>status({running:false,error:true,message:e.message}));return;
 }
 if(s.url?.startsWith(chrome.runtime.getURL('popup.html'))){
  if(m.type==='cancel'){if(job)job.cancel=true;reply({ok:true});return;}
  if(m.type==='start'){
   (async()=>{const tab=await chrome.tabs.get(m.tabId);if(job)throw Error('Capture already running');if(m.mode==='selection')await selectArea(tab);else capture(tab,m.mode).catch(e=>status({running:false,error:true,message:e.message}));return {ok:true};})().then(reply).catch(e=>reply({ok:false,error:e.message}));return true;
  }
 }
});
chrome.commands.onCommand.addListener(async command=>{if(command==='capture-full'){const [tab]=await chrome.tabs.query({active:true,currentWindow:true});capture(tab,'full').catch(e=>status({running:false,error:true,message:e.message}));}});
