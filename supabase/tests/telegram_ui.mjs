import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||'C:/Users/samue/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const browser=await chromium.launch({channel:'msedge',headless:true});
const uid='10000000-0000-4000-8000-000000000001';
const user={id:uid,email:'test@example.com',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-07T00:00:00Z'};
let config={botName:'torre_veronez_bot',hasToken:true,linked:false,enabled:false,weekdays:[0,1,2,3,4,5,6],sendTime:'21:00',last:null};const calls=[];let fail=false,statusFails=0;
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.route('https://nvxwqrpztecrvrxoddxf.supabase.co/**',async route=>{
 const req=route.request(),url=new URL(req.url());const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'};
 const reply=(value,status=200)=>route.fulfill({status,headers,body:JSON.stringify(value)});
 if(req.method()==='OPTIONS')return reply({});
 if(url.pathname.startsWith('/auth/'))return reply(user);
 if(url.pathname.includes('/functions/v1/torre-telegram-settings')){
  const input=req.postDataJSON();calls.push(input);
  if(input.action==='status'){if(statusFails>0){statusFails--;return reply({error:'Falha simulada ao atualizar a tela.'},503);}return reply(config);}
  if(input.action==='link')return reply({url:'https://t.me/torre_veronez_bot?start=synthetic'});
  if(input.action==='schedule'){if(fail)return reply({error:'Falha simulada no agendamento.'},400);config={...config,enabled:input.enabled,weekdays:input.weekdays,sendTime:input.sendTime};return reply({ok:true});}
  if(input.action==='test'){config.testAfter=new Date(Date.now()+2000).toISOString();statusFails=1;return reply({ok:true,delivered:true,messageId:7,testAfter:config.testAfter});}
  throw new Error('Unexpected action '+input.action);
 }
 if(url.pathname.includes('/rpc/'))return reply(null);
 const table=url.pathname.split('/').pop();let rows=[];
 if(table==='torre_preferences')rows=[{user_id:uid,timezone:'America/Sao_Paulo',theme:'light'}];
 if(table==='torre_work_hours')rows=Array.from({length:7},(_,weekday)=>({user_id:uid,weekday,enabled:true,start_time:'09:00',end_time:'18:00'}));
 return reply(rows);
});
await context.addInitScript(({user,uid})=>{const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:uid,role:'authenticated',exp:4102444800}))+'.test';localStorage.setItem('sb-nvxwqrpztecrvrxoddxf-auth-token',JSON.stringify({access_token:token,refresh_token:'test',token_type:'bearer',expires_at:4102444800,expires_in:3600,user}));localStorage.setItem(`torre:${uid}:page`,JSON.stringify('Configurações'));localStorage.setItem(`torre:${uid}:settings-section`,JSON.stringify('Telegram'));},{user,uid});
const page=await context.newPage();
try{
 await page.goto(process.env.TORRE_TEST_URL||'http://127.0.0.1:5187/');
 await page.getByRole('button',{name:'Vincular meu Telegram',exact:true}).click();
 await page.getByRole('link',{name:'Abrir bot e vincular meu chat'}).waitFor();
 assert.equal(await page.getByLabel('Token do BotFather').inputValue(),'');
 assert.equal(await page.getByRole('button',{name:'Enviar resumo de teste'}).isDisabled(),true);
 config.linked=true;await page.getByText('Chat vinculado à sua conta.',{exact:true}).waitFor({timeout:12000});
 await page.getByLabel('Ativar envio automático').check();await page.getByLabel('Horário de envio').fill('22:15');await page.getByLabel('Domingo',{exact:true}).uncheck();await page.getByRole('button',{name:'Salvar lembrete',exact:true}).click();await page.getByText('Lembrete salvo.',{exact:true}).waitFor();
 const saved=calls.find(c=>c.action==='schedule');assert.equal(saved.enabled,true);assert.equal(saved.sendTime,'22:15');assert.equal(saved.weekdays.includes(0),false);
 await page.getByRole('button',{name:'Enviar resumo de teste'}).click();await page.getByText('Resumo de teste enviado ao seu Telegram. Não foi possível atualizar o estado da tela; a entrega já foi confirmada.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:/Aguarde .*s/}).isDisabled(),true);await page.getByRole('button',{name:'Enviar resumo de teste',exact:true}).waitFor({timeout:5000});assert.equal(await page.getByRole('button',{name:'Enviar resumo de teste',exact:true}).isEnabled(),true);assert.equal(await page.getByText('Chat vinculado à sua conta.',{exact:true}).count(),1);
 fail=true;await page.getByRole('button',{name:'Salvar lembrete',exact:true}).click();await page.getByRole('alert').filter({hasText:'Falha simulada'}).waitFor();
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.screenshot({path:'visual-prep/telegram-digest-mobile.png',fullPage:true});
 console.log('PASS: linking, hidden token, weekday/time persistence, test delivery action, failure feedback and mobile overflow');
}finally{await browser.close();}
