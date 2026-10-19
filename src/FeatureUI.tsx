import {FileText,Download,RotateCcw} from 'lucide-react';
import {useRef} from 'react';
import {LabelChips} from './ui-kit/LabelChips';
import type {Attachment,Features,Label} from './features';

export function LabelPicker(props:{labels:Label[];selected:string[];onChange:(value:string[])=>void}){
 return <LabelChips {...props}/>;
}

export function AttachmentList({items,features}:{items:Attachment[];features:Features}){
 return <div className="attachment-list" style={{display:'flex',flexDirection:'column',gap:8}}>{items.map(a=><AttachmentItem key={a.id} attachment={a} features={features}/>)}</div>;
}

function AttachmentItem({attachment:a,features}:{attachment:Attachment;features:Features}){
 const input=useRef<HTMLInputElement>(null);
 const uploaded=a.state==='uploaded';
 const failed=a.state==='error';
 const label=uploaded?'Baixar':'Reenviar';
 const act=()=>uploaded?void features.run(()=>features.download(a)):input.current?.click();
 return <div className="tc-filerow attachment-item" style={{flexWrap:'wrap'}}>
  <FileText size={16} color="var(--muted-foreground)" aria-hidden="true"/>
  <span style={{flex:1,minWidth:0,overflowWrap:'anywhere'}}>{a.name}</span>
  <span className="desc" style={{fontSize:12,color:failed?'var(--tc-danger)':undefined}}>{uploaded?'Anexado':failed?'Falha no upload':'Upload pendente'}</span>
  <button type="button" className="btn btn-g btn-sm" disabled={features.working} aria-label={`${label} ${a.name}`} onClick={act}>
   {uploaded?<Download size={14} aria-hidden="true"/>:<RotateCcw size={14} aria-hidden="true"/>}{label}
  </button>
  {!uploaded&&<input ref={input} hidden type="file" aria-label={`Reenviar ${a.name}`} tabIndex={-1} onChange={e=>{const file=e.target.files?.[0];if(file)void features.run(()=>features.upload(a,file));e.target.value='';}}/>}
  {a.error&&<details style={{flexBasis:'100%'}}><summary className="desc" style={{cursor:'pointer',fontSize:12}}>Detalhes do erro</summary><p className="desc" style={{fontSize:12,overflowWrap:'anywhere',paddingTop:4}}>{a.error}</p></details>}
 </div>;
}
