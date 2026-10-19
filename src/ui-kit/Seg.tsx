type Option<T extends string>={value:T;label:string};
type Props<T extends string>={label:string;value:T;options:Option<T>[];onChange:(value:T)=>void};

export function Seg<T extends string>({label,value,options,onChange}:Props<T>){
 return <div className="seg" role="group" aria-label={label}>
  {options.map(option=><button key={option.value} type="button" aria-pressed={value===option.value} onClick={()=>onChange(option.value)}>{option.label}</button>)}
 </div>;
}
