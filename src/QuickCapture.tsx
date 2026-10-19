import {useEffect,useRef,useState} from 'react';
import {FileText,Upload,X} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from './components/ui/dialog';
import {CaptureModelPicker} from './CaptureModelPicker';
import {captureDefault,captureProfileNames,type CaptureProfile} from './captureProfiles';
import {VoiceCapture} from './VoiceCapture';
import type {Features} from './features';

type Props={open:boolean;onClose:()=>void;onSaved?:()=>void;features:Features};
type Mode='list'|'free';

const modeOptions:{value:Mode;title:string;hint:string}[]=[
 {value:'list',title:'Lista de itens',hint:'Cada linha ou item vira uma sugestão de tarefa.'},
 {value:'free',title:'Texto livre / ditado',hint:'A IA interpreta o texto inteiro, como uma conversa ou ata.'},
];

export function QuickCapture({open,onClose,onSaved,features}:Props){
 const captureText=useRef<HTMLTextAreaElement>(null),fileInput=useRef<HTMLInputElement>(null),opener=useRef<HTMLElement|null>(null),form=useRef<HTMLFormElement>(null);
 const [profile,setProfile]=useState<CaptureProfile>(captureDefault(features.ai));
 const [mode,setMode]=useState<Mode>('list');
 const id=useRef(crypto.randomUUID());
 const [text,setText]=useState(''),[files,setFiles]=useState<File[]>([]),[saving,setSaving]=useState(false),[error,setError]=useState('');

 useEffect(()=>{
  if(open){
   opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
   id.current=crypto.randomUUID();
   setText('');
   setFiles([]);
   setProfile(captureDefault(features.ai));
   setError('');
   captureText.current?.focus();
  }else if(opener.current?.isConnected){
   opener.current.focus();
  }
 },[open]);

 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();
  setSaving(true);
  setError('');
  try{
   await features.capture(id.current,text,files,mode,profile);
   onSaved?.();
   onClose();
  }catch(error){setError((error as Error).message);}
  finally{setSaving(false);}
 };
 const addFiles=(list:File[])=>setFiles(current=>[...current,...list]);

 return <Dialog open={open} onOpenChange={value=>{if(!value&&!saving)onClose();}}>
  <DialogContent showCloseButton={false} className="tc tc-modal quick-capture-dialog" onOpenAutoFocus={e=>{e.preventDefault();captureText.current?.focus();}} onEscapeKeyDown={e=>{if(saving)e.preventDefault();}} onPointerDownOutside={e=>e.preventDefault()}>
   <button type="button" className="btn btn-g tc-modal-x" disabled={saving} onClick={onClose} aria-label="Fechar captura"><X size={16} aria-hidden="true"/></button>
   <div className="f">
    <DialogTitle className="tc-modal-title">Captura rápida</DialogTitle>
    <DialogDescription className="desc">Guarde texto e anexos na caixa de entrada. A IA sugere as tarefas e você revisa depois.</DialogDescription>
   </div>
   <form id="quick-capture-form" ref={form} className="tc-modal-body" onSubmit={e=>void submit(e)} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();form.current?.requestSubmit();}}}>
    <fieldset className="tc-fs" disabled={saving}>
     <div className="f">
      <label className="lab" htmlFor="quick-capture-text">O que você quer guardar?</label>
      <textarea id="quick-capture-text" ref={captureText} className="inp" autoFocus rows={5} maxLength={20000} value={text} onChange={e=>setText(e.target.value)} placeholder="Digite uma ideia, pendência ou contexto…"/>
      <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
       <p className="desc" style={{fontSize:12}}>Pode colar várias pendências de uma vez.</p>
       <p className="desc" style={{fontSize:12}}>{text.length.toLocaleString('pt-BR')} / 20.000</p>
      </div>
     </div>
     <VoiceCapture disabled={saving||!open} onStart={()=>setMode('free')} onText={part=>setText(current=>(current+' '+part).trim().slice(0,20000))}/>
     <div style={{display:'flex',flexDirection:'column',gap:8}}>
      <div className="tc-dropzone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!saving)addFiles(Array.from(e.dataTransfer.files));}}>
       <Upload size={20} color="var(--muted-foreground)" aria-hidden="true"/>
       <span style={{fontSize:14,fontWeight:500,marginTop:4}}>Arraste arquivos aqui</span>
       <button type="button" className="btn btn-sm" style={{margin:'6px 0 2px'}} onClick={()=>fileInput.current?.click()}>Selecionar arquivos</button>
       <input ref={fileInput} aria-label="Anexar arquivos" type="file" hidden tabIndex={-1} multiple onChange={e=>{addFiles(Array.from(e.target.files??[]));e.target.value='';}}/>
       <p className="desc" style={{fontSize:12}}>Até 10 arquivos · 20 MB cada · conteúdo privado</p>
      </div>
      {files.map((file,i)=><div className="tc-filerow" key={i}>
       <FileText size={16} color="var(--muted-foreground)" aria-hidden="true"/>
       <span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{file.name}</span>
       <span className="desc" style={{fontSize:12}}>{(file.size/1024).toFixed(0)} KB</span>
       <button type="button" className="btn btn-g btn-sm" style={{padding:'0 8px',color:'var(--muted-foreground)'}} onClick={()=>setFiles(current=>current.filter((_,j)=>j!==i))}>Retirar</button>
      </div>)}
     </div>
     <p className="desc" style={{fontSize:12}}>{features.ai?.enabled?'IA ativa · processamento automático com '+captureProfileNames[profile]:'IA desativada · triagem manual na caixa de entrada'}</p>
     <details className="tc-details">
      <summary>Opções de processamento</summary>
      <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:16}}>
       <CaptureModelPicker value={profile} onChange={setProfile} disabled={saving}/>
       <fieldset style={{margin:0,padding:0,border:0,display:'flex',flexDirection:'column',gap:10}}>
        <legend className="lab" style={{padding:0,marginBottom:10}}>Como processar</legend>
        {modeOptions.map(option=><label key={option.value} style={{display:'flex',flexDirection:'row',gap:10,alignItems:'flex-start',cursor:'pointer'}}>
         <input type="radio" name="capture-mode" className="cb" style={{marginTop:2}} checked={mode===option.value} onChange={()=>setMode(option.value)}/>
         <span><span style={{fontWeight:500}}>{option.title}</span><br/><span className="desc">{option.hint}</span></span>
        </label>)}
       </fieldset>
      </div>
     </details>
     {error&&<p role="alert" className="desc" style={{color:'var(--tc-danger)'}}>{error}</p>}
    </fieldset>
   </form>
   <div className="tc-modal-actions">
    <span className="desc" style={{flex:1,fontSize:12}}>Ctrl + Enter para guardar</span>
    <button type="button" className="btn" disabled={saving} onClick={onClose}>Cancelar</button>
    <button type="submit" form="quick-capture-form" className="btn btn-p" disabled={saving}>{saving?'Salvando captura…':'Guardar na caixa de entrada'}</button>
   </div>
  </DialogContent>
 </Dialog>;
}
