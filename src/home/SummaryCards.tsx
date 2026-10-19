type Card={label:string;value:number;hint:string;tone?:'danger'|'brand'};

function CardBox({label,value,hint,tone}:Card){
 const color=tone==='danger'?'var(--tc-danger)':tone==='brand'?'var(--tc-chip-on)':'var(--foreground)';
 return <div className="tc-card-s" style={{padding:'12px 16px'}}>
  <div className="desc">{label}</div>
  <div style={{fontSize:24,fontWeight:600,lineHeight:1.3,color}}>{value}</div>
  <div className="desc" style={{fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{hint}</div>
 </div>;
}

export function formatTotal(minutes:number){
 if(!minutes)return 'Nenhum tempo previsto';
 const h=Math.floor(minutes/60),m=minutes%60;
 return [h?`${h} h`:'',m?`${m} min`:''].filter(Boolean).join(' ')+' no total';
}

type Props={planned:number;plannedMinutes:number;late:number;focusCount:number;focusTitle:string;events:number;nextEvent:string};

export function SummaryCards({planned,plannedMinutes,late,focusCount,focusTitle,events,nextEvent}:Props){
 return <section aria-label="Resumo do dia" className="tc-summary">
  <CardBox label="Tarefas planejadas" value={planned} hint={formatTotal(plannedMinutes)}/>
  <CardBox label="Atrasadas" value={late} hint={late?'Replaneje ou conclua':'Nada em atraso'} tone={late?'danger':undefined}/>
  <CardBox label="Foco do dia" value={focusCount} hint={focusCount?focusTitle:'Escolha uma tarefa de foco'} tone="brand"/>
  <CardBox label="Compromissos" value={events} hint={nextEvent}/>
 </section>;
}
