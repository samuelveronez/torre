// Browser tests use synthetic accounts and mocked APIs; no real notes are sent.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5182','--strictPort'],{windowsHide:true,stdio:'ignore'});
const userId='00000000-0000-0000-0000-000000000001',personId='10000000-0000-0000-0000-000000000001';
const user={id:userId,email:'test@example.com',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-06T00:00:00Z'};
const tables={torre_people:[{id:personId,user_id:userId,name:'Ana Costa'}],torre_conversations:[],torre_tasks:[],torre_scheduled_blocks:[],torre_preferences:[{user_id:userId,timezone:'America/Sao_Paulo',theme:'light'}],torre_work_hours:Array.from({length:7},(_,weekday)=>({weekday,user_id:userId,enabled:weekday>0&&weekday<6,start_time:'09:00',end_time:'18:00'})),torre_task_labels:[],torre_labels:[],torre_captures:[],torre_attachments:[],torre_calendars:[],torre_calendar_events:[],torre_google_lists:[],torre_google_status:[],torre_ai_settings:[{user_id:userId,enabled:true,has_key:true,provider:'openrouter'}]};
const text='Ana está sobrecarregada. Decidimos reduzir prioridades. Eu reviso amanhã. Ana envia a proposta até sexta.';
const agreement=(title,owner)=>({id:crypto.randomUUID(),title,owner,person:owner==='other'?'Ana Costa':'',due:owner==='other'?'2026-10-09':'2026-10-07',followUp:owner==='other'?'2026-10-13':'',followUpSuggested:owner==='other',minutes:30,createTask:true,sourceText:owner==='other'?'Ana envia a proposta até sexta.':'Eu reviso amanhã.',dueEvidence:'',followUpEvidence:''});
let extractionFails=false,saveFails=false;const errors=[];
const context=await browser.newContext({viewport:{width:1440,height:1100},timezoneId:'America/Sao_Paulo'});
await context.route('https://nvxwqrpztecrvrxoddxf.supabase.co/**',async route=>{
 const req=route.request(),url=new URL(req.url()),method=req.method(),headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'};
 const respond=(value,status=200)=>route.fulfill({status,headers,body:JSON.stringify(value)});
 if(method==='OPTIONS')return respond({});
 if(url.pathname.startsWith('/auth/'))return respond(user);
 if(url.pathname.endsWith('/functions/v1/torre-conversations')){if(extractionFails)return respond({error:'IA indisponível. Texto preservado.'},400);return respond({content:{raw_text:text,check_in:'Ana está sobrecarregada.',decisions:'Reduzir prioridades.',agreements:[agreement('Revisar prioridades','me'),agreement('Receber proposta da Ana','other')]}});}
 if(url.pathname.endsWith('/rpc/torre_save_conversation')){
  if(saveFails)return respond({message:'Falha simulada de conexão'},503);
  const p=req.postDataJSON();let row=tables.torre_conversations.find(x=>x.id===p.p_id);if(row?.last_request===p.p_request)return respond(row);
  if(row&&row.version!==p.p_version)return respond({message:'A conversa mudou em outra janela. Recarregue antes de salvar.'},400);
  const content=p.p_content;
  content.agreements=content.agreements.map(a=>{const old=row?.agreements.find(x=>x.id===a.id&&x.taskId);if(old)return old;if(p.p_create&&a.createTask){a.taskId=crypto.randomUUID();a.createTask=false;tables.torre_tasks.push({id:a.taskId,user_id:userId,title:a.title,description:a.sourceText,area:'professional',duration_minutes:30,due_date:a.due,status:a.owner==='other'?'waiting':'todo',waiting_for:a.person,follow_up_date:a.followUp,source:'torre',created_at:'2026-10-07T00:00:00Z'});}return a;});
  const next={...content,id:p.p_id,user_id:userId,person_id:p.p_person,conversation_date:p.p_date,state:p.p_state,version:(row?.version||0)+1,last_request:p.p_request};
  tables.torre_conversations=[next,...tables.torre_conversations.filter(x=>x.id!==next.id)];return respond(next);
 }
 if(url.pathname.includes('/rpc/'))return respond(null);
 if(url.pathname.includes('/functions/'))return respond({ok:true});
 const table=url.pathname.split('/').pop();if(!(table in tables))throw new Error('Unexpected table '+table);
 let rows=tables[table];for(const [key,val] of url.searchParams)if(val.startsWith('eq.'))rows=rows.filter(row=>String(row[key])===val.slice(3));
 if(method==='POST'){const payload=req.postDataJSON();tables[table].push(payload);rows=[payload];}
 if(method==='PATCH'){rows.forEach(row=>Object.assign(row,req.postDataJSON()));}
 return respond(req.headers().accept?.includes('vnd.pgrst.object')?rows[0]:rows);
});
await context.addInitScript(({user,userId})=>{const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:userId,role:'authenticated',exp:4102444800}))+'.test';localStorage.setItem('sb-nvxwqrpztecrvrxoddxf-auth-token',JSON.stringify({access_token:token,refresh_token:'test',token_type:'bearer',expires_at:4102444800,expires_in:3600,user}));localStorage.setItem(`torre:${userId}:page`,JSON.stringify('Conversas'));},{user,userId});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
try{
 for(let i=0;i<40;i++){try{await fetch('http://127.0.0.1:5182/');break;}catch{await new Promise(r=>setTimeout(r,200));}}
 await page.goto('http://127.0.0.1:5182/');await page.getByRole('button',{name:'Ana Costa',exact:true}).click();
 await page.getByLabel('Data da conversa').fill('2026-10-06');await page.getByLabel('Texto livre',{exact:true}).fill(text);
 await page.getByRole('button',{name:'Organizar com IA',exact:true}).click();await page.getByRole('heading',{name:'Revisar interpretação'}).waitFor();
 assert.equal(tables.torre_tasks.length,0);await page.getByRole('button',{name:'Usar interpretação',exact:true}).click();
 assert.equal(await page.getByLabel('Prazo (opcional)',{exact:true}).first().inputValue(),'2026-10-07');assert.equal(await page.getByLabel('Quando acompanhar?',{exact:true}).inputValue(),'2026-10-13');
 await page.getByRole('button',{name:'Salvar e criar tarefas (2)',exact:true}).click();await page.getByRole('button',{name:'Abrir tarefa',exact:true}).first().waitFor();assert.equal(tables.torre_tasks.length,2);
 await page.getByRole('button',{name:'Salvar e criar tarefas (0)',exact:true}).click();assert.equal(tables.torre_tasks.length,2);
 await page.getByRole('button',{name:'Abrir tarefa',exact:true}).first().click();await page.getByRole('dialog',{name:'Editar tarefa'}).waitFor();await page.getByRole('button',{name:'Fechar',exact:true}).click();
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'visual-prep/conversations-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Nova conversa',exact:true}).click();await page.getByLabel('Check-in',{exact:true}).fill('Tudo bem. Sem decisões ou combinados.');await page.getByRole('button',{name:'Salvar conversa',exact:true}).click();await page.getByText('Conversa salva.',{exact:true}).waitFor();assert.equal(tables.torre_tasks.length,2);
 await page.getByRole('button',{name:'Nova conversa',exact:true}).click();await page.getByLabel('Texto livre',{exact:true}).fill('Uma anotação importante');extractionFails=true;
 await page.getByRole('button',{name:'Organizar com IA',exact:true}).click();await page.getByRole('alert').filter({hasText:'IA indisponível'}).waitFor();assert.equal(await page.getByLabel('Texto livre',{exact:true}).inputValue(),'Uma anotação importante');
 extractionFails=false;saveFails=true;await page.getByLabel('Texto livre',{exact:true}).fill('Anotação recuperável após falha');await page.getByRole('button',{name:'Salvar conversa',exact:true}).click();await page.getByRole('alert').filter({hasText:'Falha simulada'}).waitFor();
 await page.reload();await page.getByLabel('Texto livre',{exact:true}).waitFor();assert.equal(await page.getByLabel('Texto livre',{exact:true}).inputValue(),'Anotação recuperável após falha');saveFails=false;
 await page.getByRole('button',{name:'Salvar conversa',exact:true}).click();await page.getByText('Conversa salva.',{exact:true}).waitFor();
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'visual-prep/conversations-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 assert.deepEqual(errors,[]);console.log('PASS: pessoa → registro → revisão IA → tarefas; salvar sem tarefas; falha IA; recuperação; desktop/mobile.');
}catch(e){console.error('UI errors:',errors);console.error((await page.locator('body').innerText()).slice(-3500));await page.screenshot({path:'visual-prep/conversations-failure.png',fullPage:true});throw e;}finally{await context.close();await browser.close();server.kill();}
