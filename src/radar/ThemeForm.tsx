import {useId} from 'react';
import {Seg} from '@/ui-kit/Seg';
import {TaskPersonField} from '@/TaskPeopleEditor';
import {intervalOptions,temperatureNames,withInterval,type Interval,type Temperature,type ThemeDraft} from './radarModel';

type Props={
 draft:ThemeDraft;
 onChange:(draft:ThemeDraft)=>void;
 people:{id:string;name:string}[];
 extraPeople?:number;
 autoFocus?:boolean;
};

const temperatureChoices=(Object.keys(temperatureNames) as Temperature[]).map(value=>({value,label:temperatureNames[value]}));
const intervalChoices=intervalOptions.map(value=>({value:String(value),label:`${value} dias`}));
const areaChoices=[{value:'Profissional' as const,label:'Profissional'},{value:'Pessoal' as const,label:'Pessoal'}];

/** Campos do tema, iguais em "Novo tema" e no detalhe (PRD v1.4, CA12). */
export function ThemeForm({draft,onChange,people,extraPeople=0,autoFocus=false}:Props){
 const id=useId();
 const set=(fields:Partial<ThemeDraft>)=>onChange({...draft,...fields});
 return <>
  <div className="f">
   <label className="lab" htmlFor={`${id}-title`}>Título</label>
   <input id={`${id}-title`} data-autofocus={autoFocus||undefined} className="inp" maxLength={180} autoFocus={autoFocus} placeholder="Ex.: Renovação do contrato" value={draft.title} onChange={e=>set({title:e.target.value})}/>
  </div>
  <div className="f">
   <label className="lab" htmlFor={`${id}-desc`}>Descrição</label>
   <textarea id={`${id}-desc`} className="inp" rows={2} placeholder="Do que se trata este tema" value={draft.description} onChange={e=>set({description:e.target.value})}/>
  </div>
  <div className="f"><span className="lab">Temperatura</span>
   <Seg label="Temperatura" value={draft.temperature} options={temperatureChoices} onChange={temperature=>set({temperature})}/>
  </div>
  <div className="f"><span className="lab">Revisar a cada</span>
   <Seg label="Periodicidade da revisão" value={String(draft.intervalDays)} options={intervalChoices} onChange={value=>onChange(withInterval(draft,Number(value) as Interval))}/>
  </div>
  <div className="f">
   <label className="lab" htmlFor={`${id}-next`}>Próxima revisão</label>
   <input id={`${id}-next`} className="inp" type="date" style={{maxWidth:180}} value={draft.nextReview} onChange={e=>set({nextReview:e.target.value})}/>
   <span className="desc" style={{fontSize:12}}>Padrão: hoje + periodicidade. Você pode alterar.</span>
  </div>
  <div className="f">
   <label className="lab" htmlFor={`${id}-notes`}>Anotações e contexto atual</label>
   <textarea id={`${id}-notes`} className="inp" rows={6} placeholder="Escreva o contexto e atualize quando precisar. Salvar substitui o texto anterior." value={draft.notes} onChange={e=>set({notes:e.target.value})}/>
   <span className="desc" style={{fontSize:12}}>Campo único, sem histórico. Se quiser registro cronológico, escreva a data no texto.</span>
  </div>
  <div className="f"><span className="lab">Área</span>
   <Seg label="Área" value={draft.area} options={areaChoices} onChange={area=>set({area})}/>
  </div>
  <TaskPersonField value={draft.personName} onChange={personName=>set({personName})} people={people} label="Pessoa relacionada" extras={extraPeople}/>
 </>;
}
