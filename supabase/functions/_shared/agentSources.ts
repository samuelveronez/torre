import {agentId} from './agent.ts';
import {conversationToday,validDate} from './conversationModel.ts';

// Consultas somente leitura do Modo IA sobre o Radar e as Conversas.
// Todas filtram por user_id; o banco (RLS) não é a única barreira, porque a Edge Function usa service_role.

type Db=any;
type Checked=(value:any)=>Promise<any>;
type Source={db:Db;checked:Checked;uid:string;themeIds:(db:Db,uid:string)=>Promise<string[]>};

const TEMPERATURES=['observar','atencao','critico'];
const CONVERSATION_PAGE=10;
const RADAR_PAGE=20;
const DEFAULT_WINDOW_DAYS=60;
const CHUNK=150;

function offsetOf(args:any){
 const offset=args.offset??0;
 if(!Number.isInteger(offset)||offset<0||offset>10000)throw new Error('Página inválida.');
 return offset;
}
function textFilter(args:any){
 if(args.query===undefined)return '';
 if(typeof args.query!=='string'||args.query.length>180)throw new Error('Busca inválida.');
 return args.query.trim().toLocaleLowerCase('pt-BR');
}
function cut(value:unknown,max:number){
 const text=typeof value==='string'?value:'';
 return {text:text.slice(0,max),truncated:text.length>max};
}
function matches(needle:string,...fields:unknown[]){
 return !needle||fields.some(field=>typeof field==='string'&&field.toLocaleLowerCase('pt-BR').includes(needle));
}
function daysBefore(day:string,days:number){
 return new Date(Date.parse(day+'T12:00:00Z')-days*86400000).toISOString().slice(0,10);
}
async function inChunks<T>(ids:string[],load:(chunk:string[])=>Promise<T[]>){
 const rows:T[]=[];
 for(let i=0;i<ids.length;i+=CHUNK)rows.push(...await load(ids.slice(i,i+CHUNK)));
 return rows;
}

async function radarRecords({db,checked,uid,themeIds}:Source){
 const ids=new Set(await themeIds(db,uid));
 if(!ids.size)return [];
 const {data}=await checked(db.from('torre_radar').select('*').eq('user_id',uid).limit(5000));
 return (data??[]).filter((row:any)=>ids.has(row.task_id));
}

export async function queryRadar(source:Source,args:any={}){
 const {db,checked,uid}=source;
 if(!args||typeof args!=='object'||Array.isArray(args))throw new Error('Consulta inválida.');
 const offset=offsetOf(args),needle=textFilter(args),today=conversationToday();
 if(args.temperature!==undefined&&!TEMPERATURES.includes(args.temperature))throw new Error('Temperatura inválida.');
 if(args.task_id!==undefined&&!agentId(args.task_id))throw new Error('Tema inválido.');
 let records=await radarRecords(source);
 if(args.task_id)records=records.filter((r:any)=>r.task_id===args.task_id);
 if(args.temperature)records=records.filter((r:any)=>r.temperature===args.temperature);
 if(args.pending_review)records=records.filter((r:any)=>!r.next_review_date||r.next_review_date<=today);
 const taskRows=await inChunks<any>(records.map((r:any)=>r.task_id),async chunk=>{
  const {data}=await checked(db.from('torre_tasks').select('id,title,description,area,status,waiting_for').eq('user_id',uid).in('id',chunk));
  return data??[];
 });
 const tasks=new Map(taskRows.map((t:any)=>[t.id,t]));
 const found=records
  .filter((r:any)=>tasks.has(r.task_id)&&matches(needle,tasks.get(r.task_id).title,tasks.get(r.task_id).description,r.notes))
  .sort((a:any,b:any)=>(b.temperature==='critico'?2:b.temperature==='atencao'?1:0)-(a.temperature==='critico'?2:a.temperature==='atencao'?1:0)||String(a.next_review_date??'').localeCompare(String(b.next_review_date??''))||a.task_id.localeCompare(b.task_id));
 const page=found.slice(offset,offset+RADAR_PAGE);
 const pageIds=page.map((r:any)=>r.task_id);
 const [actions,people]=pageIds.length?await Promise.all([
  checked(db.from('torre_tasks').select('id,title,status,due_date,radar_task_id').eq('user_id',uid).in('radar_task_id',pageIds).is('archived_at',null).limit(500)),
  checked(db.from('torre_task_people').select('task_id,name,role').eq('user_id',uid).in('task_id',pageIds).limit(500))
 ]):[{data:[]},{data:[]}];
 const items=page.map((r:any)=>{
  const task=tasks.get(r.task_id),description=cut(task.description,2000),notes=cut(r.notes,4000);
  return {
   id:task.id,title:task.title,description:description.text,descriptionTruncated:description.truncated,
   temperature:r.temperature,review_interval_days:r.review_interval_days,
   next_review_date:r.next_review_date,last_reviewed_at:r.last_reviewed_at,
   pending_review:!r.next_review_date||r.next_review_date<=today,
   notes:notes.text,notesTruncated:notes.truncated,area:task.area,
   people:(people.data??[]).filter((p:any)=>p.task_id===task.id).map((p:any)=>({name:p.name,role:p.role})),
   actions:(actions.data??[]).filter((a:any)=>a.radar_task_id===task.id).slice(0,20).map((a:any)=>({id:a.id,title:a.title,status:a.status,due_date:a.due_date}))
  };
 });
 return {items,total:found.length,offset,hasMore:offset+items.length<found.length};
}

function agreementView(agreement:any){
 return {
  title:String(agreement?.title??'').slice(0,180),owner:agreement?.owner,person:agreement?.person??'',
  due:agreement?.due??'',follow_up:agreement?.followUp??'',task_id:agreement?.taskId??null
 };
}

export async function queryConversations({db,checked,uid}:Source,args:any={}){
 if(!args||typeof args!=='object'||Array.isArray(args))throw new Error('Consulta inválida.');
 const offset=offsetOf(args),needle=textFilter(args),today=conversationToday();
 const detail=args.conversation_id;
 if(detail!==undefined&&!agentId(detail))throw new Error('Conversa inválida.');
 for(const key of ['from','to'])if(args[key]!==undefined&&!validDate(args[key]))throw new Error('Data inválida.');
 if(args.person_id!==undefined&&!agentId(args.person_id))throw new Error('Pessoa inválida.');
 if(args.person!==undefined&&(typeof args.person!=='string'||args.person.length>180))throw new Error('Pessoa inválida.');
 const {data:peopleRows}=await checked(db.from('torre_people').select('id,name').eq('user_id',uid).order('name').limit(1000));
 const people=new Map<string,string>((peopleRows??[]).map((p:any)=>[p.id,p.name]));
 const personNeedle=(args.person??'').trim().toLocaleLowerCase('pt-BR');
 const personIds=(peopleRows??[]).filter((p:any)=>(!args.person_id||p.id===args.person_id)&&(!personNeedle||p.name.toLocaleLowerCase('pt-BR').includes(personNeedle))).map((p:any)=>p.id);
 const from=args.from??(detail||args.person_id||personNeedle?undefined:daysBefore(today,DEFAULT_WINDOW_DAYS));
 const columns='id,person_id,conversation_date,check_in,decisions,agreements'+(needle||detail?',raw_text':'');
 let found:any[]=[];
 if(personIds.length){
  let q=db.from('torre_conversations').select(columns).eq('user_id',uid).eq('state','saved').in('person_id',personIds.slice(0,CHUNK));
  if(detail)q=q.eq('id',detail);
  if(from)q=q.gte('conversation_date',from);
  if(args.to)q=q.lte('conversation_date',args.to);
  const {data}=await checked(q.order('conversation_date',{ascending:false}).order('id').limit(300));
  found=(data??[]).filter((c:any)=>matches(needle,c.raw_text,c.check_in,c.decisions,JSON.stringify((c.agreements??[]).map((a:any)=>a?.title))));
 }
 const page=detail?found.slice(0,1):found.slice(offset,offset+CONVERSATION_PAGE);
 const items=page.map((c:any)=>{
  const checkIn=cut(c.check_in,3000),decisions=cut(c.decisions,3000);
  const item:any={
   id:c.id,person_id:c.person_id,person:people.get(c.person_id)??'',date:c.conversation_date,
   check_in:checkIn.text,decisions:decisions.text,textTruncated:checkIn.truncated||decisions.truncated,
   agreements:(Array.isArray(c.agreements)?c.agreements:[]).slice(0,20).map(agreementView)
  };
  if(detail){const raw=cut(c.raw_text,20000);item.raw_text=raw.text;item.rawTextTruncated=raw.truncated;}
  return item;
 });
 const result:any={items,total:found.length,offset,hasMore:!detail&&offset+items.length<found.length,from:from??null,to:args.to??null};
 if(offset===0&&!detail)result.people=(peopleRows??[]).map((p:any)=>({id:p.id,name:p.name}));
 return result;
}

/** Tamanho de cada fonte para o contexto inicial: o agente sabe o que existe antes de consultar. */
export async function sourceSummary(source:Source){
 const {db,checked,uid}=source;
 const today=conversationToday(),since=daysBefore(today,DEFAULT_WINDOW_DAYS);
 const records=await radarRecords(source);
 const byTemperature:Record<string,number>={observar:0,atencao:0,critico:0};
 for(const r of records)byTemperature[r.temperature]=(byTemperature[r.temperature]??0)+1;
 const {data,count}=await checked(db.from('torre_conversations').select('conversation_date',{count:'exact'}).eq('user_id',uid).eq('state','saved').gte('conversation_date',since).order('conversation_date',{ascending:false}).range(0,0));
 return {
  radar:{themes:records.length,byTemperature,pendingReview:records.filter((r:any)=>!r.next_review_date||r.next_review_date<=today).length},
  conversations:{savedLast60Days:count??0,latestDate:data?.[0]?.conversation_date??null}
 };
}
