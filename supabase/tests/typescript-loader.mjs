import ts from 'typescript';
import {readFile} from 'node:fs/promises';
export async function resolve(specifier,context,next){
 try{return await next(specifier,context);}catch(error){
  if(specifier.startsWith('.')&&!specifier.endsWith('.ts'))return next(specifier+'.ts',context);
  throw error;
 }
}
export async function load(url,context,next){
 if(!url.endsWith('.ts'))return next(url,context);
 return {format:'module',shortCircuit:true,source:ts.transpileModule(await readFile(new URL(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText};
}
