-- Leitura somente-leitura das tarefas pessoais abertas com a label Família, para o app da TV.
-- A TV chama a RPC com a chave publishable e um token; só o hash do token fica no banco.
begin;

create table public.torre_tv_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash bytea not null unique,
  label_name text not null default 'Família' check (length(btrim(label_name)) between 1 and 60),
  created_at timestamptz not null default now()
);
alter table public.torre_tv_tokens enable row level security;
revoke all on public.torre_tv_tokens from anon, authenticated;

create function public.torre_tv_tasks(p_token text)
returns table (
  id uuid,
  title text,
  description text,
  due_date date,
  status text,
  waiting_for text,
  follow_up_date date,
  priority text,
  duration_minutes integer,
  labels jsonb
)
language sql stable security definer set search_path = '' as $$
  select
    t.id, t.title, t.description, t.due_date, t.status, t.waiting_for,
    t.follow_up_date, t.priority, t.duration_minutes,
    (
      select coalesce(jsonb_agg(l2.name order by l2.name), '[]'::jsonb)
      from public.torre_task_labels tl2
      join public.torre_labels l2 on l2.id = tl2.label_id and l2.user_id = tl2.user_id and not l2.archived
      where tl2.task_id = t.id and tl2.user_id = t.user_id
    )
  from public.torre_tv_tokens k
  join public.torre_tasks t on t.user_id = k.user_id
  where k.token_hash = sha256(convert_to(coalesce(p_token, ''), 'utf8'))
    and t.area = 'personal'
    and t.status in ('todo', 'waiting')
    and t.archived_at is null
    and exists (
      select 1
      from public.torre_task_labels tl
      join public.torre_labels l on l.id = tl.label_id and l.user_id = tl.user_id
      where tl.task_id = t.id and tl.user_id = t.user_id
        and not l.archived
        and lower(l.name) = lower(k.label_name)
    )
  order by t.due_date nulls last, t.created_at
  limit 200
$$;

revoke all on function public.torre_tv_tasks(text) from public;
grant execute on function public.torre_tv_tasks(text) to anon, authenticated;

commit;
