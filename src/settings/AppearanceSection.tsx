import {AgendaRangeSettings,type AgendaRange} from '../AgendaRange';

type Props={
 theme:string;
 onTheme:(theme:'light'|'dark')=>void;
 density:string;
 onDensity:(density:'compact'|'comfortable')=>void;
 agendaRange:AgendaRange;
 onAgendaRange:(range:AgendaRange)=>Promise<boolean>;
};

export function AppearanceSection({theme,onTheme,density,onDensity,agendaRange,onAgendaRange}:Props){
 return <section className="card settings">
  <div className="card-head"><h2>Aparência</h2></div>
  <div className="settings-body">
   <div className="appearance-setting">
    <h3>Tema</h3>
    <p>Escolha o tema. A preferência fica salva na sua conta.</p>
    <div className="theme-options" role="group" aria-label="Tema da aplicação">
     <button aria-pressed={theme==='light'} onClick={()=>onTheme('light')}>Claro</button>
     <button aria-pressed={theme==='dark'} onClick={()=>onTheme('dark')}>Escuro</button>
    </div>
   </div>
   <h3>Densidade</h3>
   <div className="theme-options" role="group" aria-label="Densidade da interface">
    <button aria-pressed={density==='compact'} onClick={()=>onDensity('compact')}>Compacta</button>
    <button aria-pressed={density==='comfortable'} onClick={()=>onDensity('comfortable')}>Confortável</button>
   </div>
   <AgendaRangeSettings range={agendaRange} onSave={onAgendaRange}/>
   <p>As alterações são salvas automaticamente.</p>
  </div>
 </section>;
}
