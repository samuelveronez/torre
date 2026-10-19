import {useEffect,useRef,useState} from 'react';
import {Mic} from 'lucide-react';

type Recognition={lang:string;continuous:boolean;interimResults:boolean;onresult:((event:any)=>void)|null;onerror:((event:any)=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void;abort:()=>void};

export function VoiceCapture({onText,onStart,disabled}:{onText:(text:string)=>void;onStart?:()=>void;disabled:boolean}){
 const recognition=useRef<Recognition|null>(null),callback=useRef(onText);callback.current=onText;
 const [listening,setListening]=useState(false),[message,setMessage]=useState(''),[interim,setInterim]=useState('');
 const Constructor=(window as any).SpeechRecognition??(window as any).webkitSpeechRecognition;
 useEffect(()=>()=>recognition.current?.abort(),[]);
 useEffect(()=>{if(disabled){recognition.current?.stop();setListening(false);}},[disabled]);
 function start(){
  setMessage('');
  setInterim('');
  onStart?.();
  const r:Recognition=new Constructor();
  recognition.current=r;
  r.lang='pt-BR';
  r.continuous=true;
  r.interimResults=true;
  r.onresult=e=>{
   let partial='';
   for(let i=e.resultIndex;i<e.results.length;i++){
    if(e.results[i].isFinal)callback.current(e.results[i][0].transcript);
    else partial+=e.results[i][0].transcript;
   }
   setInterim(partial);
  };
  r.onerror=e=>{
   setMessage(e.error==='not-allowed'?'Permissão do microfone negada. Você pode digitar.':'Ditado interrompido. O texto reconhecido foi preservado.');
   setListening(false);
  };
  r.onend=()=>{setListening(false);setInterim('');};
  try{r.start();setListening(true);}
  catch{setMessage('Não foi possível iniciar o ditado neste navegador.');}
 }
 const toggle=()=>listening?recognition.current?.stop():start();
 return <>
  {listening
   ? <div className="tc-listening" role="status">
      <span style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,color:'var(--tc-listen-text)'}}>
       <span style={{width:8,height:8,borderRadius:'50%',background:'#dc2626',animation:'tc-pulse 1.2s ease-in-out infinite'}}/>Ouvindo…
      </span>
      <span style={{flex:1,minWidth:120,fontSize:13,color:'var(--muted-foreground)'}}>{interim?`“${interim}”`:''}</span>
      <button type="button" className="btn btn-sm" onClick={toggle}>Parar ditado</button>
     </div>
   : <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8}}>
      <button type="button" className="btn btn-sm" disabled={disabled||!Constructor} onClick={toggle}><Mic size={14} aria-hidden="true"/>Ditar texto</button>
      <span className="desc" role="status" style={{fontSize:12}}>{message||(!Constructor?'Ditado indisponível neste navegador. Use texto.':'O navegador pode enviar o áudio ao serviço de reconhecimento. A Torre não guarda gravações.')}</span>
     </div>}
 </>;
}
