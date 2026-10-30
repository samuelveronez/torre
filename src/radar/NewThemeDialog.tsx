import {useState} from 'react';
import {ModalShell} from '@/TaskDialogs';
import {draftError,emptyDraft,type ThemeDraft} from './radarModel';
import {ThemeForm} from './ThemeForm';

type Props={
 people:{id:string;name:string}[];
 defaultArea:ThemeDraft['area'];
 onClose:()=>void;
 /** Devolve a mensagem de erro, ou vazio quando o tema foi criado. */
 onCreate:(draft:ThemeDraft)=>Promise<string>;
};

export function NewThemeDialog({people,defaultArea,onClose,onCreate}:Props){
 const [draft,setDraft]=useState(()=>emptyDraft(undefined,defaultArea));
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');

 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  const invalid=draftError(draft);
  if(invalid){setError(invalid);return;}
  setSaving(true);
  try{
   const failure=await onCreate(draft);
   if(failure)setError(failure);
  }finally{setSaving(false);}
 }

 return <ModalShell title="Novo tema" description="Um tema é acompanhado, não executado. Prazo e prioridade ficam nas tarefas vinculadas." onClose={onClose} formId="new-theme-form" onSubmit={e=>void submit(e)} hint="O tema nasce sem prazo e não entra no planejamento da semana."
  footer={<><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" form="new-theme-form" className="btn btn-p" disabled={saving}>{saving?'Criando…':'Criar tema'}</button></>}>
  <ThemeForm draft={draft} onChange={value=>{setDraft(value);setError('');}} people={people} autoFocus/>
  {error&&<p className="desc" role="alert" style={{color:'var(--tc-danger)'}}>{error}</p>}
 </ModalShell>;
}
