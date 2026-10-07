import type {Label} from './features';
export function labelMatchesArea(label:Pick<Label,'area'>,area:string){return area==='Tudo'||!label.area||label.area==='both'||label.area===(area==='Pessoal'?'personal':'professional');}
