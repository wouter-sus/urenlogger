const { chromium } = require('playwright');
const path = require('path'), os = require('os');
const OUT = os.tmpdir() + '/';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1100,height:1000}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const dlg=[]; p.on('dialog',d=>{dlg.push(d.message());d.dismiss()});
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  console.log('uit-blok zichtbaar bij uitgecheckt:', await p.isVisible('#retroOut'));
  await p.click('[data-ago="120"]'); await p.waitForTimeout(300);   // gestart 2u geleden
  console.log('uit-blok zichtbaar bij ingecheckt:', await p.isVisible('#retroOut'));
  await p.click('[data-outago="120"]'); console.log('te vroeg ->',dlg.pop(),'| nog actief:',await p.isVisible('#btnOut'));
  const f=new Date(Date.now()+3600000); await p.fill('#retroOutTime',`${String(f.getHours()).padStart(2,'0')}:${String(f.getMinutes()).padStart(2,'0')}`); await p.click('#btnRetroOut'); console.log('toekomst ->',dlg.pop());
  await p.screenshot({path:OUT+'o.png'});
  await p.click('[data-outago="30"]'); await p.waitForTimeout(300);   // uit 30 min geleden => 1,5 u
  console.log('na uitchecken: status',await p.textContent('#statusTxt'),'| uren',await p.textContent('#mHours'),'| bedrag',await p.textContent('#mEarn'));
  console.log('regel:',(await p.locator('#listHours tbody tr').first().innerText()).replace(/\s+/g,' '));
  // eigen tijd: start 3u geleden, uit om 1u geleden
  await p.click('[data-ago="120"]');
  const t=new Date(Date.now()-3600000); await p.fill('#retroOutTime',`${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`); await p.click('#btnRetroOut');
  console.log('na 2e sessie: uren',await p.textContent('#mHours'),'rijen',await p.locator('#listHours tbody tr').count());
  console.log(errs); await b.close();
})();
