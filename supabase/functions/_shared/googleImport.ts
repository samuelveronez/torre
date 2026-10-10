// Imported tasks become local records. Later reads never overwrite local decisions.
export function importedTask(item: {deleted?:boolean;title?:string;notes?:string;due?:string;updated?:string;status?:string}, exists:boolean){
 if(item.deleted||exists)return null;
 return {title:(item.title?.trim()||'Tarefa sem título').slice(0,180),description:item.notes??'',due_date:item.due?.slice(0,10)??null,google_updated_at:item.updated??null,status:item.status==='completed'?'completed':'todo',archived_at:null,google_completion_pending:false};
}
