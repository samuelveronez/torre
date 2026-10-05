// Run with Vite on port 5181. All Supabase traffic is mocked; no real account is used.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const modulePath=process.env.PLAYWRIGHT_MODULE;
const {chromium}=await import(modulePath?pathToFileURL(modulePath).href:'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const userId='a7ba7610-735e-4da5-a17f-104419acd001';
const taskIds=[3,4,5].map(n=>`a7ba7610-735e-4da5-a17f-104419acd00${n}`);
const user={id:userId,email:'test@example.com',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-05T00:00:00Z'};
const tables={
 torre_tasks:taskIds.map((id,i)=>({id,user_id:userId,title:['Tarefa para reservar','Segunda tarefa','Reserva existente'][i],area:'professional',duration_minutes:30,status:'todo',source:'torre',due_date:'2099-01-05',created_at:'2026-10-05T00:00:00Z',capture_position:0})),
 torre_scheduled_blocks:[{id:'block',user_id:userId,task_id:taskIds[2],start_at:'2099-01-05T13:15:00Z',end_at:'2099-01-05T13:45:00Z'}],
 torre_preferences:[{user_id:userId,timezone:'America/Sao_Paulo',theme:'light'}],
 torre_work_hours:Array.from({length:7},(_,weekday)=>({weekday,user_id:userId,enabled:true,start_time:'09:00',end_time:'18:00'})),
 torre_calendars:[{id:'calendar',name:'Trabalho',user_id:userId,selected:true,color:'#1673d1',mode:'details',access_role:'owner',blocks_time:true}],
 torre_calendar_events:['accepted','tentative','needsAction','declined'].map((response_status,i)=>({id:response_status,calendar_id:'calendar',title:['Reunião aceita','Convite talvez','Convite sem resposta','Convite recusado'][i],start_at:'2099-01-05T13:00:00Z',end_at:'2099-01-05T14:00:00Z',all_day:false,blocks_time:response_status!=='declined',response_status})).concat([{id:'all',calendar_id:'calendar',title:'Evento de dia inteiro',start_at:'2099-01-05T03:00:00Z',end_at:'2099-01-06T03:00:00Z',all_day:true,blocks_time:false,response_status:null},{id:'early',calendar_id:'calendar',title:'Reunião às seis',start_at:'2099-01-05T09:00:00Z',end_at:'2099-01-05T09:30:00Z',all_day:false,blocks_time:true,response_status:'accepted'}]),
 torre_google_status:[{user_id:userId,email:user.email,connected:true,calendar_synced_at:null,range_start:null,range_end:null,error:null}],
 torre_ai_settings:[],torre_task_labels:[],torre_labels:[],torre_captures:[],torre_attachments:[],torre_google_lists:[]
};
const writes=[],errors=[];
for(const rows of Object.values(tables))for(const row of rows)row.user_id??=userId;
const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'America/Sao_Paulo'});
await context.route('https://nvxwqrpztecrvrxoddxf.supabase.co/**',async route=>{
 const request=route.request(),url=new URL(request.url()),method=request.method();
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'};
 if(method==='OPTIONS')return route.fulfill({status:200,headers,body:'{}'});
 if(url.pathname.startsWith('/auth/'))return route.fulfill({status:200,headers,body:JSON.stringify(user)});
 if(url.pathname.includes('/functions/'))return route.fulfill({status:200,headers,body:'{"ok":true}'});
 if(url.pathname.includes('/rpc/'))return route.fulfill({status:200,headers,body:'null'});
 const table=url.pathname.split('/').pop();
 if(!(table in tables))throw new Error('Unexpected API '+url.pathname);
 let rows=tables[table];
 for(const [key,value] of url.searchParams){if(value.startsWith('eq.'))rows=rows.filter(row=>String(row[key])===value.slice(3));}
 if(method==='POST'||method==='PATCH'){
  const payload=request.postDataJSON();writes.push({table,method,payload});
  if(method==='PATCH')rows.forEach(row=>Object.assign(row,payload));
  else for(const row of Array.isArray(payload)?payload:[payload]){const old=tables[table].find(x=>x.id===row.id&&row.id);if(old)Object.assign(old,row);else tables[table].push(row);}
 }
 await route.fulfill({status:200,headers,body:JSON.stringify(rows)});
});
await context.addInitScript(({user,userId})=>{
 const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:userId,role:'authenticated',exp:4102444800}))+'.test';
 localStorage.setItem('sb-nvxwqrpztecrvrxoddxf-auth-token',JSON.stringify({access_token:token,refresh_token:'test',token_type:'bearer',expires_at:4102444800,expires_in:3600,user}));
 localStorage.setItem(`torre:${userId}:page`,JSON.stringify('Home'));
},{user,userId});
const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
try {
 await page.goto(process.env.TORRE_TEST_URL??'http://127.0.0.1:5181/');
 await page.getByLabel('Data de Meu dia').fill('2099-01-05');
 await page.getByRole('button',{name:/^Reunião aceita ·/}).waitFor();
 assert.equal(await page.locator('.agenda-card').count(),4);
 assert.equal(await page.locator('.agenda-card.response-declined').count(),0);
 assert(await page.getByText('Evento de dia inteiro',{exact:false}).isVisible());
 assert(await page.getByText('Reunião às seis',{exact:false}).isVisible());
 const boxes=await page.locator('.agenda-card').evaluateAll(cards=>cards.map(card=>{const r=card.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom,height:r.height};}));
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(a.y<b.bottom&&a.bottom>b.y)assert(a.right<=b.x||b.right<=a.x,'Cards hide each other');}
 assert.equal(boxes.filter(b=>b.height===48).length,3);
 await page.getByRole('button',{name:/^Reunião aceita ·/}).click();
 await page.getByRole('dialog',{name:'Compromisso Google'}).waitFor();
 assert(await page.getByText('Resposta: Aceito').isVisible());
 await page.keyboard.press('Escape');
 await page.getByLabel('Mostrar recusados').check();assert.equal(await page.locator('.agenda-card.response-declined').count(),1);
 await page.getByLabel('Mostrar recusados').uncheck();
 await page.getByRole('button',{name:'Reservar Tarefa para reservar',exact:true}).click();
 const form=page.getByRole('dialog').filter({hasText:'Reservar um horário'});
 await form.getByLabel('Horário',{exact:true}).fill('10:15');
 assert(await form.getByText(/Sobrepõe Reunião aceita/).isVisible());
 assert(await form.getByText(/A reserva manual continua disponível/).isVisible());
 await form.getByRole('button',{name:'Reservar horário',exact:true}).click();
 await form.waitFor({state:'hidden'});
 assert(writes.some(w=>w.table==='torre_scheduled_blocks'&&w.payload.task_id===taskIds[0]&&w.payload.start_at==='2099-01-05T13:15:00.000Z'));
 // Selecting a task then clicking an occupied card reserves without a dialog.
 await page.getByRole('button',{name:'Escolher tarefas',exact:true}).click();
 await page.locator('.day-choice').getByRole('button',{name:'Reservar Segunda tarefa',exact:true}).click();
 await page.getByRole('button',{name:/^Reservar sobre Reunião aceita/}).click({position:{x:10,y:18}});
 await page.getByRole('button',{name:/^Segunda tarefa · 10:15/}).waitFor();
 assert.equal(tables.torre_scheduled_blocks.length,3);
 // Dragging an existing reservation onto a meeting also changes its time.
 await page.locator(`.task-row[data-task-id="${taskIds[0]}"]`).dragTo(page.locator('.agenda-card.response-accepted'),{targetPosition:{x:10,y:30}});
 await page.getByRole('button',{name:/^Tarefa para reservar · 10:30/}).waitFor();
 assert.equal(tables.torre_scheduled_blocks.find(b=>b.task_id===taskIds[0]).start_at,'2099-01-05T13:30:00.000Z');
 await page.getByRole('button',{name:'Atualizar',exact:true}).click();
 await page.locator('.cloud-workspace:disabled').waitFor({state:'hidden'});
 assert.equal(tables.torre_scheduled_blocks.length,3);
 await page.reload();await page.getByLabel('Data de Meu dia').fill('2099-01-05');
 await page.getByRole('button',{name:/^Tarefa para reservar · 10:30/}).waitFor();
 await page.screenshot({path:'.db-validation/agenda-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Agenda',exact:true}).click();
 assert(await page.getByRole('button',{name:/^Reunião aceita ·/}).isVisible());
 await page.getByRole('button',{name:/^Convite talvez ·/}).click();
 assert(await page.getByText('Resposta: Talvez').isVisible());await page.keyboard.press('Escape');
 await page.screenshot({path:'.db-validation/agenda-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:'Agenda semanal',exact:true}).first().click();
 await page.locator('.day-column .agenda-card').first().waitFor();
 assert.equal(await page.locator('.grid>.all-day-events').count(),7);
 assert.equal(await page.locator('.day-column .agenda-card.response-declined').count(),0);
 await page.getByLabel('Mostrar recusados').check();assert.equal(await page.locator('.day-column .agenda-card.response-declined').count(),1);
 await page.screenshot({path:'.db-validation/agenda-week.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS: full app, columns, RSVP, declined toggle, all-day and outside-hours events, stale manual reservation, occupied-card click, drag onto meeting, persistence after reload, mobile dialogs and weekly agenda.');
} catch(error){console.error((await page.locator('body').innerText()).slice(-3000));console.error('Browser errors:',errors);throw error;} finally {await browser.close();}
