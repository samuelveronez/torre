import {createContext} from 'react';
import type {Priority} from './priority';
export const PriorityContext=createContext<((id:string,priority:Priority)=>Promise<boolean>)|null>(null);
