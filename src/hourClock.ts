// Work hours are stored as fractional hours (8.5 = 08:30); quarter hours are exact in floating point.
const pad=(n:number)=>String(n).padStart(2,'0');

export function hourToClock(value:number){
 const total=Math.round(value*60);
 return `${pad(Math.floor(total/60))}:${pad(total%60)}`;
}

export function clockToHour(clock:string){
 const [h,m]=clock.split(':').map(Number);
 return h+(m||0)/60;
}

/** "08:30" or "08:30:00" from the database. */
export const dbTimeToHour=(time:string)=>clockToHour(time.slice(0,5));
export const hourToDbTime=(value:number)=>`${hourToClock(value)}:00`;

export type Lunch={enabled:boolean;start:number;end:number};
export const defaultLunch:Lunch={enabled:true,start:12,end:13.5};

/** Minutes of the lunch break that fall inside [start, end] (fractional hours). Zero when lunch is off. */
export function lunchOverlapMinutes(lunch:Lunch|undefined,start:number,end:number){
 if(!lunch?.enabled)return 0;
 return Math.max(0,Math.round((Math.min(end,lunch.end)-Math.max(start,lunch.start))*60));
}

export function hoursLabel(value:number){
 const total=Math.round(value*60);
 const h=Math.floor(total/60),m=total%60;
 return m?`${h} h ${pad(m)}`:`${h} h`;
}
