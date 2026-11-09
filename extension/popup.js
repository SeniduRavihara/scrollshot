const status=document.querySelector('#status'),cancel=document.querySelector('#cancel'),progress=document.querySelector('#progress');
function update(s){if(!s)return;status.textContent=s.message;cancel.hidden=!s.running;progress.hidden=!s.running;progress.value=s.progress||0;document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=!!s.running);}
function needsReload(){
 status.textContent='ScrollShot was updated. Reload it in chrome://extensions, accept any permission prompt, then reopen this popup.';
 document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=true);
 cancel.hidden=true;progress.hidden=true;
}
if(chrome.storage?.session && chrome.storage?.onChanged){
 chrome.storage.session.get('captureStatus').then(v=>update(v.captureStatus)).catch(needsReload);
 chrome.storage.onChanged.addListener((c,area)=>{if(area==='session'&&c.captureStatus)update(c.captureStatus.newValue);});
}else{needsReload();}

document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=async()=>{try{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});const r=await chrome.runtime.sendMessage({type:'start',mode:b.dataset.mode,tabId:tab.id});if(!r.ok)throw Error(r.error);if(b.dataset.mode==='selection')window.close();}catch(e){status.textContent=e.message;}});
cancel.onclick=async()=>{try{await chrome.runtime.sendMessage({type:'cancel'});}catch{needsReload();}};
document.querySelector('#recent').onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('editor.html')});
