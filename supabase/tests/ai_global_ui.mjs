import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL('C:/Users/samue/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const browser=await chromium.launch({channel:'msedge',headless:true});
const uid='10000000-0000-4000-8000-000000000001';
const user={id:uid,email:'test@example.com',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-07T00:00:00Z'};
let model='openrouter/free',fail=false;const calls=[];
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.route('https://nvxwqrpztecrvrxoddxf.supabase.co/**',async route=>{
 const req=route.request(),url=new URL(req.url());const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'};
 const reply=(data,status=200)=>route.fulfill({status,headers,body:JSON.stringify(data)});
 if(req.method()==='OPTIONS')return reply({});if(url.pathname.startsWith('/auth/'))return reply(user);
 if(url.pathname.includes('/functions/')){const input=req.postDataJSON();calls.push(input);if(input.action==='ai-default'){if(fail)return reply({error:'Falha simulada ao salvar.'},400);model=input.model;return reply({ok:true});}throw new Error('Unexpected action '+input.action);}
 if(url.pathname.endsWith('/rpc/torre_agent_conversations'))return reply([]);
 if(url.pathname.includes('/rpc/'))return reply(null);
 const table=url.pathname.split('/').pop();
 if(table==='torre_ai_settings')return reply([{user_id:uid,has_key:true,enabled:true,provider:'openrouter',model:'inception/mercury-decide:free',default_model:model}]);
 if(table==='torre_preferences')return reply([{user_id:uid,theme:'light',timezone:'America/Sao_Paulo'}]);
 if(table==='torre_work_hours')return reply(Array.from({length:7},(_,weekday)=>({user_id:uid,weekday,enabled:true,start_time:'09:00',end_time:'18:00'})));
 return reply([]);
});
await context.addInitScript(({user,uid})=>{const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:uid,role:'authenticated',exp:4102444800}))+'.test';localStorage.setItem('sb-nvxwqrpztecrvrxoddxf-auth-token',JSON.stringify({access_token:token,refresh_token:'test',token_type:'bearer',expires_at:4102444800,expires_in:3600,user}));localStorage.setItem(`torre:${uid}:page`,JSON.stringify('Configurações'));localStorage.setItem(`torre:${uid}:settings-section`,JSON.stringify('IA'));localStorage.setItem(`torre:${uid}:agent-model`,'google/gemini-2.5-flash');},{user,uid});
const page=await context.newPage();
try{
 await page.goto(process.env.TORRE_TEST_URL||'http://127.0.0.1:5188/');
 const select=page.getByLabel('Modelo padrão de toda a aplicação');await select.waitFor();assert.equal(await select.inputValue(),'openrouter/free');
 await select.selectOption('google/gemini-2.5-flash');await page.getByRole('button',{name:'Salvar modelo padrão',exact:true}).click();await page.getByText('Modelo padrão salvo para toda a Torre.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Modo IA',exact:true}).click();await page.getByLabel('Modelo da IA',{exact:true}).waitFor();assert.equal(await page.getByLabel('Modelo da IA',{exact:true}).inputValue(),'google/gemini-2.5-flash');
 await page.getByLabel('Modelo da IA',{exact:true}).selectOption('openrouter/free');await page.waitForFunction(()=>document.querySelector('[aria-label="Modelo da IA"]')?.value==='openrouter/free');
 await page.getByRole('button',{name:'Configurações',exact:true}).click();await select.waitFor();assert.equal(await select.inputValue(),'openrouter/free');
 fail=true;await select.selectOption('google/gemini-2.5-flash');await page.getByRole('button',{name:'Salvar modelo padrão',exact:true}).click();await page.getByText('Não foi possível salvar o modelo padrão.',{exact:true}).waitFor();assert.equal(model,'openrouter/free');
 await page.reload();await select.waitFor();assert.equal(await select.inputValue(),'openrouter/free');assert.equal(calls.filter(c=>c.action==='ai-default').length,3);
 console.log('PASS: account default, paid selection, chat/global sync, obsolete local preference ignored, failed save and reload persistence');
}finally{await browser.close();}
