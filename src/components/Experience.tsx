import type {ReactNode} from 'react';
import {Alert} from './ui/alert';
import {Button} from './ui/button';
export function PageHeading({title,actions}:{title:string;actions?:ReactNode}){return <div className="heading"><h1>{title}</h1>{actions}</div>;}
export function Field({label,children}:{label:string;children:ReactNode}){return <label className="ui-field"><span>{label}</span>{children}</label>;}
export function EmptyState({children}:{children:ReactNode}){return <p className="section-empty">{children}</p>;}
export function HiddenReservations({count,onClear}:{count:number;onClear:()=>void}){return count>0?<Alert className="hidden-reservations"><span>{count} reserva{count>1?'s':''} oculta{count>1?'s':''} pelos filtros. Esta visão não mostra toda a ocupação.</span><Button variant="outline" onClick={onClear}>Limpar filtros</Button></Alert>:null;}
