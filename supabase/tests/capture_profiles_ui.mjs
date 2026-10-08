import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
const server=process.env.TORRE_TEST_URL?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5183','--strictPort'],{windowsHide:true,stdio:'ignore'});
if(server)for(let i=0;i<30;i++){try{if((await fetch('http://127.0.0.1:5183/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
const {chromium}=await import(pathToFileURL('C:/Users/samue/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const browser=await chromium.launch({channel:'msedge',headless:true});
const uid='10000000-0000-4000-8000-000000000001',person='10000000-0000-4000-8000-000000000002';
const user={id:uid,email:'test@example.com',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-08T00:00:00Z'};
let preferred='free';const calls=[],errors=[];
const tables={torre_tasks:[],torre_people:[{id:person,user_id:uid,name:'Ana Costa'}],torre_task_people:[],torre_captures:[],torre_attachments:[],torre_labels:[],torre_scheduled_blocks:[],torre_task_labels:[],torre_calendars:[],torre_calendar_events:[],torre_google_lists:[],torre_google_status:[],torre_preferences:[{user_id:uid,theme:'light',timezone:'America/Sao_Paulo'}],torre_work_hours:Array.from({length:7},(_,weekday)=>({user_id:uid,weekday,enabled:true,start_time:'09:00',end_time:'18:00'}))};
const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'America/Sao_Paulo'});
await context.route('https://nvxwqrpztecrvrxoddxf.supabase.co/**',async route=>{
 const req=route.request(),url=new URL(req.url()),headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'};
 const reply=(data,status=200)=>route.fulfill({status,headers,body:JSON.stringify(data)});
 if(req.method()==='OPTIONS')return reply({});if(url.pathname.startsWith('/auth/'))return reply(user);
 if(url.pathname.includes('/functions/')){const p=req.postDataJSON();calls.push(p);if(p.action==='capture-profile'){preferred=p.profile;return reply({ok:true});}if(p.action==='triage'){const c=tables.torre_captures.find(c=>c.id===p.captureId);const id=crypto.randomUUID();c.state='processed';tables.torre_tasks.push({id,user_id:uid,capture_id:c.id,title:'Aguardar Ana',description:c.body,area:'professional',duration_minutes:30,status:'waiting',waiting_for:'Ana Costa',follow_up_date:'2026-10-09',due_date:'2026-10-12',source:'torre',priority:'none',created_at:new Date().toISOString()});tables.torre_task_people.push({task_id:id,user_id:uid,name:'Ana Costa',person_id:person,role:'waiting_for'});return reply({ok:true,taskIds:[id]});}return reply({ok:true});}
 if(url.pathname.endsWith('/rpc/torre_set_task_people')){const p=req.postDataJSON();tables.torre_task_people=tables.torre_task_people.filter(x=>x.task_id!==p.p_task).concat(p.p_people.map(x=>({task_id:p.p_task,user_id:uid,name:x.name,person_id:x.personId,role:x.role})));return reply(null);}
 if(url.pathname.includes('/rpc/'))return reply(null);
 const table=url.pathname.split('/').pop();if(table==='torre_ai_settings')return reply([{user_id:uid,has_key:true,enabled:true,provider:'openrouter',model:'inception/mercury-decide:free',default_model:'openrouter/free',capture_profile:preferred}]);
 if(req.method()==='POST'||req.method()==='PATCH'){const raw=req.postDataJSON();const rows=Array.isArray(raw)?raw:[raw];for(const row of rows){if(req.method()==='PATCH'){const id=url.searchParams.get('id')?.replace('eq.','');Object.assign(tables[table].find(x=>x.id===id),row);}else if(!tables[table].some(x=>x.id===row.id)){tables[table].push({...row,state:table==='torre_captures'?'inbox':row.state,created_at:new Date().toISOString()});}}return reply(null);}
 let data=tables[table]??[];for(const [key,value] of url.searchParams){if(value.startsWith('eq.'))data=data.filter(x=>String(x[key])===value.slice(3));}if(req.headers().accept?.includes('object+json'))return reply(data[0]??null);return reply(data);
});
await context.addInitScript(({user,uid})=>{const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:uid,role:'authenticated',exp:4102444800}))+'.test';localStorage.setItem('sb-nvxwqrpztecrvrxoddxf-auth-token',JSON.stringify({access_token:token,refresh_token:'test',token_type:'bearer',expires_at:4102444800,expires_in:3600,user}));},{user,uid});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.TORRE_TEST_URL??'http://127.0.0.1:5183/');await page.getByRole('button',{name:'Caixa de entrada',exact:true}).click();await page.keyboard.press('Control+k');
 const model=page.getByLabel('Modelo desta captura');await model.waitFor();assert.equal(await model.inputValue(),'free');await model.selectOption('luna');assert.equal(calls.length,0);
 await page.locator('.quick-capture-dialog select').nth(1).selectOption('free');await page.getByLabel('O que você quer guardar?').fill('Enviei proposta e aguardo Ana Costa, acompanhar sexta; entregar até 12/10/2026');
 await page.screenshot({path:'.db-validation/capture-model-desktop.png',fullPage:true});await page.getByRole('button',{name:'Salvar na caixa de entrada',exact:true}).click();await page.getByRole('button',{name:'Ver processadas',exact:true}).click();await page.getByRole('button',{name:'Aguardar Ana',exact:true}).waitFor();assert.equal(tables.torre_captures[0].ai_profile,'luna');assert.equal(preferred,'luna');assert(calls.some(c=>c.action==='triage'));
 await page.getByRole('button',{name:'Aguardar Ana',exact:true}).click();await page.getByLabel('Nome ou equipe').waitFor();assert.equal(await page.getByLabel('Cadastro',{exact:true}).inputValue(),person);await page.getByLabel('Cadastro',{exact:true}).selectOption('');await page.getByLabel('Nome ou equipe').fill('Equipe externa');await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();await page.getByText('Alterações salvas.',{exact:true}).waitFor();assert.equal(tables.torre_task_people[0].person_id,null);await page.getByRole('button',{name:'Fechar detalhes',exact:true}).click();
 await page.keyboard.press('Control+k');assert.equal(await model.inputValue(),'luna');await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.db-validation/capture-model-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.getByRole('button',{name:'Fechar captura',exact:true}).click();
 assert.deepEqual(errors,[]);console.log('PASS: per-capture models, no call on selection, persistence, dates/people, free name editing and mobile layout');
}finally{await browser.close();server?.kill();}

