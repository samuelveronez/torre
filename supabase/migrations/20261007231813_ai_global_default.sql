alter table public.torre_ai_settings add column default_model text not null default 'openrouter/free' check(default_model in ('openrouter/free','google/gemini-2.5-flash'));
