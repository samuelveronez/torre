// Formatadores de data usados pelas telas migradas (texto curto, como nos mockups).
const capitalize=(text:string)=>text.charAt(0).toUpperCase()+text.slice(1);

export function formatWhen(iso:string,now=new Date()){
 const date=new Date(iso);
 const time=date.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
 const day=new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime();
 const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
 const diff=Math.round((today-day)/86400000);
 if(diff===0)return `hoje, ${time}`;
 if(diff===1)return `ontem, ${time}`;
 return `${date.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}, ${time}`;
}

// 'YYYY-MM-DD' → "Hoje", "Amanhã" ou "Qua, 21/10"; vazio → "Sem data".
export function formatDue(value:string|undefined|null,now=new Date()){
 if(!value)return 'Sem data';
 const date=new Date(value+'T12:00');
 const key=(d:Date)=>`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
 const tomorrow=new Date(now);
 tomorrow.setDate(now.getDate()+1);
 if(key(date)===key(now))return 'Hoje';
 if(key(date)===key(tomorrow))return 'Amanhã';
 return capitalize(date.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'}).replace('.',''));
}
