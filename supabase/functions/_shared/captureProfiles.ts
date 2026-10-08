export type CaptureProfile='free'|'luna'|'gemini';
export const captureModels={free:{generator:'openrouter/free',classifier:'inception/mercury-decide:free'},luna:{generator:'openai/gpt-6-luna',classifier:'openai/gpt-6-luna-decisions'},gemini:{generator:'google/gemini-2.5-flash',classifier:'google/gemini-2.5-flash'}} as const;
export function captureProfile(value:unknown):CaptureProfile{if(value==='free'||value==='luna'||value==='gemini')return value;throw new Error('Escolha Gratuito, Luna Decisions ou Gemini para esta captura.');}
export function defaultCaptureProfile(settings:any):CaptureProfile{return settings?.capture_profile?captureProfile(settings.capture_profile):settings?.default_model==='google/gemini-2.5-flash'?'gemini':'free';}
