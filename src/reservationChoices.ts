import type {Task} from './task';
export function needsReservationChoice(before:Task,after:Task){
 return !!before.at&&!after.done&&!!after.at&&(before.area!==after.area||before.minutes!==after.minutes||(before.situation??'todo')!==(after.situation??'todo'));
}
export function chooseReservation(task:Task,keep:boolean):Task{
 return {...task,at:keep?task.at:undefined,reservationKind:keep?(task.situation==='waiting'?'reminder':'execution'):undefined};
}
