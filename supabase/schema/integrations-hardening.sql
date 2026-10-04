begin;
alter table public.torre_attachments add column ordinal smallint not null default 0 check(ordinal between 0 and 9);
create unique index torre_attachment_ordinal on public.torre_attachments(capture_id,ordinal);
create function public.torre_set_task_labels(p_task uuid,p_labels uuid[]) returns void language plpgsql set search_path='' as $$
declare owner uuid;
begin
 select user_id into owner from public.torre_tasks where id=p_task and user_id=auth.uid() for update;
 if owner is null then raise exception 'Tarefa não encontrada'; end if;
 if exists(select 1 from unnest(p_labels) x where not exists(select 1 from public.torre_labels where id=x and user_id=owner)) then raise exception 'Label inválida'; end if;
 delete from public.torre_task_labels where task_id=p_task;
 insert into public.torre_task_labels(user_id,task_id,label_id) select owner,p_task,x from (select distinct unnest(p_labels) x) z;
end $$;
revoke all on function public.torre_set_task_labels(uuid,uuid[]) from public,anon;
grant execute on function public.torre_set_task_labels(uuid,uuid[]) to authenticated;
create function public.torre_require_fresh_calendar() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user='authenticated' and exists(select 1 from public.torre_google_status where user_id=new.user_id and connected and (calendar_synced_at is null or calendar_synced_at<now()-interval '5 minutes' or error is not null or range_start>new.start_at or range_end<new.end_at)) then raise exception 'Atualize a agenda antes de reservar um horário'; end if;
 return new;
end $$;
create trigger torre_calendar_freshness before insert or update on public.torre_scheduled_blocks for each row execute function public.torre_require_fresh_calendar();
create function public.torre_calendar_privacy() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (new.mode,new.selected,new.blocks_time) is distinct from (old.mode,old.selected,old.blocks_time) then
  if new.mode='busy' or not new.selected then update public.torre_calendar_events set title='Ocupado',location=null where user_id=new.user_id and calendar_id=new.id; end if;
  update public.torre_google_status set calendar_synced_at=null where user_id=new.user_id;
 end if;
 return new;
end $$;
create trigger torre_calendar_privacy after update on public.torre_calendars for each row execute function public.torre_calendar_privacy();
revoke all on function public.torre_calendar_privacy(),public.torre_require_fresh_calendar(),public.torre_queue_completion(),public.torre_limit_attachments(),public.torre_task_google_guard() from public,anon,authenticated;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
select vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'torre_worker_token');
create function public.torre_worker_authorized(p_token text) returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from vault.decrypted_secrets where name='torre_worker_token' and decrypted_secret=p_token);
$$;
revoke all on function public.torre_worker_authorized(text) from public,anon,authenticated;
grant execute on function public.torre_worker_authorized(text) to service_role;
select cron.schedule('torre-completion-worker','*/5 * * * *', $job$
 select net.http_post(url:='https://nvxwqrpztecrvrxoddxf.supabase.co/functions/v1/torre-google-worker',headers:=jsonb_build_object('Content-Type','application/json','x-torre-worker',(select decrypted_secret from vault.decrypted_secrets where name='torre_worker_token')),body:='{}'::jsonb);
$job$);
commit;
