import type {Conversation} from './types';
export type ConversationGroup={title:'Hoje'|'Ontem'|'Esta semana'|'Anteriores';items:Conversation[]};
const startOfDay=(date:Date)=>{const d=new Date(date);d.setHours(0,0,0,0);return d.getTime();};
/** Groups by last update: today, yesterday, the last 7 days, older. Keeps the incoming order and drops empty groups. */
export function groupConversations(conversations:Conversation[],now=new Date()):ConversationGroup[]{
 const today=startOfDay(now);
 const day=86400000;
 const groups:ConversationGroup[]=[{title:'Hoje',items:[]},{title:'Ontem',items:[]},{title:'Esta semana',items:[]},{title:'Anteriores',items:[]}];
 for(const conversation of conversations){
  const age=Math.round((today-startOfDay(new Date(conversation.updated_at)))/day);
  const index=age<=0?0:age===1?1:age<7?2:3;
  groups[index].items.push(conversation);
 }
 return groups.filter(group=>group.items.length);
}
