import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';

// Rodar com PLAYWRIGHT_MODULE (playwright fora do repo) e, opcionalmente, TORRE_TEST_URL (dev server já aberto).
const server=process.env.TORRE_TEST_URL?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5185','--strictPort'],{stdio:'ignore'});
if(server){
 for(let i=0;i<40;i++){
  try{if((await fetch('http://127.0.0.1:5185/')).ok)break;}catch{}
  await new Promise(resolve=>setTimeout(resolve,250));
 }
}
const playwright=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const chromium=playwright.chromium??playwright.default.chromium;
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});

const uid='10000000-0000-4000-8000-000000000001';
const radarLabel='20000000-0000-4000-8000-000000000001';
const themeA='30000000-0000-4000-8000-000000000001';
const themeB='30000000-0000-4000-8000-000000000002';
const plain='30000000-0000-4000-8000-000000000003';
const user={id:uid,email:'test@example.com',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-08T00:00:00Z'};
const day=offset=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date(Date.now()+offset*86400000));
const task=(id,title,fields={})=>({id,user_id:uid,title,description:'',area:'professional',duration_minutes:30,due_date:null,status:'todo',priority:'none',source:'torre',archived_at:null,created_at:'2026-10-01T12:00:00Z',radar_task_id:null,...fields});
const tables={
 torre_tasks:[
  task(themeA,'Programa de integração',{description:'Acompanhar entregas do fornecedor',due_date:day(-20)}),
  task(themeB,'Orçamento 2027'),
  task(plain,'Enviar relatório',{due_date:day(-3)}),
 ],
 torre_labels:[{id:radarLabel,user_id:uid,name:'Radar',description:'',color:'#2563eb',archived:false,area:'both'}],
 torre_task_labels:[
  {user_id:uid,task_id:themeA,label_id:radarLabel},
  {user_id:uid,task_id:themeB,label_id:radarLabel},
 ],
 torre_radar:[{task_id:themeA,user_id:uid,temperature:'critico',review_interval_days:7,next_review_date:day(-5),last_reviewed_at:null,notes:'Contexto inicial',updated_at:'2026-10-01T12:00:00Z'}],
 torre_people:[],torre_task_people:[],torre_captures:[],torre_attachments:[],torre_scheduled_blocks:[],torre_calendars:[],torre_calendar_events:[],torre_google_lists:[],torre_google_status:[],torre_work_hours:[],torre_preferences:[],torre_ai_settings:[],
};
const writes=[];
const errors=[];

const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'America/Sao_Paulo'});
await context.route('https://nvxwqrpztecrvrxoddxf.supabase.co/**',async route=>{
 const req=route.request();
 const url=new URL(req.url());
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'};
 const reply=(data,status=200)=>route.fulfill({status,headers,body:JSON.stringify(data)});
 if(req.method()==='OPTIONS')return reply({});
 if(url.pathname.startsWith('/auth/'))return reply(user);
 if(url.pathname.endsWith('/rpc/torre_save_task')){
  const body=req.postDataJSON();
  writes.push({rpc:'torre_save_task',body});
  const existing=tables.torre_tasks.find(row=>row.id===body.p_task);
  if(!existing)tables.torre_tasks.push(task(body.p_task,body.p_fields.title,{due_date:body.p_fields.due_date,priority:body.p_fields.priority,radar_task_id:body.p_fields.radar_task_id}));
  return reply(null);
 }
 if(url.pathname.includes('/rpc/'))return reply(null);
 const table=url.pathname.split('/').pop();
 const filters=[...url.searchParams].filter(([,value])=>value.startsWith('eq.'));
 const matches=row=>filters.every(([key,value])=>String(row[key])===value.slice(3));
 if(req.method()==='POST'){
  const raw=req.postDataJSON();
  const rows=Array.isArray(raw)?raw:[raw];
  writes.push({table,method:'POST',rows});
  for(const row of rows){
   const key=table==='torre_radar'?'task_id':'id';
   const defaults=table==='torre_radar'?{temperature:'observar',review_interval_days:15,last_reviewed_at:null,notes:''}:{};
   if(!tables[table].some(existing=>existing[key]===row[key]))tables[table].push({...defaults,...row});
  }
  return reply(rows);
 }
 if(req.method()==='PATCH'){
  const patch=req.postDataJSON();
  writes.push({table,method:'PATCH',patch,filters:Object.fromEntries(filters)});
  for(const row of tables[table].filter(matches))Object.assign(row,patch);
  return reply(null);
 }
 let data=(tables[table]??[]).filter(matches);
 if(table==='torre_tasks'&&url.searchParams.get('archived_at')==='is.null')data=data.filter(row=>!row.archived_at);
 if(req.headers().accept?.includes('object+json'))return reply(data[0]??null);
 return reply(data);
});
await context.addInitScript(({user,uid})=>{
 const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:uid,role:'authenticated',exp:4102444800}))+'.test';
 localStorage.setItem('sb-nvxwqrpztecrvrxoddxf-auth-token',JSON.stringify({access_token:token,refresh_token:'x',expires_at:4102444800,expires_in:3600,token_type:'bearer',user}));
},{user,uid});
const page=await context.newPage();
page.on('pageerror',error=>errors.push(error.message));

try{
 await page.goto(process.env.TORRE_TEST_URL??'http://127.0.0.1:5185/');
 await page.getByRole('button',{name:'Radar',exact:true}).click();
 await page.getByRole('heading',{name:'Radar',exact:true}).waitFor();

 // CA01: os dois temas aparecem; a tarefa comum não. O registro que faltava foi criado sem duplicar (RN12).
 await page.getByText('Orçamento 2027').waitFor();
 assert.equal(await page.getByText('Enviar relatório').count(),0);
 assert.equal(tables.torre_radar.length,2);
 assert.equal(tables.torre_radar.find(row=>row.task_id===themeB).review_interval_days??15,15);

 // CA05: revisão pendente aparece como "Revisão pendente", não como atraso.
 await page.getByText('Revisão pendente',{exact:true}).first().waitFor();
 assert.equal(await page.getByText(/atrasad/i).count(),0);

 // Filtros.
 await page.getByLabel('Temperatura',{exact:true}).selectOption('critico');
 assert.equal(await page.getByText('Orçamento 2027').count(),0);
 await page.getByLabel('Temperatura',{exact:true}).selectOption('todas');

 // CA02/CA03: salvar notas, mudar temperatura e periodicidade preserva o texto.
 await page.getByText('Programa de integração').click();
 const notes=page.getByLabel('Anotações e contexto atual');
 await notes.waitFor();
 assert.equal(await notes.inputValue(),'Contexto inicial');
 await notes.fill('Contexto atualizado em reunião');
 await page.getByRole('button',{name:'Salvar anotações'}).click();
 await page.getByText('Anotações salvas.').waitFor();
 assert.equal(tables.torre_radar.find(row=>row.task_id===themeA).notes,'Contexto atualizado em reunião');
 await page.getByRole('group',{name:'Temperatura'}).getByRole('button',{name:'Atenção'}).click();
 await page.getByRole('group',{name:'Periodicidade da revisão'}).getByRole('button',{name:'30 dias'}).click();
 await page.waitForFunction(()=>true);
 const recordA=tables.torre_radar.find(row=>row.task_id===themeA);
 assert.equal(recordA.temperature,'atencao');
 assert.equal(recordA.review_interval_days,30);
 assert.equal(recordA.notes,'Contexto atualizado em reunião');

 // CA04: revisar grava a data e agenda a próxima; nenhuma tarefa nasce.
 const tasksBefore=tables.torre_tasks.length;
 await page.getByRole('button',{name:'Revisado',exact:true}).click();
 await page.getByText(/Próxima revisão em/).waitFor();
 assert.ok(recordA.last_reviewed_at);
 assert.equal(recordA.next_review_date,day(30));
 assert.equal(tables.torre_tasks.length,tasksBefore);

 // CA06: tarefa vinculada, sem herdar a etiqueta, tema continua no Radar.
 await page.getByPlaceholder('O que precisa ser feito?').fill('Cobrar cronograma');
 await page.getByLabel('Vencimento da tarefa').fill(day(5));
 await page.getByRole('button',{name:'Criar tarefa',exact:true}).click();
 await page.getByRole('button',{name:/Cobrar cronograma/}).waitFor();
 const created=tables.torre_tasks.find(row=>row.title==='Cobrar cronograma');
 assert.equal(created.radar_task_id,themeA);
 assert.equal(tables.torre_task_labels.some(row=>row.task_id===created.id),false);

 // Mobile: sem rolagem horizontal.
 await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});
 await page.getByText('Orçamento 2027').waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 await page.screenshot({path:process.env.RADAR_SHOT_DIR?process.env.RADAR_SHOT_DIR+'/radar-390.png':undefined});
 await page.setViewportSize({width:1440,height:1000});

 // Encerrar tema: arquiva a tarefa-tema e preserva o registro do Radar (RN14).
 await page.getByText('Orçamento 2027').click();
 await page.getByRole('button',{name:'Encerrar tema'}).click();
 await page.getByRole('button',{name:'Encerrar',exact:true}).click();
 await page.waitForFunction(()=>!document.body.innerText.includes('Orçamento 2027'));
 assert.ok(tables.torre_tasks.find(row=>row.id===themeB).archived_at);
 assert.ok(tables.torre_radar.some(row=>row.task_id===themeB));

 // CA01/CA07: o tema com prazo antigo não vira "atrasada" em Meu dia.
 await page.getByRole('button',{name:'Meu dia',exact:true}).click();
 await page.getByText('Enviar relatório').waitFor();
 assert.equal(await page.getByText('Programa de integração').count(),0);

 assert.deepEqual(errors,[]);
 console.log('PASS: Radar lista temas, filtra, salva notas sem histórico, revisa, cria tarefa vinculada, encerra e mantém temas fora de Meu dia');
}finally{
 await browser.close();
 server?.kill();
}
