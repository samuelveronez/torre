import type {Task} from '../task';
import type {Label} from '../features';

export type Temperature='observar'|'atencao'|'critico';
export type Interval=7|15|30;
export type RadarRecord={
 taskId:string;
 temperature:Temperature;
 intervalDays:Interval;
 nextReview:string|null;
 lastReviewedAt:string|null;
 notes:string;
};
export type RadarTheme={task:Task;record:RadarRecord};

export const temperatureNames:Record<Temperature,string>={observar:'Observar',atencao:'Atenção',critico:'Crítico'};
export const intervalOptions:Interval[]=[7,15,30];
export const defaultInterval:Interval=15;

/** Id da etiqueta Radar ativa; é a única definição de "Radar" no frontend. */
export function radarLabelId(labels:Pick<Label,'id'|'name'|'archived'>[]):string|undefined{
 return labels.find(l=>!l.archived&&l.name.trim().toLocaleLowerCase('pt-BR')==='radar')?.id;
}
/** Predicado único (RN11): tema Radar = tarefa ativa com a etiqueta Radar. Ações vinculadas não herdam a etiqueta. */
export function isRadarTheme(task:Pick<Task,'labelIds'>,radarId?:string){
 return !!radarId&&!!task.labelIds?.includes(radarId);
}
/** Tarefas executáveis: tudo que não é tema Radar. */
export function executableTasks(tasks:Task[],radarId?:string){
 return radarId?tasks.filter(t=>!isRadarTheme(t,radarId)):tasks;
}

const addDays=(day:string,days:number)=>{
 const date=new Date(day+'T12:00:00Z');
 date.setUTCDate(date.getUTCDate()+days);
 return date.toISOString().slice(0,10);
};
/** Data civil em America/Sao_Paulo ('YYYY-MM-DD'). */
export function saoPauloDay(now=new Date()){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
/** Próxima revisão: data da confirmação + periodicidade (RN06). */
export function nextReviewDate(confirmedAt:Date,interval:Interval){
 return addDays(saoPauloDay(confirmedAt),interval);
}
/** "Revisão pendente" (nunca "atrasada"): sem data agendada ou data de hoje ou anterior. Não entra em métricas de tarefas. */
export function reviewPending(record:Pick<RadarRecord,'nextReview'>,today=saoPauloDay()){
 return !record.nextReview||record.nextReview<=today;
}

export type RadarFilters={query:string;temperature:Temperature|'todas';pendingOnly:boolean};
export const noFilters:RadarFilters={query:'',temperature:'todas',pendingOnly:false};
const fold=(text:string)=>text.normalize('NFD').replace(/[̀-ͯ]/g,'').toLocaleLowerCase('pt-BR');
const temperatureRank:Record<Temperature,number>={critico:0,atencao:1,observar:2};

export function filterThemes(themes:RadarTheme[],filters:RadarFilters,today=saoPauloDay()){
 const query=fold(filters.query.trim());
 return themes.filter(({task,record})=>
  (filters.temperature==='todas'||record.temperature===filters.temperature)
  &&(!filters.pendingOnly||reviewPending(record,today))
  &&(!query||fold([task.title,task.description,record.notes].join(' ')).includes(query)));
}
/** Críticos primeiro, depois revisão pendente, depois a revisão mais próxima. */
export function sortThemes(themes:RadarTheme[],today=saoPauloDay()){
 return [...themes].sort((a,b)=>
  temperatureRank[a.record.temperature]-temperatureRank[b.record.temperature]
  ||Number(reviewPending(b.record,today))-Number(reviewPending(a.record,today))
  ||(a.record.nextReview??'').localeCompare(b.record.nextReview??'')
  ||a.task.title.localeCompare(b.task.title,'pt-BR'));
}
export function radarCounters(themes:RadarTheme[],today=saoPauloDay()){
 return {
  monitored:themes.length,
  attention:themes.filter(t=>t.record.temperature!=='observar').length,
  pending:themes.filter(t=>reviewPending(t.record,today)).length,
 };
}
/** Ações executáveis ligadas ao tema (RF08). */
export function linkedActions(tasks:Task[],themeId:string){
 return tasks.filter(t=>t.radarTaskId===themeId);
}
