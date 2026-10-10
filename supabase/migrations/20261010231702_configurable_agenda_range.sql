alter table public.torre_preferences
 add column agenda_start_hour integer not null default 7,
 add column agenda_end_hour integer not null default 22,
 add constraint torre_agenda_range check(agenda_start_hour>=0 and agenda_end_hour<=24 and agenda_end_hour>agenda_start_hour);

create or replace function public.torre_validate_block() returns trigger
language plpgsql set search_path='' as $$
declare t public.torre_tasks; p public.torre_preferences; a timestamp; b timestamp;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text,0));
 if tg_table_name<>'torre_scheduled_blocks' then return new; end if;
 select * into t from public.torre_tasks where user_id=new.user_id and id=new.task_id for update;
 if not found or t.archived_at is not null or t.status='completed' then raise exception 'Tarefa indisponível' using errcode='23514'; end if;
 if t.status='waiting' and new.kind<>'reminder' then raise exception 'Aguardando resposta admite somente lembrete' using errcode='23514'; end if;
 if new.end_at-new.start_at<>pg_catalog.make_interval(mins=>t.duration_minutes) then raise exception 'Reserva deve corresponder à duração' using errcode='23514'; end if;
 -- Existing times may be retained while editing. New reservations must be future.
 if tg_op='INSERT' then
  if new.start_at<now() then raise exception 'Escolha um horário futuro' using errcode='23514'; end if;
 elsif new.start_at is distinct from old.start_at and new.start_at<now() then
  raise exception 'Escolha um horário futuro' using errcode='23514';
 end if;
 select * into p from public.torre_preferences where user_id=new.user_id;
 a:=new.start_at at time zone coalesce(p.timezone,'America/Sao_Paulo');
 b:=new.end_at at time zone coalesce(p.timezone,'America/Sao_Paulo');
 if new.kind='execution' and (a::time<pg_catalog.make_time(coalesce(p.agenda_start_hour,7),0,0)
  or new.end_at>(a::date::timestamp+pg_catalog.make_interval(hours=>coalesce(p.agenda_end_hour,22))) at time zone coalesce(p.timezone,'America/Sao_Paulo')) then
  raise exception 'Horário fora da faixa configurada' using errcode='23514';
 end if;
 return new;
end $$;

-- Task fields and its reservation are saved together, so failed bookings cannot
-- leave a partially edited task. RLS and the explicit owner check both apply.
create or replace function public.torre_save_task(p_task uuid,p_fields jsonb,p_at timestamptz default null,p_kind text default 'execution')
returns void language plpgsql set search_path='' as $$
declare owner uuid:=(select auth.uid()); t public.torre_tasks; existing boolean;
begin
 if owner is null then raise exception 'Entre na Torre'; end if;
 select * into t from public.torre_tasks where id=p_task and user_id=owner for update;
 existing:=found;
 if not existing then
  t:=jsonb_populate_record(null::public.torre_tasks,jsonb_build_object('area','personal','duration_minutes',30,'description','','status','todo','priority','none'));
 end if;
 t:=jsonb_populate_record(t,p_fields);
 if p_at is null then delete from public.torre_scheduled_blocks where user_id=owner and task_id=p_task; end if;
 if existing then
  update public.torre_tasks set title=t.title,description=t.description,reference_url=t.reference_url,area=t.area,duration_minutes=t.duration_minutes,due_date=t.due_date,status=t.status,waiting_for=t.waiting_for,follow_up_date=t.follow_up_date,priority=t.priority,focus_date=t.focus_date where id=p_task and user_id=owner;
 else
  insert into public.torre_tasks(id,user_id,title,description,reference_url,area,duration_minutes,due_date,status,waiting_for,follow_up_date,priority,focus_date)
  values(p_task,owner,t.title,t.description,t.reference_url,t.area,t.duration_minutes,t.due_date,t.status,t.waiting_for,t.follow_up_date,t.priority,t.focus_date);
 end if;
 if p_at is not null and t.status<>'completed' then
  -- Preserve unchanged existing blocks even after the displayed range is narrowed.
  if not exists(select 1 from public.torre_scheduled_blocks where user_id=owner and task_id=p_task and start_at=p_at and end_at=p_at+pg_catalog.make_interval(mins=>t.duration_minutes) and kind=p_kind) then
   delete from public.torre_scheduled_blocks where user_id=owner and task_id=p_task;
   insert into public.torre_scheduled_blocks(user_id,task_id,start_at,end_at,kind)
   values(owner,p_task,p_at,p_at+pg_catalog.make_interval(mins=>t.duration_minutes),p_kind);
  end if;
 end if;
end $$;
revoke all on function public.torre_save_task(uuid,jsonb,timestamptz,text) from public,anon;
grant execute on function public.torre_save_task(uuid,jsonb,timestamptz,text) to authenticated;

create or replace function public.torre_apply_week_proposal(p_user uuid,p_proposal uuid,p_tasks uuid[],p_placements jsonb default null) returns uuid[] language plpgsql set search_path='' as $$
declare p public.torre_week_proposals; g public.torre_google_status; r jsonb; ids uuid[]:='{}'; t public.torre_tasks; h public.torre_work_hours; prefs public.torre_preferences; local_start timestamp; local_end timestamp;
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
  -- Manual writes allow overlaps. Automatic application validates each placement
  -- under the same per-user lock; previous placements in this transaction count.
  if exists(select 1 from public.torre_busy_blocks b where b.user_id=p_user and b.start_at<(r->>'end')::timestamptz and b.end_at>(r->>'start')::timestamptz)
     or exists(select 1 from public.torre_scheduled_blocks b where b.user_id=p_user and b.kind='execution' and b.start_at<(r->>'end')::timestamptz and b.end_at>(r->>'start')::timestamptz) then
   raise exception 'Horário ocupado na proposta. Ajuste o horário ou reserve manualmente.' using errcode='23514';
  end if;
  select * into prefs from public.torre_preferences where user_id=p_user;
  local_start:=(r->>'start')::timestamptz at time zone coalesce(prefs.timezone,'America/Sao_Paulo');
  local_end:=(r->>'end')::timestamptz at time zone coalesce(prefs.timezone,'America/Sao_Paulo');
  select * into h from public.torre_work_hours where user_id=p_user and weekday=extract(dow from local_start)::integer;
  if (t.area='professional' and (h.enabled is distinct from true or local_start::time<h.start_time or local_end::time>h.end_time or local_end::date<>local_start::date)) or (t.area='personal' and h.enabled and local_start::time<h.end_time and local_end::time>h.start_time) then raise exception 'A proposta deve respeitar a jornada'; end if;
  insert into public.torre_scheduled_blocks(user_id,task_id,start_at,end_at) values(p_user,t.id,(r->>'start')::timestamptz,(r->>'end')::timestamptz);
  ids:=array_append(ids,t.id);
 end loop;
 if cardinality(ids)<>cardinality(p_tasks) then raise exception 'Selecione apenas tarefas com horário proposto'; end if;
 update public.torre_week_proposals set applied_at=now() where id=p.id;
 return ids;
end $$;
