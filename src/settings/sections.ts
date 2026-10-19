export type SettingsSection={key:string;label:string};
export type SettingsGroup={title:string;items:SettingsSection[]};

// key é o valor salvo em `settings-section` (não renomear); label é o texto exibido.
export const settingsGroups:SettingsGroup[]=[
 {title:'Preferências',items:[{key:'Aparência',label:'Aparência'},{key:'Labels',label:'Labels'},{key:'Jornada',label:'Jornada de trabalho'}]},
 {title:'Integrações',items:[{key:'Google',label:'Google'},{key:'Calendários e listas',label:'Calendários e listas'},{key:'Telegram',label:'Telegram'},{key:'IA',label:'Inteligência artificial'}]},
 {title:'Dados',items:[{key:'Dados',label:'Exportar dados'}]},
];

const allKeys=settingsGroups.flatMap(group=>group.items.map(item=>item.key));

// 'Preferências' era uma seção única antes da divisão em Aparência, Jornada e Dados.
export function normalizeSection(value:string){
 if(value==='Preferências')return 'Aparência';
 return allKeys.includes(value)?value:'Google';
}
