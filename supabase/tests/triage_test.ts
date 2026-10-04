import {validateTriage} from '../functions/_shared/triage.ts';
const input={text:'Revisar documento',labels:[{id:'one',name:'Documentos',description:''}]};
function assert(value:boolean){if(!value)throw new Error('Assertion failed');}
Deno.test('Only existing labels and valid fields are accepted',()=>{
 const result=validateTriage({title:'Revisar',description:'',labelIds:['one','one']},input);assert(result.labelIds.length===1);
 for(const fields of [{labelIds:['invented']},{durationMinutes:7},{dueDate:'2026-02-30'},{title:''},{area:'invalid'}]){
  let failed=false;try{validateTriage({title:'Revisar',description:'',labelIds:[],...fields} as any,input);}catch{failed=true;}assert(failed);
 }
});
