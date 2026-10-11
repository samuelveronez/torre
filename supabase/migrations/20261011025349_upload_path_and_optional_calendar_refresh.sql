-- Qualify the outer object name: a.name is the attachment display name.
alter policy torre_files_insert on storage.objects with check (
 bucket_id='torre-attachments' and exists(
  select 1 from public.torre_attachments a
  where a.path=storage.objects.name and a.user_id=(select auth.uid()) and a.state in ('uploading','error')
 ));
alter policy torre_files_read on storage.objects using (
 bucket_id='torre-attachments' and exists(
  select 1 from public.torre_attachments a
  where a.path=storage.objects.name and a.user_id=(select auth.uid())
 ));

-- Planning uses the last available calendar data; freshness is not a gate.
create or replace function public.torre_apply_week_proposal(p_user uuid,p_proposal uuid,p_tasks uuid[],p_placements jsonb default null) returns uuid[] language plpgsql set search_path='' as $$
declare p public.torre_week_proposals; r jsonb; ids uuid[]:='{}'; t public.torre_tasks; h public.torre_work_hours; prefs public.torre_preferences; local_start timestamp; local_end timestamp;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,0));
 select * into p from public.torre_week_proposals where id=p_proposal and user_id=p_user for update;
 if not found then raise exception 'Proposta não encontrada'; end if;
 if p.applied_at is not null then return array(select (value->>'taskId')::uuid from jsonb_array_elements(p.placements) where (value->>'taskId')::uuid=any(p_tasks)); end if;
 if p.expires_at<=now() or p_tasks is null or cardinality(p_tasks) not between 1 and 20 or not p_tasks<@p.task_ids then raise exception 'Proposta expirada ou seleção inválida. Gere novamente'; end if;
 perform 1 from public.torre_tasks where user_id=p_user and id=any(p.task_ids) order by id for update;
 if (public.torre_plan_snapshot(p_user,p.task_ids)-'google') is distinct from (p.snapshot-'google') then raise exception 'Tarefas ou agenda mudaram. Gere outra proposta'; end if;
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
