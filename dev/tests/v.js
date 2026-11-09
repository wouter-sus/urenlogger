const { chromium } = require('playwright');
const path = require('path'), os = require('os');
const OUT = os.tmpdir() + '/';
const hm=ms=>{const d=new Date(ms);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1100,height:760}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const dlg=[]; p.on('dialog',d=>{dlg.push(d.message());d.dismiss()});
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  console.log('uit-veld uitgeschakeld bij uitgecheckt:', await p.isDisabled('#tOut'));
  await p.screenshot({path:OUT+'v1.png'});
  // inchecken met begintijd 2u geleden
  await p.fill('#tIn',hm(Date.now()-7200000)); await p.click('#btnIn'); await p.waitForTimeout(400);
  console.log('begin 2u terug:',await p.textContent('#liveClock'),await p.textContent('#liveEarn'),'| veld toont',await p.inputValue('#tIn'));
  // begintijd aanpassen naar 3u terug
  await p.fill('#tIn',hm(Date.now()-10800000)); await p.dispatchEvent('#tIn','change'); await p.waitForTimeout(400);
  console.log('begin 3u terug:',await p.textContent('#liveClock'));
  // toekomst eindtijd
  await p.fill('#tOut',hm(Date.now()+3600000)); await p.click('#btnOut'); console.log('toekomst ->',dlg.pop());
  // voor begintijd
  await p.fill('#tOut',hm(Date.now()-14400000)); await p.click('#btnOut'); console.log('voor begin ->',dlg.pop());
  // uitchecken om 1u terug => 2u = 130
  await p.fill('#tOut',hm(Date.now()-3600000)); await p.click('#btnOut'); await p.waitForTimeout(300);
  console.log('klaar:',await p.textContent('#statusTxt'),await p.textContent('#mHours'),await p.textContent('#mEarn'),'| velden leeg:',await p.inputValue('#tIn')==='' ,await p.inputValue('#tOut')==='');
  // gewoon inchecken/uitchecken zonder tijden
  await p.click('#btnIn'); await p.click('#btnOut'); console.log('zonder tijden: rijen',await p.locator('#listHours tbody tr').count(),'(kortere dan 1s wordt weggegooid)');
  console.log(errs); await b.close();
})();
