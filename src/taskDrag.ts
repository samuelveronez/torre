export const taskDragType='application/x-torre-task-ids';
const validId=(id:unknown):id is string=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export function writeTaskDrag(transfer:DataTransfer,ids:string[]){const values=Array.from(new Set(ids.filter(validId)));transfer.effectAllowed='copyMove';transfer.setData(taskDragType,JSON.stringify(values));transfer.setData('text/plain',values.join(','));}
export function isTaskDrag(transfer:DataTransfer){return Array.from(transfer.types).includes(taskDragType);}
export function readTaskDrag(transfer:DataTransfer):string[]{if(!isTaskDrag(transfer))return [];try{const value:unknown=JSON.parse(transfer.getData(taskDragType));if(!Array.isArray(value)||value.length>200||value.some(id=>!validId(id)))return [];return Array.from(new Set(value));}catch{return [];}}
