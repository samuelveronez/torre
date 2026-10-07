begin;
create table public.torre_people (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 180), created_at timestamptz not null default now(), unique(user_id,id)
);
create unique index torre_people_name on public.torre_people(user_id,lower(btrim(name)));
create table public.torre_conversations (
 id uuid primary key, user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 person_id uuid not null, conversation_date date not null, state text not null default 'draft' check(state in ('draft','saved')),
 raw_text text not null default '' check(length(raw_text)<=20000), check_in text not null default '' check(length(check_in)<=20000),
 decisions text not null default '' check(length(decisions)<=20000), agreements jsonb not null default '[]' check(jsonb_typeof(agreements)='array' and jsonb_array_length(agreements)<=20),
 version integer not null default 0, last_request uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,id), foreign key(user_id,person_id) references public.torre_people(user_id,id)
);
create unique index torre_conversation_draft on public.torre_conversations(user_id,person_id) where state='draft';
create index torre_conversation_history on public.torre_conversations(user_id,person_id,conversation_date desc);
create table public.torre_conversation_tasks (
 agreement_id uuid primary key, user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 conversation_id uuid not null, task_id uuid not null,
 foreign key(user_id,conversation_id) references public.torre_conversations(user_id,id) on delete cascade,
 foreign key(user_id,task_id) references public.torre_tasks(user_id,id), unique(task_id)
);
create index torre_conversation_task_owner on public.torre_conversation_tasks(user_id,conversation_id);
alter table public.torre_people enable row level security;
alter table public.torre_conversations enable row level security;
alter table public.torre_conversation_tasks enable row level security;
create policy people_owner on public.torre_people to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy conversations_owner on public.torre_conversations to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy conversation_tasks_owner on public.torre_conversation_tasks to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update on public.torre_people,public.torre_conversations,public.torre_conversation_tasks to authenticated;
grant all on public.torre_people,public.torre_conversations,public.torre_conversation_tasks to service_role;

create function public.torre_save_conversation(p_id uuid,p_person uuid,p_date date,p_content jsonb,p_version integer,p_state text,p_create boolean,p_request uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare u uuid:=auth.uid(); r public.torre_conversations; a jsonb; old_a jsonb; actions jsonb:='[]'; task uuid; aid uuid; ids uuid[]:='{}'; n integer;
begin
 if u is null then raise exception 'Entre novamente'; end if;
 if p_request is null or p_state is null or p_state not in ('draft','saved') or p_date is null or p_content is null or p_version is null then raise exception 'Conversa inválida'; end if;
 if not exists(select 1 from public.torre_people where id=p_person and user_id=u) then raise exception 'Pessoa indisponível'; end if;
 perform pg_advisory_xact_lock(hashtextextended('torre-conversation-person:'||u::text||p_person::text,0));
 select * into r from public.torre_conversations where id=p_id and user_id=u for update;
 if found then
  if r.last_request=p_request then return to_jsonb(r); end if;
  if r.version<>p_version or r.person_id<>p_person then raise exception 'A conversa mudou em outra janela. Recarregue antes de salvar.'; end if;
 else
  if p_version<>0 then raise exception 'Conversa indisponível'; end if;
  insert into public.torre_conversations(id,user_id,person_id,conversation_date) values(p_id,u,p_person,p_date) returning * into r;
 end if;
 if jsonb_typeof(p_content->'agreements') is distinct from 'array' or jsonb_array_length(p_content->'agreements')>20 then raise exception 'Até 20 combinados'; end if;
 for a in select value from jsonb_array_elements(p_content->'agreements') loop
  aid:=(a->>'id')::uuid;
  if aid is null or aid=any(ids) or a->>'owner' is null or a->>'owner' not in ('me','other','unknown') then raise exception 'Combinado inválido'; end if;
  ids:=array_append(ids,aid);
  select task_id into task from public.torre_conversation_tasks where agreement_id=aid and user_id=u and conversation_id=p_id;
  if task is not null then
   select value into old_a from jsonb_array_elements(r.agreements) where value->>'id'=aid::text;
   if old_a is null then raise exception 'Vínculo de tarefa inválido'; end if;
   a:=old_a;
  else
   a:=a-'taskId';
   if p_create and coalesce((a->>'createTask')::boolean,false) then
    if a->>'owner'='unknown' then raise exception 'Defina o responsável antes de criar a tarefa'; end if;
    if a->>'owner'='other' and (nullif(btrim(a->>'person'),'') is null or nullif(a->>'followUp','') is null) then raise exception 'Informe responsável e acompanhamento'; end if;
    n:=coalesce((a->>'minutes')::integer,30);
    insert into public.torre_tasks(user_id,title,description,area,duration_minutes,due_date,status,waiting_for,follow_up_date)
    values(u,btrim(a->>'title'),coalesce(a->>'sourceText',''),'professional',n,nullif(a->>'due','')::date,
      case when a->>'owner'='other' then 'waiting' else 'todo' end,
      case when a->>'owner'='other' then btrim(a->>'person') else null end,
      case when a->>'owner'='other' then nullif(a->>'followUp','')::date else null end) returning id into task;
    insert into public.torre_conversation_tasks(agreement_id,user_id,conversation_id,task_id) values(aid,u,p_id,task);
    a:=a||jsonb_build_object('taskId',task,'createTask',false);
   end if;
  end if;
  actions:=actions||jsonb_build_array(a);
 end loop;
 if exists(select 1 from public.torre_conversation_tasks where conversation_id=p_id and user_id=u and not(agreement_id=any(ids))) then raise exception 'Preserve combinados com tarefas vinculadas'; end if;
 update public.torre_conversations set conversation_date=p_date,state=p_state,raw_text=coalesce(p_content->>'raw_text',''),check_in=coalesce(p_content->>'check_in',''),decisions=coalesce(p_content->>'decisions',''),agreements=actions,version=version+1,last_request=p_request,updated_at=now() where id=p_id and user_id=u returning * into r;
 return to_jsonb(r);
end $$;
revoke all on function public.torre_save_conversation(uuid,uuid,date,jsonb,integer,text,boolean,uuid) from public,anon;
grant execute on function public.torre_save_conversation(uuid,uuid,date,jsonb,integer,text,boolean,uuid) to authenticated;
commit;
