import {useEffect,useRef,useState} from 'react';
type Recognition={lang:string;continuous:boolean;interimResults:boolean;onresult:((event:any)=>void)|null;onerror:((event:any)=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void;abort:()=>void};
export function VoiceCapture({onText,disabled}:{onText:(text:string)=>void;disabled:boolean}){
 const recognition=useRef<Recognition|null>(null),callback=useRef(onText);callback.current=onText;
 const [listening,setListening]=useState(false),[message,setMessage]=useState(''),[interim,setInterim]=useState('');
 const Constructor=(window as any).SpeechRecognition??(window as any).webkitSpeechRecognition;
 useEffect(()=>()=>recognition.current?.abort(),[]);
 useEffect(()=>{if(disabled){recognition.current?.stop();setListening(false);}},[disabled]);
 function start(){setMessage('');setInterim('');const r:Recognition=new Constructor();recognition.current=r;r.lang='pt-BR';r.continuous=true;r.interimResults=true;
  r.onresult=e=>{let partial='';for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)callback.current(e.results[i][0].transcript);else partial+=e.results[i][0].transcript;}setInterim(partial);};
  r.onerror=e=>{setMessage(e.error==='not-allowed'?'Permissão do microfone negada. Você pode digitar.':'Ditado interrompido. O texto reconhecido foi preservado.');setListening(false);};r.onend=()=>{setListening(false);setInterim('');};
  try{r.start();setListening(true);}catch{setMessage('Não foi possível iniciar o ditado neste navegador.');}
 }
 return <div className="voice-capture"><button type="button" disabled={disabled||!Constructor} onClick={()=>listening?recognition.current?.stop():start()}>{listening?'Parar ditado':'Ditar pelo microfone'}</button><small>Revise o texto antes de salvar. O navegador pode enviar áudio ao serviço de reconhecimento; a Torre não guarda gravações.</small><p role="status">{listening?'Ouvindo… ':''}{interim||message||(!Constructor?'Ditado indisponível neste navegador. Use texto.':'')}</p></div>;
}
