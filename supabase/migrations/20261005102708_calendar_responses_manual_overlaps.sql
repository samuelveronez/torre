begin;
alter table public.torre_calendar_events add column response_status text
 check(response_status in ('accepted','tentative','needsAction','declined'));
-- Freshness is required for automatic proposals, not for manual reservations.
drop trigger torre_calendar_freshness on public.torre_scheduled_blocks;
create or replace function public.torre_validate_block() returns trigger
language plpgsql set search_path = '' as $$
declare
  task_row public.torre_tasks;
  hours_row public.torre_work_hours;
  tz text;
  local_start timestamp;
  local_end timestamp;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text,0));
  if tg_table_name = 'torre_scheduled_blocks' then
    select * into task_row from public.torre_tasks where user_id = new.user_id and id = new.task_id for update;
    if not found or task_row.archived_at is not null or task_row.status <> 'todo' then raise exception 'Tarefa deve estar em A fazer' using errcode = '23514'; end if;
    if new.end_at - new.start_at <> pg_catalog.make_interval(mins => task_row.duration_minutes) then
      raise exception 'Reserva deve corresponder à duração da tarefa' using errcode = '23514';
    end if;
    select timezone into tz from public.torre_preferences where user_id = new.user_id;
    tz := coalesce(tz,'America/Sao_Paulo');
    local_start := new.start_at at time zone tz;
    local_end := new.end_at at time zone tz;
    if new.start_at < now() or local_start::date <> local_end::date or local_start::time < time '07:00' or local_end::time > time '22:00' then
      raise exception 'Reserva fora do período permitido' using errcode = '23514';
    end if;
    select * into hours_row from public.torre_work_hours where user_id = new.user_id and weekday = extract(dow from local_start)::integer;
    if task_row.area = 'professional' and (hours_row.enabled is distinct from true or local_start::time < hours_row.start_time or local_end::time > hours_row.end_time) then
      raise exception 'Fora da jornada profissional' using errcode = '23514';
    elsif task_row.area = 'personal' and hours_row.enabled = true and local_start::time < hours_row.end_time and local_end::time > hours_row.start_time then
      raise exception 'Tarefa pessoal dentro da jornada profissional' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.torre_apply_week_proposal(p_user uuid,p_proposal uuid,p_tasks uuid[],p_placements jsonb default null) returns uuid[] language plpgsql set search_path='' as $$
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
  -- Manual writes allow overlaps. Automatic application validates each placement
  -- under the same per-user lock; previous placements in this transaction count.
  if exists(select 1 from public.torre_busy_blocks b where b.user_id=p_user and b.start_at<(r->>'end')::timestamptz and b.end_at>(r->>'start')::timestamptz)
     or exists(select 1 from public.torre_scheduled_blocks b where b.user_id=p_user and b.start_at<(r->>'end')::timestamptz and b.end_at>(r->>'start')::timestamptz) then
   raise exception 'Horário ocupado na proposta. Ajuste o horário ou reserve manualmente.' using errcode='23514';
  end if;
  insert into public.torre_scheduled_blocks(user_id,task_id,start_at,end_at) values(p_user,t.id,(r->>'start')::timestamptz,(r->>'end')::timestamptz);
  ids:=array_append(ids,t.id);
 end loop;
 if cardinality(ids)<>cardinality(p_tasks) then raise exception 'Selecione apenas tarefas com horário proposto'; end if;
 update public.torre_week_proposals set applied_at=now() where id=p.id;
 return ids;
end $$;

create or replace function public.torre_apply_calendar(p_user uuid,p_start timestamptz,p_end timestamptz,p_events jsonb) returns integer language plpgsql set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,0));
 -- A calendar refresh must never erase a user's deliberate reservation.
 delete from public.torre_busy_blocks where user_id=p_user and source='google_calendar' and
  ((start_at<p_end and end_at>p_start) or exists(select 1 from jsonb_to_recordset(p_events) as e(calendar_id text,id text) where e.calendar_id=torre_busy_blocks.calendar_id and e.id=torre_busy_blocks.external_id));
 delete from public.torre_calendar_events where user_id=p_user and start_at<p_end and end_at>p_start;
 insert into public.torre_calendar_events(user_id,calendar_id,id,title,location,start_at,end_at,all_day,blocks_time,response_status)
 select p_user,e.calendar_id,e.id,e.title,e.location,e.start_at,e.end_at,e.all_day,e.blocks_time and e.response_status is distinct from 'declined',e.response_status
 from jsonb_to_recordset(p_events) e(calendar_id text,id text,title text,location text,start_at timestamptz,end_at timestamptz,all_day boolean,blocks_time boolean,response_status text)
 on conflict(user_id,calendar_id,id) do update set title=excluded.title,location=excluded.location,start_at=excluded.start_at,end_at=excluded.end_at,all_day=excluded.all_day,blocks_time=excluded.blocks_time,response_status=excluded.response_status;
 insert into public.torre_busy_blocks(user_id,start_at,end_at,source,calendar_id,external_id)
 select user_id,start_at,end_at,'google_calendar',calendar_id,id from public.torre_calendar_events where user_id=p_user and start_at<p_end and end_at>p_start and blocks_time;
 update public.torre_google_status set calendar_synced_at=now(),range_start=p_start,range_end=p_end,error=null,notice=null where user_id=p_user;
 return 0;
end $$;

create or replace function public.torre_calendar_privacy() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (new.mode,new.selected,new.blocks_time) is distinct from (old.mode,old.selected,old.blocks_time) then
  if new.mode='busy' or not new.selected then update public.torre_calendar_events set title='Ocupado',location=null,response_status=null where user_id=new.user_id and calendar_id=new.id; end if;
  update public.torre_google_status set calendar_synced_at=null where user_id=new.user_id;
 end if;
 return new;
end $$;
commit;
