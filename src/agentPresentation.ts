export const agentFieldNames:Record<string,string>={title:'Título',name:'Nome',description:'Descrição',reference_url:'Link',area:'Área',duration_minutes:'Duração',due_date:'Prazo',status:'Situação',waiting_for:'Aguardando',follow_up_date:'Acompanhamento',priority:'Prioridade',archived_at:'Arquivamento',label_ids:'Labels',color:'Cor',archived:'Arquivamento'};
export const agentValues:Record<string,string>={personal:'Pessoal',professional:'Profissional',todo:'A fazer',waiting:'Aguardando',completed:'Concluída',none:'Sem prioridade',low:'Baixa',medium:'Média',high:'Alta'};
type Node={type:string;value?:string;children?:Node[];align?:unknown[]};
const identifier=/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|\bnew:[a-z0-9_-]{1,40}\b/gi;
function hideIds(text:string){return text.replace(new RegExp(`\\(?\\b(?:id|uuid)\\s*[:=]?\\s*(?:${identifier.source})\\)?`,'gi'),'').replace(identifier,'').replace(/\(\s*\)/g,'');}
function localize(text:string,technical=false){
 let result=hideIds(text);
 result=result.replace(/\b(priority|prioridade|status|situação|area|área)\s*[:=]?\s+(high|medium|low|none|waiting|todo|completed|personal|professional)\b/gi,(_,field:string,value:string)=>`${agentFieldNames[field.toLowerCase()]??field}: ${agentValues[value.toLowerCase()]}`);
 const trimmed=result.trim(),field=agentFieldNames[trimmed.replace(/:$/,'').toLowerCase()];if(field)result=result.replace(trimmed,field+(trimmed.endsWith(':')?':':''));
 if(technical)result=result.replace(/^(\s*[:=]?\s*)(high|medium|low|none|waiting|todo|completed|personal|professional)([\s.,;]*)$/i,(_,prefix:string,value:string,suffix:string)=>prefix+agentValues[value.toLowerCase()]+suffix);
 return result;
}
// Presentation only: identifiers and wire values remain intact in tools and storage.
export function remarkAgentPresentation(){return (tree:Node)=>{
 function visit(node:Node,technical=false,inLink=false){
  if(node.type==='paragraph'){const content=(n:Node):string=>n.value??n.children?.map(content).join('')??'';const text=content(node);if(new RegExp(`^\\s*(?:id|uuid)\\s*[:=]?\\s*(?:${identifier.source})\\s*$`,'i').test(text)){node.children=[];return;}technical=technical||/\b(priority|prioridade|status|situação|area|área)\s*[:=]/i.test(text);}
  if(node.type==='table'&&node.children?.[0]?.children){
   const hidden=node.children[0].children.flatMap((cell,index)=>/^(id|uuid)$/i.test(cell.children?.map(c=>c.value??'').join('').trim()??'')?[index]:[]);
   for(const row of node.children)row.children=row.children?.filter((_,index)=>!hidden.includes(index));
   node.align=node.align?.filter((_,index)=>!hidden.includes(index));
  }
  if(node.value!==undefined&&['text','inlineCode','code'].includes(node.type))node.value=inLink?hideIds(node.value):localize(node.value,technical||node.type==='inlineCode');
  for(const child of node.children??[])visit(child,technical||node.type==='tableCell',inLink||node.type==='link');
  if(node.children)node.children=node.children.filter(child=>!(child.value!==undefined&&!child.value.trim()&&['text','inlineCode'].includes(child.type))&&!(child.children?.length===0&&['paragraph','listItem'].includes(child.type)));
 }
 visit(tree);
};}
