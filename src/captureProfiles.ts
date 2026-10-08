export type CaptureProfile='free'|'luna'|'gemini';
export const captureProfileNames:Record<CaptureProfile,string>={free:'Gratuito · Mercury Decide',luna:'Luna Decisions · econômico',gemini:'Gemini 2.5 Flash · pago'};
export function captureDefault(ai:{capture_profile?:CaptureProfile|null;default_model?:string}|null):CaptureProfile{return ai?.capture_profile??(ai?.default_model==='google/gemini-2.5-flash'?'gemini':'free');}
