begin;
alter table public.torre_captures add column mode text not null default 'list' check(mode in ('list','free'));
alter table public.torre_tasks add column capture_position integer not null default 0 check(capture_position between 0 and 19);
drop index public.torre_capture_task;
create unique index torre_capture_position on public.torre_tasks(capture_id,capture_position) where capture_id is not null and archived_at is null;
update public.torre_ai_settings set model='inception/mercury-decide:free' where provider='openrouter' and model='typesafe/jev-1.13';

create or replace function public.torre_claim_triage(p_user uuid,p_capture uuid,p_token uuid) returns jsonb language plpgsql set search_path='' as $$
declare c public.torre_captures; ids uuid[];
begin
 select * into c from public.torre_captures where id=p_capture and user_id=p_user for update;
 if not found then raise exception 'Captura não encontrada'; end if;
 select array_agg(id order by capture_position) into ids from public.torre_tasks where capture_id=c.id and archived_at is null;
 if ids is not null then return jsonb_build_object('taskIds',ids,'taskId',ids[1]); end if;
 if c.triage_until>now() then raise exception 'Esta captura já está sendo processada'; end if;
 if nullif(btrim(c.body),'') is null or length(c.body)>20000 then raise exception 'Digite de 1 a 20 mil caracteres para usar IA'; end if;
 if exists(select 1 from public.torre_attachments where capture_id=c.id and state<>'uploaded') then raise exception 'Conclua os uploads antes da triagem'; end if;
 update public.torre_captures set triage_token=p_token,triage_until=now()+interval '120 seconds',error=null where id=c.id;
 return jsonb_build_object('text',c.body,'mode',c.mode);
end $$;

create function public.torre_finish_triage_many(p_user uuid,p_capture uuid,p_token uuid,p_text text,p_results jsonb,p_audit jsonb) returns uuid[] language plpgsql set search_path='' as $$
declare c public.torre_captures; ids uuid[]; task uuid; labels uuid[]; r jsonb; ordinal bigint;
begin
 select * into c from public.torre_captures where id=p_capture and user_id=p_user for update;
 if not found then raise exception 'Captura não encontrada'; end if;
 select array_agg(id order by capture_position) into ids from public.torre_tasks where capture_id=c.id and archived_at is null;
 if ids is not null then return ids; end if;
 if c.triage_token is distinct from p_token or c.triage_until is null or c.triage_until<=now() or c.body is distinct from p_text then raise exception 'A captura mudou. Tente novamente'; end if;
 if exists(select 1 from public.torre_attachments where capture_id=c.id and state<>'uploaded') then raise exception 'Conclua os uploads antes da triagem'; end if;
 if jsonb_typeof(p_results) is distinct from 'array' then raise exception 'Lista inválida'; end if;
 if jsonb_array_length(p_results) not between 1 and 20 then raise exception 'De 1 a 20 tarefas por captura'; end if;
 ids:='{}';
 for r,ordinal in select value, ordinality from jsonb_array_elements(p_results) with ordinality loop
  if nullif(btrim(r->>'title'),'') is null or length(r->>'title')>180 or jsonb_typeof(r->'description') is distinct from 'string' or jsonb_typeof(r->'labelIds') is distinct from 'array' or coalesce(r->>'area','personal') not in ('personal','professional') then raise exception 'Tarefa inválida'; end if;
  select coalesce(array_agg(x::uuid),'{}'::uuid[]) into labels from jsonb_array_elements_text(r->'labelIds') x;
  if exists(select 1 from unnest(labels) x where not exists(select 1 from public.torre_labels where id=x and user_id=p_user and not archived)) then raise exception 'Labels alteradas. Tente novamente'; end if;
  insert into public.torre_tasks(user_id,capture_id,capture_position,title,description,area,duration_minutes) values(p_user,c.id,ordinal-1,r->>'title',r->>'description',coalesce(r->>'area','personal'),30) returning id into task;
  insert into public.torre_task_labels(user_id,task_id,label_id) select p_user,task,x from (select distinct unnest(labels) x) z;
  insert into public.torre_triage_history(user_id,capture_id,task_id,method,result) values(p_user,c.id,task,'ai',jsonb_build_object('classification',r,'audit',p_audit,'position',ordinal-1));
  ids:=array_append(ids,task);
 end loop;
 update public.torre_captures set state='processed',error=null,triage_token=null,triage_until=null where id=c.id;
 return ids;
end $$;
revoke all on function public.torre_finish_triage_many(uuid,uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.torre_finish_triage_many(uuid,uuid,uuid,text,jsonb,jsonb) to service_role;
-- The old single-result entrypoint stays compatible during backend rollout.
create or replace function public.torre_finish_triage(p_user uuid,p_capture uuid,p_token uuid,p_text text,p_result jsonb,p_audit jsonb) returns uuid language plpgsql set search_path='' as $$
begin return (public.torre_finish_triage_many(p_user,p_capture,p_token,p_text,jsonb_build_array(p_result||jsonb_build_object('description',coalesce(p_result->>'description',p_text))),p_audit))[1]; end $$;

create or replace function public.torre_undo_capture(p_capture uuid) returns void language plpgsql set search_path='' as $$
declare c public.torre_captures; task uuid;
begin
 select * into c from public.torre_captures where id=p_capture and user_id=(select auth.uid()) for update;
 if not found then raise exception 'Captura não encontrada'; end if;
 for task in select id from public.torre_tasks where capture_id=c.id and archived_at is null loop
  delete from public.torre_scheduled_blocks where task_id=task;
  update public.torre_tasks set archived_at=now() where id=task;
  insert into public.torre_triage_history(user_id,capture_id,task_id,method) values(c.user_id,c.id,task,'undo');
 end loop;
 update public.torre_captures set state='inbox',error=null,triage_token=null,triage_until=null where id=c.id;
end $$;

create table public.torre_week_proposals(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 task_ids uuid[] not null,range_start timestamptz not null,range_end timestamptz not null,
 snapshot jsonb not null,placements jsonb not null,created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '20 minutes',applied_at timestamptz
);
create index torre_week_proposals_user on public.torre_week_proposals(user_id);
alter table public.torre_week_proposals enable row level security;
revoke all on public.torre_week_proposals from anon,authenticated;
grant select on public.torre_week_proposals to authenticated;
grant all on public.torre_week_proposals to service_role;
create policy torre_proposals_select on public.torre_week_proposals for select to authenticated using(user_id=(select auth.uid()));

create function public.torre_plan_snapshot(p_user uuid,p_tasks uuid[]) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object(
 'tasks',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') from public.torre_tasks t where user_id=p_user and id=any(p_tasks)),
 'blocks',(select coalesce(jsonb_agg(to_jsonb(b) order by id),'[]') from public.torre_scheduled_blocks b where user_id=p_user),
 'hours',(select coalesce(jsonb_agg(to_jsonb(h) order by weekday),'[]') from public.torre_work_hours h where user_id=p_user),
 'busy',(select coalesce(jsonb_agg(to_jsonb(b) order by id),'[]') from public.torre_busy_blocks b where user_id=p_user),
 'google',(select to_jsonb(g) from public.torre_google_status g where user_id=p_user),
 'preferences',(select to_jsonb(p) from public.torre_preferences p where user_id=p_user));
$$;
create function public.torre_apply_week_proposal(p_user uuid,p_proposal uuid,p_tasks uuid[],p_placements jsonb default null) returns uuid[] language plpgsql set search_path='' as $$
declare p public.torre_week_proposals; g public.torre_google_status; r jsonb; ids uuid[]:='{}'; t public.torre_tasks;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,0));
 select * into p from public.torre_week_proposals where id=p_proposal and user_id=p_user for update;
 if not found then raise exception 'Proposta não encontrada'; end if;
 if p.applied_at is not null then return array(select (value->>'taskId')::uuid from jsonb_array_elements(p.placements) where (value->>'taskId')::uuid=any(p_tasks)); end if;
 if p.expires_at<=now() or p_tasks is null or cardinality(p_tasks) not between 1 and 20 or not p_tasks<@p.task_ids then raise exception 'Proposta expirada ou seleção inválida. Gere novamente'; end if;
 perform 1 from public.torre_tasks where user_id=p_user and id=any(p.task_ids) order by id for update;
 if public.torre_plan_snapshot(p_user,p.task_ids) is distinct from p.snapshot then raise exception 'Tarefas ou agenda mudaram. Gere outra proposta'; end if;
 select * into g from public.torre_google_status where user_id=p_user;
 if g.connected and (g.calendar_synced_at is null or g.calendar_synced_at<now()-interval '5 minutes' or g.error is not null or g.range_start>p.range_start or g.range_end<p.range_end) then raise exception 'Atualize a agenda e gere outra proposta'; end if;
 if p_placements is not null and (jsonb_typeof(p_placements)<>'array' or jsonb_array_length(p_placements)>20) then raise exception 'Horários inválidos'; end if;
 for r in select value from jsonb_array_elements(coalesce(p_placements,p.placements)) where (value->>'taskId')::uuid=any(p_tasks) loop
  if not exists(select 1 from jsonb_array_elements(p.placements) where value->>'taskId'=r->>'taskId') then raise exception 'Tarefa sem horário proposto'; end if;
  select * into t from public.torre_tasks where user_id=p_user and id=(r->>'taskId')::uuid;
  if not found or t.archived_at is not null or t.status<>'todo' or exists(select 1 from public.torre_scheduled_blocks where task_id=t.id) then raise exception 'Tarefa alterada. Gere outra proposta'; end if;
  if (r->>'start')::timestamptz<p.range_start or (r->>'end')::timestamptz>p.range_end then raise exception 'Horário inválido'; end if;
  insert into public.torre_scheduled_blocks(user_id,task_id,start_at,end_at) values(p_user,t.id,(r->>'start')::timestamptz,(r->>'end')::timestamptz);
  ids:=array_append(ids,t.id);
 end loop;
 if cardinality(ids)<>cardinality(p_tasks) then raise exception 'Selecione apenas tarefas com horário proposto'; end if;
 update public.torre_week_proposals set applied_at=now() where id=p.id;
 return ids;
end $$;
revoke all on function public.torre_plan_snapshot(uuid,uuid[]),public.torre_apply_week_proposal(uuid,uuid,uuid[],jsonb) from public,anon,authenticated;
grant execute on function public.torre_plan_snapshot(uuid,uuid[]),public.torre_apply_week_proposal(uuid,uuid,uuid[],jsonb) to service_role;
commit;
