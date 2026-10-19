import type {ReactNode} from 'react';

type Props={title:string;description?:ReactNode;action?:ReactNode};

export function SectionHeader({title,description,action}:Props){
 return <>
  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
   <div>
    <h2 style={{margin:0,fontSize:18,fontWeight:500}}>{title}</h2>
    {description&&<p className="desc" style={{marginTop:2}}>{description}</p>}
   </div>
   {action}
  </div>
  <hr className="sep"/>
 </>;
}
