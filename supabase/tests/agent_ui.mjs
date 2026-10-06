import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const uid='a7ba7610-735e-4da5-a17f-104419acf001',task='a7ba7610-735e-4da5-a17f-104419acf002';
const user={id:uid,email:'test@example.com',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-06T00:00:00Z'};
const tables={torre_tasks:[{id:task,user_id:uid,title:'Pagar aluguel',description:'Conta mensal',area:'personal',duration_minutes:30,status:'todo',source:'torre',priority:'high',due_date:'2026-10-06',created_at:'2026-10-05T00:00:00Z'}],torre_preferences:[{user_id:uid,timezone:'America/Sao_Paulo',theme:'light'}],torre_work_hours:Array.from({length:7},(_,weekday)=>({weekday,user_id:uid,enabled:true,start_time:'09:00',end_time:'18:00'})),torre_ai_settings:[{user_id:uid,has_key:true,enabled:true}],torre_agent_runs:[],torre_scheduled_blocks:[],torre_task_labels:[],torre_labels:[],torre_captures:[],torre_attachments:[],torre_google_lists:[],torre_google_status:[],torre_calendars:[],torre_calendar_events:[]};
const calls=[],errors=[];let testFails=false;
const analysisResponse=`## Avaliação de hoje\n\n**Foco:** confira [Pagar aluguel](task:${task}): vence hoje.\n\n- **Prioridade:** high\n- status: waiting\n- ID: ${task}\n\n| Tarefa | priority | status | ID |\n| --- | --- | --- | --- |\n| [Pagar aluguel](task:${task}) | high | waiting | ${task} |\n\nProjeto high fidelity permanece com seu nome.\n\n[Link inseguro](javascript:alert(1))\n\n<script>window.markdownInjected=true</script>`;
const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'America/Sao_Paulo'});
await context.route('https://nvxwqrpztecrvrxoddxf.supabase.co/**',async route=>{
 const request=route.request(),url=new URL(request.url());const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'};
 if(request.method()==='OPTIONS')return route.fulfill({status:200,headers,body:'{}'});
 if(url.pathname.startsWith('/auth/'))return route.fulfill({status:200,headers,body:JSON.stringify(user)});
 if(url.pathname.includes('/functions/')){
  const input=request.postDataJSON();calls.push(input);let run=tables.torre_agent_runs.find(r=>r.id===input.runId);
  if(input.action==='agent-test')return route.fulfill({status:testFails?400:200,headers,body:JSON.stringify(testFails?{error:'A política de dados da conta bloqueou os provedores gratuitos. Nenhuma alteração foi realizada.'}:{ok:true,model:'test/model:free'})});
  if(input.action==='agent-chat'){
   run={id:input.runId,message:input.message,mode:input.mode,state:input.mode==='analyze'?'answered':input.message.includes('Arquive')?'ready':'applied',response:input.mode==='analyze'?analysisResponse:'Pedido para alterar as tarefas.',model:'test/model:free',error:null,operations:input.mode==='analyze'?[]:[{entity:'task',id:task,title:'Pagar aluguel',before:{},patch:input.message.includes('Arquive')?{archived_at:'2026-10-06T12:00:00Z'}:{priority:'medium'}}],created_at:new Date().toISOString()};tables.torre_agent_runs.push(run);
  }else if(input.action==='agent-apply')run.state='applied';else if(input.action==='agent-undo')run.state='undone';else throw new Error('Unexpected action');
  return route.fulfill({status:200,headers,body:JSON.stringify({run})});
 }
 if(url.pathname.includes('/rpc/'))return route.fulfill({status:200,headers,body:'null'});
 const table=url.pathname.split('/').pop();if(!(table in tables))throw new Error('Unexpected table '+table);
 const data=table==='torre_agent_runs'?[...tables[table]].reverse():tables[table];
 return route.fulfill({status:200,headers,body:JSON.stringify(data)});
});
await context.addInitScript(({user,uid})=>{const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:uid,role:'authenticated',exp:4102444800}))+'.test';localStorage.setItem('sb-nvxwqrpztecrvrxoddxf-auth-token',JSON.stringify({access_token:token,refresh_token:'test',token_type:'bearer',expires_at:4102444800,expires_in:3600,user}));localStorage.setItem(`torre:${uid}:page`,JSON.stringify('Modo IA'));},{user,uid});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.TORRE_TEST_URL??'http://127.0.0.1:5182/');
 await page.getByRole('heading',{name:'Suas tarefas, em conversa'}).waitFor();
 await page.getByLabel('Seu pedido').fill('O que merece atenção hoje?');await page.getByRole('button',{name:'Enviar',exact:true}).click();
 await page.getByRole('button',{name:'Pagar aluguel',exact:true}).first().waitFor();assert.equal(calls[0].mode,'analyze');
 await page.getByRole('heading',{name:'Avaliação de hoje'}).waitFor();assert.equal(await page.locator('.agent-response strong').first().textContent(),'Foco:');
 assert.deepEqual(await page.locator('.agent-response th').allTextContents(),['Tarefa','Prioridade','Situação']);assert.deepEqual(await page.locator('.agent-response td').allTextContents(),['Pagar aluguel','Alta','Aguardando']);
 const responseText=await page.locator('.agent-response').textContent();assert.equal(responseText.includes(task),false);assert.equal(responseText.includes('ID:'),false);assert.equal(responseText.includes('Prioridade: Alta'),true);assert.equal(responseText.includes('Situação: Aguardando'),true);assert.equal(responseText.includes('Projeto high fidelity permanece com seu nome.'),true);
 assert.equal(await page.locator('.agent-response a[href^="javascript:"]').count(),0);assert.equal(await page.locator('.agent-response script').count(),0);
 await page.getByRole('button',{name:'Pagar aluguel',exact:true}).first().click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
 await page.getByRole('combobox',{name:'Modo da IA'}).selectOption('execute');await page.getByLabel('Seu pedido').fill('Mude a prioridade para média');await page.getByRole('button',{name:'Enviar',exact:true}).click();
 await page.getByText('Pedido aplicado: 1 registro(s).',{exact:true}).waitFor();assert.equal(calls[1].mode,'execute');
 await page.getByRole('button',{name:'Desfazer pedido'}).click();await page.getByText('Pedido desfeito.',{exact:true}).waitFor();assert.equal(calls[2].action,'agent-undo');
 await page.getByLabel('Seu pedido').fill('Arquive essas duas tarefas');await page.getByRole('button',{name:'Enviar',exact:true}).click();await page.getByRole('button',{name:'Aplicar pedido'}).waitFor();
 assert.equal(calls.some(c=>c.action==='agent-apply'),false);
 await page.screenshot({path:'.db-validation/agent-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Aplicar pedido'}).click();await page.getByText('Pedido aplicado: 1 registro(s).',{exact:true}).waitFor();
 await page.reload();await page.getByText('Pedido desfeito.',{exact:true}).waitFor();assert.equal(calls.length,5);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.db-validation/agent-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'Mobile horizontal overflow');
 await page.evaluate(()=>{document.documentElement.dataset.theme='dark';window.scrollTo(0,0);});await page.screenshot({path:'.db-validation/agent-dark.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'Configurações',exact:true}).click();await page.getByRole('button',{name:'IA',exact:true}).click();
 const runsBefore=tables.torre_agent_runs.length,tasksBefore=JSON.stringify(tables.torre_tasks);
 await page.getByRole('button',{name:'Testar agente gratuito'}).click();await page.getByText('Modelo gratuito validado: test/model:free. Nenhum registro foi criado.',{exact:true}).waitFor();
 testFails=true;await page.getByRole('button',{name:'Testar agente gratuito'}).click();await page.getByRole('alert').filter({hasText:'A política de dados da conta'}).waitFor();
 assert.equal(tables.torre_agent_runs.length,runsBefore);assert.equal(JSON.stringify(tables.torre_tasks),tasksBefore);assert.equal(tables.torre_labels.length,0);assert.equal(calls.length,7);
 await page.screenshot({path:'.db-validation/agent-settings-test.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: agent analysis, task reference, execute, undo, batch review, history, mobile and synthetic test success/error without writes');
}finally{await browser.close();}
