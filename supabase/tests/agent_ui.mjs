import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const uid='a7ba7610-735e-4da5-a17f-104419acf001',task='a7ba7610-735e-4da5-a17f-104419acf002';
const user={id:uid,email:'test@example.com',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-06T00:00:00Z'};
const tables={torre_tasks:[{id:task,user_id:uid,title:'Pagar aluguel',description:'Conta mensal',area:'personal',duration_minutes:30,status:'todo',source:'torre',priority:'high',due_date:'2026-10-06',created_at:'2026-10-05T00:00:00Z'}],torre_preferences:[{user_id:uid,timezone:'America/Sao_Paulo',theme:'light'}],torre_work_hours:Array.from({length:7},(_,weekday)=>({weekday,user_id:uid,enabled:true,start_time:'09:00',end_time:'18:00'})),torre_ai_settings:[{user_id:uid,has_key:true,enabled:true}],torre_agent_runs:[],torre_scheduled_blocks:[],torre_task_labels:[],torre_labels:[],torre_captures:[],torre_attachments:[],torre_google_lists:[],torre_google_status:[],torre_calendars:[],torre_calendar_events:[]};
const calls=[],errors=[];let testFails=false;
const analysisResponse=`## Avaliação de hoje\n\n**Foco:** confira [Pagar aluguel](task:${task}): vence hoje.\n\n- **Prioridade:** high\n- status: waiting\n- ID: ${task}\n\n| Tarefa | priority | status | ID |\n| --- | --- | --- | --- |\n| [Pagar aluguel](task:${task}) | high | waiting | ${task} |\n\nProjeto high fidelity permanece com seu nome.\n\nPriorize a tarefa ${task.slice(0,8)} com prioridade “high”.\n\nSituação **“waiting”**, área="professional".\n\n[Link inseguro](javascript:alert(1))\n\n<script>window.markdownInjected=true</script>`;
const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'America/Sao_Paulo'});
await context.route('https://nvxwqrpztecrvrxoddxf.supabase.co/**',async route=>{
 const request=route.request(),url=new URL(request.url());const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'};
 if(request.method()==='OPTIONS')return route.fulfill({status:200,headers,body:'{}'});
 if(url.pathname.startsWith('/auth/'))return route.fulfill({status:200,headers,body:JSON.stringify(user)});
 if(url.pathname.includes('/functions/')){
  const input=request.postDataJSON();calls.push(input);let run=tables.torre_agent_runs.find(r=>r.id===input.runId);
  if(input.action==='agent-test')return route.fulfill({status:testFails?400:200,headers,body:JSON.stringify(testFails?{error:'A política de dados da conta bloqueou os provedores gratuitos. Nenhuma alteração foi realizada.'}:{ok:true,model:'test/model:free'})});
  if(input.action==='agent-chat'&&input.message==='Pedido de teste Gemini'){
   if(!run){run={id:input.runId,conversation_id:input.conversationId??null,message:input.message,mode:input.mode,requested_model:input.model,state:'error',response:'',model:null,error:'Saldo insuficiente no OpenRouter.',operations:[],created_at:new Date().toISOString()};tables.torre_agent_runs.push(run);}else{run.state='answered';run.error=null;run.response='Gemini respondeu ao pedido.';run.model=input.model;}
   return route.fulfill({status:200,headers,body:JSON.stringify({run})});
  }
  if(input.action==='agent-chat'){
   run={id:input.runId,conversation_id:input.conversationId??null,message:input.message,mode:input.mode,requested_model:input.model,state:input.mode==='analyze'?'answered':input.message.includes('Arquive')?'ready':'applied',response:input.mode==='analyze'?analysisResponse:'Pedido para alterar as tarefas.',model:'test/model:free',error:null,operations:input.mode==='analyze'?[]:[{entity:'task',id:task,title:'Pagar aluguel',before:{},patch:input.message.includes('Arquive')?{archived_at:'2026-10-06T12:00:00Z'}:{priority:'medium'}}],created_at:new Date().toISOString()};tables.torre_agent_runs.push(run);
  }else if(input.action==='agent-apply')run.state='applied';else if(input.action==='agent-undo')run.state='undone';else throw new Error('Unexpected action');
  return route.fulfill({status:200,headers,body:JSON.stringify({run})});
 }
 if(url.pathname.endsWith('/rpc/torre_agent_conversations')){
  const {p_offset=0,p_query=''}=request.postDataJSON();const groups=new Map();
  for(const r of tables.torre_agent_runs){const key=r.conversation_id??'legacy';let c=groups.get(key);if(!c){c={conversation_id:r.conversation_id??null,title:key==='legacy'?'Histórico anterior':r.message.slice(0,90),updated_at:r.created_at,run_count:0};groups.set(key,c);}c.run_count++;c.updated_at=r.created_at;}
  const data=[...groups.values()].filter(c=>c.title.toLowerCase().includes(p_query.toLowerCase())).reverse().slice(p_offset,p_offset+50);
  return route.fulfill({status:200,headers,body:JSON.stringify(data)});
 }
 if(url.pathname.includes('/rpc/'))return route.fulfill({status:200,headers,body:'null'});
 const table=url.pathname.split('/').pop();if(!(table in tables))throw new Error('Unexpected table '+table);
 let data=tables[table];if(table==='torre_agent_runs'){const filter=url.searchParams.get('conversation_id');data=[...data].filter(r=>filter==='is.null'?r.conversation_id==null:filter?.startsWith('eq.')?r.conversation_id===filter.slice(3):true).reverse();const offset=Number(url.searchParams.get('offset')??0),limit=Number(url.searchParams.get('limit')??30);data=data.slice(offset,offset+limit);}
 return route.fulfill({status:200,headers,body:JSON.stringify(data)});
});
await context.addInitScript(({user,uid})=>{const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:uid,role:'authenticated',exp:4102444800}))+'.test';localStorage.setItem('sb-nvxwqrpztecrvrxoddxf-auth-token',JSON.stringify({access_token:token,refresh_token:'test',token_type:'bearer',expires_at:4102444800,expires_in:3600,user}));localStorage.setItem(`torre:${uid}:page`,JSON.stringify('Modo IA'));},{user,uid});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.TORRE_TEST_URL??'http://127.0.0.1:5182/');
 await page.getByRole('heading',{name:'Suas tarefas, em conversa'}).waitFor();
 assert.equal(await page.getByRole('combobox',{name:'Modelo da IA'}).inputValue(),'openrouter/free');
 await page.getByLabel('Seu pedido').fill('O que merece atenção hoje?');await page.getByRole('button',{name:'Enviar',exact:true}).click();
 await page.getByRole('button',{name:'Pagar aluguel',exact:true}).first().waitFor();assert.equal(calls[0].mode,'analyze');assert.equal(calls[0].model,'openrouter/free');
 await page.getByRole('heading',{name:'Avaliação de hoje'}).waitFor();assert.equal(await page.locator('.agent-response strong').first().textContent(),'Foco:');
 assert.deepEqual(await page.locator('.agent-response th').allTextContents(),['Tarefa','Prioridade','Situação']);assert.deepEqual(await page.locator('.agent-response td').allTextContents(),['Pagar aluguel','Alta','Aguardando']);
 const responseText=await page.locator('.agent-response').textContent();assert.equal(responseText.includes(task),false);assert.equal(responseText.includes('ID:'),false);assert.equal(responseText.includes('Prioridade: Alta'),true);assert.equal(responseText.includes('Situação: Aguardando'),true);assert.equal(responseText.includes('Projeto high fidelity permanece com seu nome.'),true);
 assert.equal(responseText.includes(task.slice(0,8)),false);assert.equal(responseText.includes('Priorize a tarefa Pagar aluguel com prioridade Alta.'),true);assert.equal(responseText.includes('Situação Aguardando, área=Profissional.'),true);
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
 await page.getByRole('combobox',{name:'Modelo da IA'}).selectOption('google/gemini-2.5-flash');await page.getByText(/Gemini usa a mesma chave OpenRouter e cobra por tokens/).waitFor();assert.equal(calls.length,5,'Selecting paid must not call provider');
 await page.reload();await page.getByText('Pedido desfeito.',{exact:true}).waitFor();assert.equal(await page.getByRole('combobox',{name:'Modelo da IA'}).inputValue(),'google/gemini-2.5-flash');
 await page.screenshot({path:'.db-validation/agent-model-paid.png',fullPage:true});
 await page.getByRole('combobox',{name:'Modo da IA'}).selectOption('analyze');await page.getByLabel('Seu pedido').fill('Pedido de teste Gemini');await page.getByRole('button',{name:'Enviar',exact:true}).click();await page.getByRole('alert').filter({hasText:'Saldo insuficiente'}).waitFor();assert.equal(calls[5].model,'google/gemini-2.5-flash');
 await page.getByRole('combobox',{name:'Modelo da IA'}).selectOption('openrouter/free');await page.getByRole('button',{name:'Tentar novamente este pedido'}).click();await page.getByText('Gemini respondeu ao pedido.',{exact:true}).waitFor();assert.equal(calls[6].model,'google/gemini-2.5-flash');assert.equal(calls[6].runId,calls[5].runId,'Retry uses original model and id');
 const firstConversation=calls[0].conversationId;
 assert.ok(firstConversation);assert.equal(calls[6].conversationId,firstConversation,'Retry preserves conversation');
 assert.equal(await page.locator('.agent-conversations').count(),0,'History starts collapsed');
 assert.equal(await page.locator('.app-shell').evaluate(e=>e.classList.contains('menu-compact')),true);
 await page.getByRole('button',{name:'Expandir menu principal',exact:true}).click();assert.equal(await page.locator('.app-shell').evaluate(e=>e.classList.contains('menu-compact')),false);
 await page.getByRole('button',{name:'Recolher menu principal',exact:true}).click();
 const composerBox=await page.locator('.agent-composer').boundingBox();assert.ok(composerBox.y+composerBox.height<=1001,'Composer stays in viewport');
 await page.getByRole('button',{name:'Nova conversa',exact:true}).click();await page.getByRole('heading',{name:'Suas tarefas, em conversa'}).waitFor();
 assert.equal(await page.locator('.agent-turn').count(),0);assert.equal(calls.length,7,'New conversation does not call provider');
 await page.getByLabel('Seu pedido').fill('Conversa separada');await page.getByLabel('Seu pedido').press('Shift+Enter');assert.equal(calls.length,7,'Shift Enter keeps draft');
 await page.getByLabel('Seu pedido').press('Enter');await page.getByRole('heading',{name:'Avaliação de hoje'}).waitFor();assert.notEqual(calls[7].conversationId,firstConversation);
 assert.equal(await page.locator('.agent-turn').count(),1,'Only selected conversation renders');
 await page.reload();await page.getByRole('heading',{name:'Avaliação de hoje'}).waitFor();assert.equal(await page.locator('.agent-turn').count(),1,'Conversation survives reload');
 assert.equal(await page.locator('.agent-conversations').count(),0,'Reload starts history collapsed');
 await page.getByRole('button',{name:'Conversas',exact:true}).click();await page.getByLabel('Buscar conversa').fill('O que merece');
 await page.getByRole('button',{name:/O que merece atenção hoje/}).waitFor();
 await page.getByRole('button',{name:/O que merece atenção hoje/}).click();await page.getByText('Gemini respondeu ao pedido.',{exact:true}).waitFor();
 assert.equal(await page.locator('.agent-turn').count(),4,'Old conversation intact');
 await page.getByRole('button',{name:'Conversas',exact:true}).click();await page.getByRole('button',{name:'Recolher conversas',exact:true}).waitFor();
 await page.screenshot({path:'.db-validation/agent-history-open.png',fullPage:true});await page.keyboard.press('Escape');
 await page.screenshot({path:'.db-validation/agent-history-collapsed.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.db-validation/agent-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'Mobile horizontal overflow');
 const mobileComposer=await page.locator('.agent-composer').boundingBox();assert.ok(mobileComposer.y+mobileComposer.height<=845,'Mobile composer visible');
 await page.getByRole('button',{name:'Conversas',exact:true}).click();await page.getByLabel('Buscar conversa').waitFor();await page.keyboard.press('Escape');
 assert.equal(await page.locator('.agent-conversations').count(),0);
 await page.evaluate(()=>{document.documentElement.dataset.theme='dark';window.scrollTo(0,0);});await page.screenshot({path:'.db-validation/agent-dark.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'Configurações',exact:true}).click();await page.getByRole('button',{name:'IA',exact:true}).click();
 const runsBefore=tables.torre_agent_runs.length,tasksBefore=JSON.stringify(tables.torre_tasks);
 await page.getByRole('button',{name:'Testar agente gratuito'}).click();await page.getByText('Modelo gratuito validado: test/model:free. Nenhum registro foi criado.',{exact:true}).waitFor();
 testFails=true;await page.getByRole('button',{name:'Testar agente gratuito'}).click();await page.getByRole('alert').filter({hasText:'A política de dados da conta'}).waitFor();
 assert.equal(tables.torre_agent_runs.length,runsBefore);assert.equal(JSON.stringify(tables.torre_tasks),tasksBefore);assert.equal(tables.torre_labels.length,0);assert.equal(calls.length,10);
 await page.screenshot({path:'.db-validation/agent-settings-test.png',fullPage:true});
 const visualId=crypto.randomUUID();tables.torre_agent_runs.push({id:crypto.randomUUID(),conversation_id:visualId,message:'Quais tarefas precisam de atenção?',mode:'analyze',requested_model:'google/gemini-2.5-flash',state:'answered',response:'## Estas são suas prioridades\n\nEncontrei 3 tarefas que merecem atenção agora.\n\n| Tarefa | Prioridade | Status |\n| --- | --- | --- |\n| Revisar proposta | Alta | A fazer |\n| Retornar ao cliente | Alta | Aguardando |\n| Concluir relatório | Média | Em andamento |\n\n### Por onde começar\n\nComece pela proposta e depois confira o retorno do cliente.',model:'google/gemini-2.5-flash',error:null,operations:[],created_at:new Date().toISOString()});
 await page.evaluate(({uid,visualId})=>{localStorage.setItem(`torre:${uid}:page`,JSON.stringify('Modo IA'));localStorage.setItem(`torre:${uid}:agent-conversation`,visualId);localStorage.setItem(`torre:${uid}:agent-model`,'google/gemini-2.5-flash');},{uid,visualId});
 await page.reload();await page.getByRole('heading',{name:'Estas são suas prioridades'}).waitFor();await page.locator('.agent-history').evaluate(e=>e.scrollTop=0);
 await page.screenshot({path:'.db-validation/agent-qa-collapsed.png'});
 await page.getByRole('button',{name:'Conversas',exact:true}).click();await page.getByLabel('Buscar conversa').waitFor();await page.screenshot({path:'.db-validation/agent-qa-open.png'});await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);console.log('PASS: Markdown, analysis/CRUD/undo, free default, paid selector, persisted choice, original model and conversation on retry, separate conversations, search, collapsed menu/history, anchored composer, mobile and synthetic test without writes');
}finally{await browser.close();}
