const { chromium } = require('playwright');
const path = require('path'), os = require('os');
const OUT = os.tmpdir() + '/';
(async () => {
  const b = await chromium.launch(); const errs=[];
  // sayings uit de pagina halen via andere datums
  const texts=[];
  for (const iso of ['2026-11-09T10:00:00','2026-11-09T23:59:00','2026-11-10T00:01:00','2026-11-11T09:00:00']) {
    const c = await b.newContext({viewport:{width:1100,height:760}}); const p = await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
    await p.clock.install({time:new Date(iso)}); await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
    texts.push([iso, await p.textContent('#bubble')]);
    if (iso.endsWith('09:00:00')) await p.screenshot({path:OUT+'d.png'});
    await c.close();
  }
  console.log(texts.map(t=>t.join('  ->  ')).join('\n'));
  // controle: alle regels uniek, niet te lang, en middernacht-wissel terwijl pagina open staat
  const c = await b.newContext(); const p = await c.newPage(); await p.clock.install({time:new Date('2026-11-09T23:59:50')}); await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  const before=await p.textContent('#bubble'); await p.clock.runFor(20000); const after=await p.textContent('#bubble');
  console.log('middernacht wissel:', before!==after);
  const all=await p.evaluate(()=>{const m=document.documentElement.innerHTML.match(/const SAYINGS = \[([\s\S]*?)\];/)[1];return [...m.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(x=>x[1])});
  console.log('aantal',all.length,'uniek',new Set(all).size,'langste',Math.max(...all.map(x=>x.length)));
  console.log(errs); await b.close();
})();
