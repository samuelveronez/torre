begin;
alter table public.torre_ai_settings add column capture_profile text check(capture_profile in ('free','luna','gemini'));
update public.torre_ai_settings set capture_profile=case when default_model='google/gemini-2.5-flash' then 'gemini' else 'free' end;
alter table public.torre_captures add column ai_profile text check(ai_profile in ('free','luna','gemini'));
alter table public.torre_captures add column triage_reference_date date;
alter table public.torre_captures add column triage_summary jsonb;
create table public.torre_task_people (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 task_id uuid not null,person_id uuid,name text not null check(length(btrim(name)) between 1 and 180),
 role text not null check(role in ('involved','waiting_for')),
 foreign key(user_id,task_id) references public.torre_tasks(user_id,id) on delete cascade,
 foreign key(user_id,person_id) references public.torre_people(user_id,id)
);
create index torre_task_people_task on public.torre_task_people(user_id,task_id);
create index torre_task_people_person on public.torre_task_people(user_id,person_id) where person_id is not null;
create unique index torre_task_people_name_role on public.torre_task_people(user_id,task_id,lower(btrim(name)),role);
alter table public.torre_task_people enable row level security;
create policy task_people_owner on public.torre_task_people to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
revoke all on public.torre_task_people from public,anon,authenticated;
grant select on public.torre_task_people to authenticated;
grant all on public.torre_task_people to service_role;
create function public.torre_set_task_people_internal(p_user uuid,p_task uuid,p_people jsonb) returns void language plpgsql set search_path='' as $$
declare entry jsonb;
begin
 if not exists(select 1 from public.torre_tasks where id=p_task and user_id=p_user and archived_at is null) then raise exception 'Tarefa indisponível'; end if;
 if jsonb_typeof(p_people) is distinct from 'array' or jsonb_array_length(p_people)>60 then raise exception 'Pessoas inválidas'; end if;
 delete from public.torre_task_people where user_id=p_user and task_id=p_task;
 for entry in select value from jsonb_array_elements(p_people) loop
  if jsonb_typeof(entry->'name') is distinct from 'string' or length(btrim(entry->>'name')) not between 1 and 180 or coalesce(entry->>'role','') not in ('involved','waiting_for') then raise exception 'Pessoa inválida'; end if;
  if entry->>'personId' is not null and not exists(select 1 from public.torre_people where user_id=p_user and id=(entry->>'personId')::uuid) then raise exception 'Pessoa não pertence à conta'; end if;
  insert into public.torre_task_people(user_id,task_id,person_id,name,role) values(p_user,p_task,(entry->>'personId')::uuid,btrim(entry->>'name'),entry->>'role');
 end loop;
end $$;
revoke all on function public.torre_set_task_people_internal(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.torre_set_task_people_internal(uuid,uuid,jsonb) to service_role;
create function public.torre_set_task_people(p_task uuid,p_people jsonb) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=(select auth.uid());
begin
 if u is null then raise exception 'Entre na Torre'; end if;
 perform public.torre_set_task_people_internal(u,p_task,p_people);
end $$;
revoke all on function public.torre_set_task_people(uuid,jsonb) from public,anon;
grant execute on function public.torre_set_task_people(uuid,jsonb) to authenticated;
create function public.torre_claim_capture(p_user uuid,p_capture uuid,p_token uuid,p_profile text default null) returns jsonb language plpgsql set search_path='' as $$
declare c public.torre_captures; ids uuid[]; profile text;
begin
 select * into c from public.torre_captures where id=p_capture and user_id=p_user for update;
 if not found then raise exception 'Captura não encontrada'; end if;
 select array_agg(id order by capture_position) into ids from public.torre_tasks where capture_id=c.id and archived_at is null;
 if ids is not null then return jsonb_build_object('taskIds',ids,'taskId',ids[1]); end if;
 if c.triage_until>now() then raise exception 'Esta captura já está sendo processada'; end if;
 if nullif(btrim(c.body),'') is null or length(c.body)>20000 then raise exception 'Digite de 1 a 20 mil caracteres para usar IA'; end if;
 if exists(select 1 from public.torre_attachments where capture_id=c.id and state<>'uploaded') then raise exception 'Conclua os uploads antes da triagem'; end if;
 profile:=coalesce(p_profile,c.ai_profile,(select coalesce(capture_profile,case when default_model='google/gemini-2.5-flash' then 'gemini' else 'free' end) from public.torre_ai_settings where user_id=p_user),'free');
 if profile not in ('free','luna','gemini') then raise exception 'Perfil inválido'; end if;
 update public.torre_captures set ai_profile=profile,triage_reference_date=coalesce(triage_reference_date,(created_at at time zone 'America/Sao_Paulo')::date),triage_token=p_token,triage_until=now()+interval '180 seconds',error=null where id=c.id returning * into c;
 return jsonb_build_object('text',c.body,'mode',c.mode,'profile',c.ai_profile,'referenceDate',c.triage_reference_date);
end $$;
revoke all on function public.torre_claim_capture(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.torre_claim_capture(uuid,uuid,uuid,text) to service_role;
create or replace function public.torre_finish_triage_many(p_user uuid,p_capture uuid,p_token uuid,p_text text,p_results jsonb,p_audit jsonb) returns uuid[] language plpgsql set search_path='' as $$
declare c public.torre_captures; ids uuid[]; task uuid; labels uuid[]; r jsonb; ordinal bigint;
begin
 select * into c from public.torre_captures where id=p_capture and user_id=p_user for update;
 if not found then raise exception 'Captura não encontrada'; end if;
 select array_agg(id order by capture_position) into ids from public.torre_tasks where capture_id=c.id and archived_at is null;
 if ids is not null then return ids; end if;
 if c.triage_token is distinct from p_token or c.triage_until is null or c.triage_until<=now() or c.body is distinct from p_text or (p_audit ? 'profile' and c.ai_profile is distinct from p_audit->>'profile') then raise exception 'A captura mudou. Tente novamente'; end if;
 if exists(select 1 from public.torre_attachments where capture_id=c.id and state<>'uploaded') then raise exception 'Conclua os uploads antes da triagem'; end if;
 if jsonb_typeof(p_results) is distinct from 'array' then raise exception 'Lista inválida'; end if;
 if jsonb_array_length(p_results) not between 1 and 20 then raise exception 'De 1 a 20 tarefas por captura'; end if;
 ids:='{}';
 for r,ordinal in select value, ordinality from jsonb_array_elements(p_results) with ordinality loop
  if nullif(btrim(r->>'title'),'') is null or length(r->>'title')>180 or jsonb_typeof(r->'description') is distinct from 'string' or jsonb_typeof(r->'labelIds') is distinct from 'array' or coalesce(r->>'area','personal') not in ('personal','professional') then raise exception 'Tarefa inválida'; end if;
  if coalesce(r->>'situation','todo') not in ('todo','waiting') then raise exception 'Situação inválida'; end if;
  if r->>'situation'='waiting' and (jsonb_typeof(r->'waitingFor') is distinct from 'string' or nullif(btrim(r->>'waitingFor'),'') is null or length(r->>'waitingFor')>180 or jsonb_typeof(r->'followUpDate') is distinct from 'string' or coalesce(r->>'followUpDate','') !~ '^\d{4}-\d{2}-\d{2}$') then raise exception 'Espera sem responsável ou acompanhamento'; end if;
  if r->>'dueDate' is not null and (jsonb_typeof(r->'dueDate') is distinct from 'string' or (r->>'dueDate') !~ '^\d{4}-\d{2}-\d{2}$') then raise exception 'Prazo inválido'; end if;
  select coalesce(array_agg(x::uuid),'{}'::uuid[]) into labels from jsonb_array_elements_text(r->'labelIds') x;
  if exists(select 1 from unnest(labels) x where not exists(select 1 from public.torre_labels where id=x and user_id=p_user and not archived)) then raise exception 'Labels alteradas. Tente novamente'; end if;
  insert into public.torre_tasks(user_id,capture_id,capture_position,title,description,area,duration_minutes,due_date,status,waiting_for,follow_up_date) values(p_user,c.id,ordinal-1,r->>'title',r->>'description',coalesce(r->>'area','personal'),30,nullif(r->>'dueDate','')::date,coalesce(r->>'situation','todo'),case when r->>'situation'='waiting' then btrim(r->>'waitingFor') end,case when r->>'situation'='waiting' then (r->>'followUpDate')::date end) returning id into task;
  insert into public.torre_task_labels(user_id,task_id,label_id) select p_user,task,x from (select distinct unnest(labels) x) z;
  if r ? 'people' then perform public.torre_set_task_people_internal(p_user,task,r->'people'); end if;
  insert into public.torre_triage_history(user_id,capture_id,task_id,method,result) values(p_user,c.id,task,'ai',jsonb_build_object('classification',r,'audit',p_audit,'position',ordinal-1));
  ids:=array_append(ids,task);
 end loop;
 update public.torre_captures set triage_summary=jsonb_build_object('profile',p_audit->>'profile','dateReview',(select coalesce(jsonb_agg(jsonb_build_object('title',x->>'title','messages',x->'dateReview')),'[]'::jsonb) from jsonb_array_elements(p_results) x where jsonb_array_length(coalesce(x->'dateReview','[]'::jsonb))>0)),state='processed',error=null,triage_token=null,triage_until=null where id=c.id;
 return ids;
end $$;

commit;
