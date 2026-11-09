const { chromium } = require('playwright');
const path = require('path'), os = require('os');
const OUT = os.tmpdir() + '/';
const URL='http://localhost:8766/index.html';
// ---- nagebootste Supabase-server (Node-kant), met dezelfde "alleen eigen rijen"-regel ----
const DB={users:{'wouter@x.nl':{id:'u-wouter',pw:'geheim123'},'collega@x.nl':{id:'u-collega',pw:'collega123'}},entries:[],costs:[],user_settings:[]};
let failNext=0;
const iso=s=>new Date(s).toISOString().replace('Z','+00:00');
async function rpc(a){
  if(a.k==='login'){const u=DB.users[a.email];return u&&u.pw===a.password?{id:u.id}:{error:'Invalid login credentials'}}
  if(a.k==='setpw'){const e=Object.values(DB.users).find(u=>u.id===a.id)||(DB.users['nieuw@x.nl']={id:a.id});e.pw=a.password;return {}}
  if(a.k==='db'){
    if(failNext>0&&a.op!=='select'){failNext--;return {error:{message:'Failed to fetch'}}}
    const t=DB[a.table], mine=r=>r.user_id===a.uid;
    if(a.op==='select'){let rows=t.filter(mine);
      if(a.order)rows=[...rows].sort((x,y)=>String(x[a.order]).localeCompare(String(y[a.order])));
      if(a.range)rows=rows.slice(a.range[0],a.range[1]+1);
      return a.single?{data:rows[0]||null}:{data:rows}}
    if(a.op==='upsert'){const pk=a.table==='user_settings'?'user_id':'id';
      for(const r0 of [].concat(a.rows)){ if(r0.user_id!==a.uid)return {error:{message:'RLS: new row violates row-level security policy'}};
        const r={...r0}; if(r.started_at)r.started_at=iso(r.started_at); if(r.ended_at)r.ended_at=iso(r.ended_at);
        const i=t.findIndex(x=>x[pk]===r[pk]); if(i>=0){ if(t[i].user_id!==a.uid)return {error:{message:'RLS'}}; t[i]=r } else t.push(r)}
      return {data:null}}
    if(a.op==='delete'){DB[a.table]=t.filter(r=>!(mine(r)&&a.ids.includes(r.id)));return {data:null}}
  }
}
const MOCK=`(()=>{const call=(k,o)=>window.mockRpc({k,...o});
window.supabase={createClient(){
  let session=JSON.parse(localStorage.getItem('__s')||'null'); const subs=[];
  const h=location.hash; if(/type=invite/.test(h)) session={user:{id:'u-nieuw',email:'nieuw@x.nl'}};
  const emit=e=>subs.forEach(f=>f(e,session));
  const auth={onAuthStateChange(cb){subs.push(cb);setTimeout(()=>cb('INITIAL_SESSION',session),0);return{data:{subscription:{unsubscribe(){}}}}},
    async signInWithPassword({email,password}){const r=await call('login',{email,password});if(r.error)return{data:null,error:{message:r.error}};session={user:{id:r.id,email}};localStorage.setItem('__s',JSON.stringify(session));setTimeout(()=>emit('SIGNED_IN'),0);return{data:{session},error:null}},
    async signOut(){session=null;localStorage.removeItem('__s');return{error:null}},
    async resetPasswordForEmail(email){window.__reset=email;return{error:null}},
    async updateUser({password}){await call('setpw',{id:session.user.id,password});localStorage.setItem('__s',JSON.stringify(session));setTimeout(()=>emit('USER_UPDATED'),0);return{data:{},error:null}},
    async getSession(){return{data:{session}}}};
  const from=table=>{const q={op:'select'};const b={select(){q.op=q.op==='select'?'select':q.op;return b},order(c){q.order=c;return b},range(a,z){q.range=[a,z];return b},
    maybeSingle(){q.single=true;return b},upsert(rows){q.op='upsert';q.rows=rows;return b},delete(){q.op='delete';return b},in(c,ids){q.ids=ids;return b},
    then(res,rej){if(!session)return res({data:null,error:{message:'not logged in'}});return call('db',{table,uid:session.user.id,...q}).then(r=>res({data:null,error:null,...r}),rej)}};return b};
  return{auth,from}}}})();`;
const ask=(d,v)=>{ if(d.type()==='prompt') d.accept(v.shift()); else d.accept(); };
(async()=>{
  const b=await chromium.launch(); const errs=[]; let ok=true;
  const check=(name,cond,extra='')=>{console.log((cond?'✔ ':'✘ ')+name+(extra?'  '+extra:''));if(!cond)ok=false};
  const mkctx=async(opts={})=>{const c=await b.newContext({viewport:{width:1100,height:900},...opts});
    await c.exposeFunction('mockRpc',rpc);
    await c.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.URENLOGGER_CONFIG={supabaseUrl:"https://x.supabase.co",supabaseKey:"anon"}'}));
    await c.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'text/javascript',body:MOCK}));
    return c};
  const page=async(c,dialogs=[])=>{const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>ask(d,dialogs));return p};

  // 1 login-scherm
  let c1=await mkctx(); const vals=['70','21']; let p=await page(c1,vals); await p.goto(URL);
  await p.waitForSelector('#formLogin:visible');
  check('1 loginscherm, app verborgen',await p.isHidden('#app')&&await p.isVisible('#formLogin'));
  check('1b loginscherm toont GEEN nieuw-wachtwoordvelden',!(await p.isVisible('#formNewPass'))&&!(await p.isVisible('#authMsg')));
  await p.screenshot({path:OUT+'login.png'});
  await p.fill('#aEmail','wouter@x.nl'); await p.fill('#aPass','fout'); await p.click('#btnLogin');
  await p.waitForSelector('#authMsg:visible'); check('2 verkeerd wachtwoord -> melding',/klopt niet/.test(await p.textContent('#authMsg')));
  await p.fill('#aPass','geheim123'); await p.click('#btnLogin');
  await p.waitForSelector('#app:visible'); await p.waitForTimeout(500);
  check('3 ingelogd, eerste keer: tarief ingesteld op 70',(await p.textContent('#rateLabel')).includes('70'),await p.textContent('#rateLabel'));
  check('3b "ingelogd als" zichtbaar',(await p.textContent('#whoami'))==='wouter@x.nl');

  // 4 data invoeren -> naar server
  await p.fill('#hFrom','09:00'); await p.fill('#hTo','12:30'); await p.fill('#hNote','Zitting'); await p.click('#formHours button');
  await p.fill('#cAmount','12.5'); await p.fill('#cDesc','Reiskosten'); await p.click('#formCost button');
  await p.waitForTimeout(1500);
  check('4 uren/kosten/instellingen op server',DB.entries.length===1&&DB.costs.length===1&&DB.user_settings.length===1&&DB.user_settings[0].rate===70,JSON.stringify({e:DB.entries.length,c:DB.costs.length,rate:DB.user_settings[0]?.rate}));
  check('4b rijen hebben user_id en uuid',DB.entries[0].user_id==='u-wouter'&&/^[0-9a-f-]{36}$/.test(DB.entries[0].id));
  // 5 herladen
  await p.reload(); await p.waitForSelector('#app:visible'); await p.waitForTimeout(500);
  check('5 na herladen ingelogd met data',(await p.textContent('#mHours')).includes('3u 30m')&&(await p.textContent('#rateLabel')).includes('70'),await p.textContent('#mHours'));

  // 6 tweede apparaat, zelfde gebruiker: timer op A starten, B ziet hem
  let c2=await mkctx(); let q=await page(c2); await q.goto(URL); await q.waitForSelector('#formLogin:visible');
  await q.fill('#aEmail','wouter@x.nl'); await q.fill('#aPass','geheim123'); await q.click('#btnLogin'); await q.waitForSelector('#app:visible'); await q.waitForTimeout(400);
  check('6 apparaat B ziet dezelfde uren',(await q.textContent('#mHours')).includes('3u 30m'));
  await p.click('#btnIn'); await p.waitForTimeout(1200);
  await q.evaluate(()=>document.dispatchEvent(new Event('visibilitychange'))); await q.waitForTimeout(600);
  check('6b apparaat B ziet lopende timer van A',(await q.textContent('#statusTxt'))==='Ingecheckt',await q.textContent('#statusTxt'));
  await q.click('#btnOut'); await q.waitForTimeout(1200);
  await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(600);
  check('6c uitchecken op B komt bij A aan',(await p.textContent('#statusTxt'))==='Uitgecheckt',await p.textContent('#statusTxt'));
  // (kortere dan 1 sec. sessie wordt weggegooid; controleer dat niets raars is blijven staan)
  await c2.close();

  // 7 verwijderen
  p.removeAllListeners('dialog'); p.on('dialog',d=>d.accept());
  const nBefore=DB.entries.length; await p.click('#listHours .x'); await p.waitForTimeout(1200);
  check('7 verwijderen gaat ook naar server',DB.entries.length===nBefore-1,`${nBefore}->${DB.entries.length}`);

  // 8 mislukte verbinding: melding + automatisch opnieuw
  failNext=2; await p.fill('#cAmount','5'); await p.fill('#cDesc','Parkeren'); await p.click('#formCost button'); await p.waitForTimeout(900);
  check('8 bij fout: melding "Niet opgeslagen"',/Niet opgeslagen/.test(await p.textContent('#syncState')));
  failNext=0; await p.waitForTimeout(9500);
  check('8b daarna automatisch alsnog opgeslagen',DB.costs.some(x=>x.description==='Parkeren'));

  // 9 collega ziet niets van Wouter (en kan niet namens Wouter schrijven)
  let c3=await mkctx(); const v3=['65','21']; let r=await page(c3,v3); await r.goto(URL); await r.waitForSelector('#formLogin:visible');
  await r.fill('#aEmail','collega@x.nl'); await r.fill('#aPass','collega123'); await r.click('#btnLogin'); await r.waitForSelector('#app:visible'); await r.waitForTimeout(500);
  check('9 collega ziet geen uren/kosten van Wouter',(await r.textContent('#mHours')).includes('0u 00m')&&await r.locator('#listHours .x').count()===0&&await r.locator('#listCosts .x').count()===0);
  check('9b server weigert schrijven namens ander',(await rpc({k:'db',op:'upsert',table:'entries',uid:'u-collega',rows:{id:'x',user_id:'u-wouter',started_at:0,ended_at:1}})).error!==undefined);
  await c3.close();

  // 10 lokale gegevens importeren
  let c4=await mkctx(); await c4.addInitScript(()=>{ if(!localStorage.getItem('urenlogger.v1')){const n=Date.now(); localStorage.setItem('urenlogger.v1',JSON.stringify({rate:80,btw:21,entries:[{id:'old1',start:n-7200e3,end:n-3600e3,note:'oud'}],costs:[{id:'oldc',date:new Date().toISOString().slice(0,10),desc:'oude kosten',amount:9.99}],active:null}))}});
  let dl=[]; let s4=await c4.newPage(); s4.on('pageerror',e=>errs.push(e.message)); s4.on('dialog',d=>{dl.push(d.type()+':'+d.message().slice(0,40)); d.accept(d.type()==='prompt'?'80':undefined)});
  DB.users['import@x.nl']={id:'u-import',pw:'import1234'};
  await s4.goto(URL); await s4.waitForSelector('#formLogin:visible'); await s4.fill('#aEmail','import@x.nl'); await s4.fill('#aPass','import1234'); await s4.click('#btnLogin'); await s4.waitForSelector('#app:visible'); await s4.waitForTimeout(1800);
  check('10 aanbod om lokale gegevens te importeren',dl.some(x=>x.startsWith('confirm:')),dl.join(' | '));
  check('10b geïmporteerd met nieuwe uuid-ids',DB.entries.some(e=>e.user_id==='u-import'&&e.note==='oud'&&/^[0-9a-f-]{36}$/.test(e.id))&&DB.costs.some(x=>x.user_id==='u-import'&&x.description==='oude kosten'));
  await c4.close();

  // 11 uitnodiging: wachtwoord kiezen
  let c5=await mkctx(); let n=await page(c5,['65','21']); await n.goto(URL+'#access_token=abc&type=invite'); await n.waitForSelector('#formNewPass:visible');
  check('11 uitnodiging -> scherm "Kies een wachtwoord"',(await n.textContent('#authTitle'))==='Kies een wachtwoord');
  check('11a-bis uitnodigingsscherm toont GEEN loginvelden',!(await n.isVisible('#formLogin'))&&!(await n.isVisible('#btnForgot')));
  await n.screenshot({path:OUT+'newpass.png'});
  await n.fill('#nPass','kort'); await n.fill('#nPass2','kort'); await n.click('#formNewPass button');   // minlength door browser
  await n.fill('#nPass','langgenoeg1'); await n.fill('#nPass2','anders1234'); await n.click('#formNewPass button');
  check('11b ongelijke wachtwoorden worden afgewezen',/niet gelijk/.test(await n.textContent('#authMsg')));
  await n.fill('#nPass2','langgenoeg1'); await n.click('#formNewPass button'); await n.waitForSelector('#app:visible',{timeout:6000});
  check('11c na wachtwoord kiezen in de app',(await n.textContent('#whoami'))==='nieuw@x.nl'&&DB.users['nieuw@x.nl'].pw==='langgenoeg1'&&!/type=invite/.test(n.url()));
  await c5.close();

  // 12 wachtwoord vergeten + uitloggen
  let c6=await mkctx(); let f=await page(c6); await f.goto(URL); await f.waitForSelector('#formLogin:visible');
  await f.click('#btnForgot'); check('12 vergeten zonder e-mail -> hint',/Vul eerst/.test(await f.textContent('#authMsg')));
  await f.fill('#aEmail','wouter@x.nl'); await f.click('#btnForgot'); await f.waitForTimeout(300);
  check('12b reset aangevraagd',await f.evaluate(()=>window.__reset)==='wouter@x.nl');
  await c6.close();
  await p.click('#btnLogout'); await p.waitForTimeout(1500); await p.waitForSelector('#formLogin:visible'); check('13 uitloggen -> loginscherm',await p.isHidden('#app'),'app.hidden='+await p.evaluate(()=>document.getElementById('app').hidden)+' url='+p.url());
  await p.goto(URL); await p.waitForSelector('#formLogin:visible'); check('13b na uitloggen blijft het scherm op login',await p.isHidden('#app'));
  console.log('pagina-fouten:',errs); await b.close(); process.exit(ok&&!errs.length?0:1);
})();
