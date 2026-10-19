export type Operation={entity:'task'|'label';id:string;title:string;before:Record<string,unknown>|null;patch:Record<string,unknown>};
export type ModelChoice='openrouter/free'|'google/gemini-2.5-flash';
export type Run={id:string;conversation_id:string|null;message:string;mode:'analyze'|'execute';state:'processing'|'ready'|'answered'|'applied'|'undone'|'error';response:string;model:string|null;requested_model:ModelChoice;error:string|null;operations:Operation[];created_at:string};
export type Conversation={conversation_id:string|null;title:string;updated_at:string;run_count:number;archived_at?:string|null};
export const conversationKey=(id:string|null)=>id??'legacy';
export const modelLabel=(model:ModelChoice|string|undefined)=>model==='google/gemini-2.5-flash'?'Gemini 2.5 Flash':'OpenRouter gratuito';
