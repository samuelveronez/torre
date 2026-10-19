import {Sun,Inbox,ListChecks,CalendarDays,Users,Sparkles,Settings} from 'lucide-react';

// key é o valor salvo em `page` (não renomear); label é o texto exibido.
export const navItems=[
 {key:'Home',label:'Meu dia',icon:Sun,group:'main'},
 {key:'Caixa de entrada',label:'Caixa de entrada',icon:Inbox,group:'main'},
 {key:'Tarefas',label:'Tarefas',icon:ListChecks,group:'main'},
 {key:'Planejamento',label:'Agenda semanal',icon:CalendarDays,group:'main'},
 {key:'Conversas',label:'Pessoas e conversas',icon:Users,group:'main'},
 {key:'Modo IA',label:'Modo IA',icon:Sparkles,group:'assistant'},
 {key:'Configurações',label:'Configurações',icon:Settings,group:'footer'},
] as const;

export type NavItem=typeof navItems[number];

export type ShellCounts={home:number;inbox:number;tasks:number;labels:Record<string,number>};
