import {writeTaskDrag,readTaskDrag,taskDragType} from '../../src/taskDrag.ts';
const first='11111111-1111-4111-8111-111111111111';
const second='22222222-2222-4222-8222-222222222222';
function transfer(){const data=new Map<string,string>();return {effectAllowed:'none',get types(){return [...data.keys()];},setData:(type:string,value:string)=>data.set(type,value),getData:(type:string)=>data.get(type)||''} as unknown as DataTransfer;}
function equal(actual:unknown,expected:unknown){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);}
Deno.test('Task drag permits both label copy and calendar move, preserving selected tasks',()=>{
 const data=transfer();writeTaskDrag(data,[first,second,first]);equal(data.effectAllowed,'copyMove');equal(readTaskDrag(data),[first,second]);equal(data.getData('text/plain'),`${first},${second}`);
});
Deno.test('External text cannot assign a task label',()=>{
 const data=transfer();data.setData('text/plain',first);equal(readTaskDrag(data),[]);
});
Deno.test('Malformed and invalid task payloads are rejected',()=>{
 for(const value of ['{',JSON.stringify([first,'invalid']),JSON.stringify(Array(201).fill(first)),JSON.stringify({id:first})]){const data=transfer();data.setData(taskDragType,value);equal(readTaskDrag(data),[]);}
});
