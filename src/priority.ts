export const priorities=[{value:'high',label:'Alta'},{value:'medium',label:'Média'},{value:'low',label:'Baixa'},{value:'none',label:'Sem prioridade'}] as const;
export type Priority=typeof priorities[number]['value'];
export function priorityRank(value?:Priority){return priorities.findIndex(p=>p.value===(value??'none'));}
