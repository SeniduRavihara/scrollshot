const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('work/scrollshot-fixes/extension/popup.js','utf8');
const nodes=Object.fromEntries(['#status','#cancel','#progress','#recent'].map(k=>[k,{}]));const buttons=[{},{},{}];
vm.runInNewContext(source,{document:{querySelector:s=>nodes[s],querySelectorAll:()=>buttons},chrome:{runtime:{}},window:{}});
assert.match(nodes['#status'].textContent,/Reload/);assert.ok(buttons.every(b=>b.disabled));assert.equal(typeof buttons[0].onclick,'function');
console.log('PASS: unavailable storage produces recovery instructions without crashing startup');
