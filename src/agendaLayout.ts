export type Interval={id:string;start:number;end:number};
export type Positioned<T>=T&{column:number;columns:number;overlaps:string[]};
export const intersects=(a:{start:number;end:number},b:{start:number;end:number})=>a.start<b.end&&a.end>b.start;

// Connected groups share a width. Reuse the first free column, with stable ties.
export function layoutIntervals<T extends Interval>(items:T[]):Positioned<T>[] {
 const sorted=items.filter(x=>Number.isFinite(x.start)&&Number.isFinite(x.end)&&x.end>x.start).slice().sort((a,b)=>a.start-b.start||b.end-a.end||a.id.localeCompare(b.id));
 const result:Positioned<T>[]=[];
 let group:Positioned<T>[]=[],ends:number[]=[],groupEnd=-Infinity;
 const flush=()=>{for(const item of group){item.columns=ends.length;item.overlaps=group.filter(other=>other.id!==item.id&&intersects(item,other)).map(other=>other.id);}result.push(...group);group=[];ends=[];};
 for(const item of sorted){
  if(item.start>=groupEnd){flush();groupEnd=-Infinity;}
  let column=ends.findIndex(end=>end<=item.start);if(column<0)column=ends.length;
  ends[column]=item.end;groupEnd=Math.max(groupEnd,item.end);
  group.push({...item,column,columns:1,overlaps:[]});
 }
 flush();return result;
}
