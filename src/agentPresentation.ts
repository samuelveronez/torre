export const agentFieldNames:Record<string,string>={title:'Título',name:'Nome',description:'Descrição',reference_url:'Link',area:'Área',duration_minutes:'Duração',due_date:'Prazo',status:'Situação',waiting_for:'Aguardando',follow_up_date:'Acompanhamento',priority:'Prioridade',archived_at:'Arquivamento',label_ids:'Labels',color:'Cor',archived:'Arquivamento'};
export const agentValues:Record<string,string>={personal:'Pessoal',professional:'Profissional',todo:'A fazer',waiting:'Aguardando',completed:'Concluída',none:'Sem prioridade',low:'Baixa',medium:'Média',high:'Alta',overdue:'Atrasada'};
type Node={type:string;value?:string;children?:Node[];align?:unknown[]};
const identifier=/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|\bnew:[a-z0-9_-]{1,40}\b/gi;
function hideIds(text:string,references:Record<string,string>={}){return text.replace(new RegExp(`\\(?\\b(?:id|uuid)\\s*[:=]?\\s*(?:${identifier.source})\\)?`,'gi'),'').replace(identifier,id=>references[id.toLowerCase()]??'').replace(/\b[0-9a-f]{8}\b/gi,id=>references[id.toLowerCase()]??id).replace(/\(\s*\)/g,'');}
function localize(text:string,technical=false,references:Record<string,string>={}){
 let result=hideIds(text,references);
 result=result.replace(/["'“‘](high|medium|low|none|waiting|todo|completed|personal|professional|overdue)["'”’]/gi,(_,value:string)=>agentValues[value.toLowerCase()]);
 result=result.replace(/\b(priority|prioridade|status|situação|area|área)\s*[:=]?\s+(high|medium|low|none|waiting|todo|completed|personal|professional)\b/gi,(_,field:string,value:string)=>`${agentFieldNames[field.toLowerCase()]??field}: ${agentValues[value.toLowerCase()]}`);
 const trimmed=result.trim(),field=agentFieldNames[trimmed.replace(/:$/,'').toLowerCase()];if(field)result=result.replace(trimmed,field+(trimmed.endsWith(':')?':':''));
 if(technical)result=result.replace(/\b(high|medium|low|none|waiting|todo|completed|personal|professional|overdue)\b/gi,value=>agentValues[value.toLowerCase()]);
 return result;
}
// Presentation only: identifiers and wire values remain intact in tools and storage.
export function remarkAgentPresentation(options:{references?:Record<string,string>}={}){return (tree:Node)=>{
 function visit(node:Node,technical=false,inLink=false){
  if(node.type==='paragraph'){const content=(n:Node):string=>n.value??n.children?.map(content).join('')??'';const text=content(node);if(new RegExp(`^\\s*(?:id|uuid)\\s*[:=]?\\s*(?:${identifier.source})\\s*$`,'i').test(text)){node.children=[];return;}technical=technical||/\b(priority|prioridade|status|situação|area|área)\b/i.test(text);}
  if(node.type==='table'&&node.children?.[0]?.children){
   const hidden=node.children[0].children.flatMap((cell,index)=>/^(id|uuid)$/i.test(cell.children?.map(c=>c.value??'').join('').trim()??'')?[index]:[]);
   for(const row of node.children)row.children=row.children?.filter((_,index)=>!hidden.includes(index));
   node.align=node.align?.filter((_,index)=>!hidden.includes(index));
  }
  if(node.value!==undefined&&['text','inlineCode','code'].includes(node.type))node.value=inLink?hideIds(node.value,options.references):localize(node.value,technical||node.type==='inlineCode',options.references);
  for(const child of node.children??[])visit(child,technical||node.type==='tableCell',inLink||node.type==='link');
  if(node.children)node.children=node.children.filter(child=>!(child.value!==undefined&&!child.value.trim()&&['text','inlineCode'].includes(child.type))&&!(child.children?.length===0&&['paragraph','listItem'].includes(child.type)));
 }
 visit(tree);
};}
