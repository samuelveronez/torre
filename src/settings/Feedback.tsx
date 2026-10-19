export function Feedback({message,failed}:{message:string;failed:boolean}){
 if(!message)return null;
 return <p className="desc" role={failed?'alert':'status'} style={failed?{color:'var(--tc-danger)'}:undefined}>{message}</p>;
}
