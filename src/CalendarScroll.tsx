import {useEffect,useId,useRef,useState,type ReactNode} from 'react';

/** Keep the existing calendar grid, with an overflow hint and keyboard scrolling. */
export function CalendarScroll({children}:{children:ReactNode}){
 const ref=useRef<HTMLDivElement>(null),hintId=useId();
 const [overflow,setOverflow]=useState(false);
 useEffect(()=>{
  const element=ref.current;if(!element)return;
  const check=()=>setOverflow(element.scrollWidth>element.clientWidth+1);
  const observer=new ResizeObserver(check);observer.observe(element);
  if(element.firstElementChild)observer.observe(element.firstElementChild);
  check();return()=>observer.disconnect();
 },[children]);
 return <><div ref={ref} className="calendar-scroll" tabIndex={0} role="region" aria-label="Grade da agenda semanal" aria-describedby={overflow?hintId:undefined}>{children}</div>{overflow&&<p id={hintId} className="calendar-overflow-hint">Role para os lados para ver os outros dias.</p>}</>;
}
