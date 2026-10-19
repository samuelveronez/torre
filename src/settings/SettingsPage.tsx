import {ExportData} from '../ExportData';
import {AiSection} from './AiSection';
import {TelegramSettings} from '../TelegramSettings';
import type {AgendaRange} from '../AgendaRange';
import type {Features} from '../features';
import {AppearanceSection} from './AppearanceSection';
import {CalendarsSection} from './CalendarsSection';
import {GoogleSection} from './GoogleSection';
import {LabelsSection} from './LabelsSection';
import {SettingsNav} from './SettingsNav';
import {WorkHoursSection} from './WorkHoursSection';
import {useSettingsActions} from './useSettingsActions';

type Hours={enabled:boolean;start:number;end:number};
type Props={
 features:Features;
 userId:string;
 section:string;
 onSection:(key:string)=>void;
 theme:string;
 onTheme:(theme:'light'|'dark')=>void;
 density:string;
 onDensity:(density:'compact'|'comfortable')=>void;
 agendaRange:AgendaRange;
 onAgendaRange:(range:AgendaRange)=>Promise<boolean>;
 hours:Hours[];
 onHours:(update:(hours:Hours[])=>Hours[])=>Promise<boolean>;
 syncing:boolean;
 labelCounts:Record<string,number>;
};

export function SettingsPage(props:Props){
 const {features,userId,section}=props;
 const actions=useSettingsActions(features,userId,section);
 const connected={Google:!!features.google?.connected,IA:!!features.ai?.has_key&&!!features.ai?.enabled};
 return <div className="tc" style={{maxWidth:960,width:'100%'}}>
  <h1 style={{margin:0,fontSize:24,lineHeight:1.2,fontWeight:600}}>Configurações</h1>
  <p className="desc" style={{marginTop:4,fontSize:14}}>Integrações, IA, labels e preferências da sua conta.</p>
  <hr className="sep" style={{margin:'16px 0 20px'}}/>
  <div className="tc-settings-row" style={{display:'flex',flexWrap:'wrap',gap:32,alignItems:'flex-start'}}>
   <SettingsNav section={section} onSection={props.onSection} connected={connected}/>
   <div style={{flex:'1 1 480px',maxWidth:660,minWidth:0,display:'flex',flexDirection:'column',gap:16}}>
    {section==='Aparência'&&<AppearanceSection theme={props.theme} onTheme={props.onTheme} density={props.density} onDensity={props.onDensity} agendaRange={props.agendaRange} onAgendaRange={props.onAgendaRange}/>}
    {section==='Labels'&&<LabelsSection labels={features.labels} counts={props.labelCounts} actions={actions} busy={features.working}/>}
    {section==='Jornada'&&<WorkHoursSection hours={props.hours} syncing={props.syncing} onChange={props.onHours}/>}
    {section==='Google'&&<GoogleSection features={features} actions={actions}/>}
    {section==='Calendários e listas'&&<CalendarsSection features={features} actions={actions}/>}
    {section==='Telegram'&&<TelegramSettings userId={userId}/>}
    {section==='IA'&&<AiSection features={features} actions={actions}/>}
    {section==='Dados'&&<ExportData/>}
   </div>
  </div>
 </div>;
}
