import {labelMatchesArea} from '../../src/labelArea.ts';
function assert(x:unknown){if(!x)throw new Error('Assertion failed');}
Deno.test('Labels follow the main area filter and preserve legacy shared labels',()=>{
 for(const area of ['Tudo','Pessoal','Profissional']){assert(labelMatchesArea({area:'both'},area));assert(labelMatchesArea({},area));}
 assert(labelMatchesArea({area:'personal'},'Tudo'));assert(labelMatchesArea({area:'professional'},'Tudo'));
 assert(labelMatchesArea({area:'personal'},'Pessoal'));assert(!labelMatchesArea({area:'personal'},'Profissional'));
 assert(labelMatchesArea({area:'professional'},'Profissional'));assert(!labelMatchesArea({area:'professional'},'Pessoal'));
});
