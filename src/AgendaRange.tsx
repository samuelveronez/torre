import {createContext,useContext} from 'react';
export type AgendaRange={start:number;end:number};
export const defaultAgendaRange:AgendaRange={start:7,end:22};
export const AgendaRangeContext=createContext(defaultAgendaRange);
export const useAgendaRange=()=>useContext(AgendaRangeContext);
