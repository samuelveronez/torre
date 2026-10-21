import {useEffect,useMemo,useRef,useState} from 'react';
import {Maximize2,Minimize2} from 'lucide-react';
import type {Label} from '../features';
import type {Task} from '../task';
import {usePreference} from '../uiState';
import {BlocksView} from './BlocksView';
import {FocusList} from './FocusList';
import {RadarView} from './RadarView';
import {Scoreboard} from './Scoreboard';
import {Scrubber} from './Scrubber';
import {SidePanel} from './SidePanel';
import {ThemesView} from './ThemesView';
import {chargePrompt,dayLabel,focusList,NO_THEME,NO_THEME_COLOR,overdueTrend,peopleBlocks,scrubberDays,snapshot,themeGroups,timeline,toPainelTasks,todayNumber,WINDOW_DAYS} from './painelModel';
import './painel.css';

type View='prazos'|'bloqueios'|'temas';
const views:{value:View;label:string;title:string;hint:string}[]=[
 {value:'prazos',label:'Prazos',title:'Relógio de prazos',hint:'ÂNGULO = DIAS ATÉ O PRAZO · ANEL = PRIORIDADE'},
 {value:'bloqueios',label:'Bloqueios',title:'Mapa de bloqueios',hint:'TAMANHO = DIAS PARADOS SOMADOS'},
 {value:'temas',label:'Temas',title:'Mapa por tema',hint:'CADA QUADRADO = 1 TAREFA'},
];

type Props={
 userId:string;
 tasks:Task[];
 labels:Label[];
 labelFilter:string[];
 theme:string;
 syncing:boolean;
 onTheme:(theme:'light'|'dark')=>void;
 onLabel:(id:string)=>void;
 onOpen:(id:string)=>void;
 onComplete:(id:string)=>void;
 onPlan:(id:string)=>void;
 onCharge:(prompt:string)=>void;
};

export function Painel({userId,tasks,labels,labelFilter,theme,syncing,onTheme,onLabel,onOpen,onComplete,onPlan,onCharge}:Props){
 const root=useRef<HTMLDivElement>(null);
 const today=useMemo(todayNumber,[]);
 const [view,setView]=useState<View>('prazos');
 const [day,setDay]=useState(today);
 const [selectedId,setSelectedId]=useState('');
 const [playing,setPlaying]=useState(false);
 const [fullscreen,setFullscreen]=useState(false);
 const [motion,setMotion]=usePreference(userId,'painel-motion',true);

 const rows=useMemo(()=>toPainelTasks(tasks,labels),[tasks,labels]);
 const data=snapshot(rows,day);
 const focus=focusList(rows,day,5);
 const trend=overdueTrend(rows,today);
 const days=scrubberDays(rows,today);
 const people=peopleBlocks(rows,day);
 const groups=themeGroups(rows,labels,day);
 const events=timeline(rows,day,9);
 const selected=data.all.find(t=>t.id===selectedId);
 const colors=useMemo(()=>new Map([...labels.map(l=>[l.name,l.color] as const),[NO_THEME,NO_THEME_COLOR] as const]),[labels]);
 const current=views.find(v=>v.value===view)!;
 const select=(id:string)=>setSelectedId(selectedId===id?'':id);

 useEffect(()=>{
  if(!playing)return;
  const last=today-15+WINDOW_DAYS-1;
  const timer=setInterval(()=>{
   setDay(value=>{
    if(value>=last){setPlaying(false);return value;}
    return value+1;
   });
  },motion?700:400);
  return()=>clearInterval(timer);
 },[playing,motion,today]);

 useEffect(()=>{
  const change=()=>setFullscreen(document.fullscreenElement===root.current);
  document.addEventListener('fullscreenchange',change);
  return()=>document.removeEventListener('fullscreenchange',change);
 },[]);

 const toggleFullscreen=()=>{
  if(document.fullscreenElement)void document.exitFullscreen().catch(()=>undefined);
  else void root.current?.requestFullscreen?.().catch(()=>undefined);
 };
 useEffect(()=>{
  const listener=(e:KeyboardEvent)=>{
   const target=e.target as HTMLElement|null;
   if(e.key.toLowerCase()!=='f'||e.ctrlKey||e.metaKey||e.altKey)return;
   if(target&&(target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target.tagName)))return;
   e.preventDefault();
   toggleFullscreen();
  };
  window.addEventListener('keydown',listener);
  return()=>window.removeEventListener('keydown',listener);
 },[]);

 const play=()=>{
  if(playing){setPlaying(false);return;}
  if(day>=today-15+WINDOW_DAYS-1)setDay(today-15);
  setPlaying(true);
 };

 const over=data.over.length;
 const dated=data.all.filter(t=>t.date!==null).length;
 const headline=over
  ?`${over} de ${dated} tarefas com data já passaram do prazo${people[0]?` · ${people[0].name} segura ${people[0].tasks.length}`:''}`
  :`Nada vencido. Bom momento para dar prazo às ${data.undated.length} sem data.`;
 const activeLabels=labels.filter(l=>!l.archived);
 const filtering=labelFilter.length>0;

 return <div ref={root} className={'pn'+(motion?'':' pn-motion-off')} aria-label="Painel consolidado">
  <div className="pn-bar">
   <div className="pn-title"><h1>Painel</h1><span className="pn-mono">{day===today?'HOJE ':'SIMULAÇÃO '}{dayLabel(day)}</span></div>
   <div className="pn-group" role="group" aria-label="Visão">
    {views.map(item=><button key={item.value} type="button" aria-pressed={view===item.value} onClick={()=>setView(item.value)}>{item.label}</button>)}
   </div>
   <div className={'pn-chips'+(filtering?' dim':'')} role="group" aria-label="Filtrar por label">
    {activeLabels.map(label=><button key={label.id} type="button" className="pn-chip" aria-pressed={labelFilter.includes(label.id)} onClick={()=>onLabel(label.id)} style={{borderColor:labelFilter.includes(label.id)?label.color:undefined}}><i style={{background:label.color}}/>{label.name}</button>)}
    <button type="button" className="pn-chip" aria-pressed={labelFilter.includes('none')} onClick={()=>onLabel('none')}><i style={{background:NO_THEME_COLOR}}/>{NO_THEME}</button>
   </div>
   <div className="pn-tools">
    <span className="pn-live pn-mono"><i/>{day===today?(syncing?'Salvando…':'Dados ao vivo do Supabase'):`Simulando ${day>today?'+':''}${day-today} dias`}</span>
    <div className="pn-group small" role="group" aria-label="Tema">
     <button type="button" aria-pressed={theme==='dark'} onClick={()=>onTheme('dark')}>Escuro</button>
     <button type="button" aria-pressed={theme!=='dark'} onClick={()=>onTheme('light')}>Claro</button>
    </div>
    <button type="button" className="pn-toggle" aria-pressed={motion} onClick={()=>setMotion(!motion)}>Animações<span/></button>
    <button type="button" className="pn-icon" aria-label={fullscreen?'Sair da tela cheia (F)':'Tela cheia (F)'} title={fullscreen?'Sair da tela cheia (F)':'Tela cheia (F)'} onClick={toggleFullscreen}>{fullscreen?<Minimize2 size={16} aria-hidden="true"/>:<Maximize2 size={16} aria-hidden="true"/>}</button>
   </div>
  </div>

  <Scoreboard data={data} headline={headline}/>

  <div className="pn-main">
   <FocusList focus={focus} trend={trend} day={day} today={today} selected={selectedId} onSelect={select}/>
   <section className="pn-panel pn-center" aria-label={current.title}>
    <div className="pn-hd"><h2>{current.title}</h2><span className="pn-hint pn-mono">{current.hint}</span></div>
    {view==='prazos'&&<RadarView tasks={data.all} undated={data.undated.length} day={day} selected={selectedId} onSelect={select}/>}
    {view==='bloqueios'&&<BlocksView people={people} day={day} selected={selectedId} onSelect={select} onCharge={person=>onCharge(chargePrompt(person,day))}/>}
    {view==='temas'&&<ThemesView groups={groups} day={day} selected={selectedId} onSelect={select}/>}
   </section>
   <SidePanel people={people} events={events} colors={colors} selected={selected} day={day} onSelect={select} onClose={()=>setSelectedId('')} onOpen={onOpen} onComplete={onComplete} onPlan={onPlan}/>
  </div>

  <Scrubber days={days} day={day} today={today} playing={playing} onDay={setDay} onToday={()=>{setPlaying(false);setDay(today);}} onPlay={play}/>
 </div>;
}
