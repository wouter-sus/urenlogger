const { chromium } = require('playwright');
const path = require('path'), os = require('os');
const OUT = os.tmpdir() + '/';
const URL='file://' + path.resolve(__dirname, '../../index.html');
const painted = p => p.evaluate(()=>{const c=document.getElementById('confetti'),x=c.getContext('2d');const d=x.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4*50)if(d[i]>0)n++;return n});
(async () => {
  const b = await chromium.launch(); const errs=[];
  const mk = async (state, w=1100,h=800) => { const c = await b.newContext({viewport:{width:w,height:h}}); await c.addInitScript(s=>{ if(!localStorage.getItem('urenlogger.v1') && s) localStorage.setItem('urenlogger.v1', JSON.stringify(s)); }, state); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message)); return [c,p]; };
  const now=Date.now(), d=new Date(), key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const base={rate:65,btw:21,entries:[],costs:[],active:null};

  // 1. Eerste keer met bestaand werk, geen celebrated -> GEEN feest
  let [c,p]=await mk({...base, entries:[{id:'a',start:now-36e5*100,end:now-36e5*100+36e5*10,note:''}]});
  // (start valt in andere maand mogelijk; gebruik gewoon vandaag)
  await c.close();
  [c,p]=await mk({...base, entries:[{id:'a',start:now-36e5*3,end:now-36e5*1,note:''}]}); // 2u = 130
  await p.goto(URL); await p.waitForTimeout(1200);
  console.log('1 oud werk, geen feest:', !(await p.locator('#banner.show').count()), '| celebrated:', await p.evaluate(()=>JSON.parse(localStorage.getItem('urenlogger.v1')).celebrated));
  await c.close();

  // 2. Live kruispunt: 49,85 euro + lopende timer -> bij 50 feest
  [c,p]=await mk({...base, celebrated:{[key]:0}, entries:[{id:'a',start:now-36e5*2,end:now-36e5*2+2760e3,note:''}], active:{start:now-500,note:''}});
  await p.goto(URL); await p.waitForTimeout(300);
  console.log('2a voor kruispunt geen banner:', !(await p.locator('#banner.show').count()));
  await p.waitForSelector('#banner.show',{timeout:8000});
  await p.waitForTimeout(500);
  console.log('2b banner:', (await p.textContent('#banner')).replace(/\s+/g,' '));
  console.log('2c ballon:', await p.textContent('#bubble'), '| confetti pixels:', await painted(p));
  await p.screenshot({path:OUT+'f2.png'});
  const lvl=await p.evaluate(()=>JSON.parse(localStorage.getItem('urenlogger.v1')).celebrated);
  console.log('2d opgeslagen niveau:', lvl);
  // 3. herladen -> geen tweede feest
  await p.reload(); await p.waitForTimeout(1500);
  console.log('3 na reload geen banner:', !(await p.locator('#banner.show').count()));
  await c.close();

  // 4. Meerdere niveaus tegelijk (handmatig 5 uur toevoegen) -> één feest met hoogste niveau
  [c,p]=await mk({...base, celebrated:{[key]:0}}); await p.goto(URL); await p.waitForTimeout(400);
  await p.fill('#hFrom','06:00'); await p.fill('#hTo','11:00'); await p.click('#formHours button'); // vandaag 5u = 325
  await p.waitForSelector('#banner.show',{timeout:5000});
  console.log('4 handmatig 5u:', (await p.textContent('#banner .amt')).trim(), '(verwacht 300)');
  // 5. verwijderen -> stil, geen feest
  await p.waitForTimeout(6000);
  p.on('dialog',d=>d.accept()); await p.click('.x'); await p.waitForTimeout(800);
  console.log('5 na verwijderen niveau:', await p.evaluate(()=>JSON.parse(localStorage.getItem('urenlogger.v1')).celebrated), 'geen banner:', !(await p.locator('#banner.show').count()));
  // 6. preview-knoppen + screenshots
  await p.click('summary'); await p.click('[data-party="750"]'); await p.waitForTimeout(900);
  await p.screenshot({path:OUT+'f750.png'});
  console.log('6 750 banner:', (await p.textContent('#banner')).replace(/\s+/g,' '));
  await p.waitForTimeout(9000); console.log('6b confetti klaar (leeg canvas):', (await painted(p))===0, '| banner weg:', !(await p.locator('#banner.show').count()), '| ballon terug:', await p.textContent('#bubble'));
  await c.close();

  // 7. mobiel
  [c,p]=await mk(base,390,844); await p.goto(URL); await p.evaluate(()=>window.scrollTo(0,0)); await p.click('summary');
  await p.evaluate(()=>document.querySelector('[data-party="1000"]').click()); await p.waitForTimeout(1500);
  await p.screenshot({path:OUT+'f1000m.png'});
  console.log('errors:', errs); await b.close();
})();
