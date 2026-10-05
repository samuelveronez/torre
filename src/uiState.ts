import {useEffect,useState,type Dispatch,type SetStateAction} from 'react';
export function usePreference<T>(userId:string,name:string,fallback:T):[T,Dispatch<SetStateAction<T>>]{
 const key=`torre:${userId}:${name}`;
 const [value,setValue]=useState<T>(()=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch{return fallback;}});
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Storage unavailable: keep the current session preference. */}},[key,value]);
 return [value,setValue];
}
