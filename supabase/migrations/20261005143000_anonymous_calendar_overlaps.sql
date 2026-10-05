-- Separate anonymous event display from canonical FreeBusy intervals.
create or replace function public.torre_apply_calendar(p_user uuid,p_start timestamptz,p_end timestamptz,p_events jsonb) returns integer language plpgsql set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,0));
 -- A calendar refresh must never erase a user's deliberate reservation.
 delete from public.torre_busy_blocks where user_id=p_user and source='google_calendar' and
  ((start_at<p_end and end_at>p_start) or exists(select 1 from jsonb_to_recordset(p_events) as e(calendar_id text,id text) where e.calendar_id=torre_busy_blocks.calendar_id and e.id=torre_busy_blocks.external_id));
 delete from public.torre_calendar_events where user_id=p_user and start_at<p_end and end_at>p_start;
 insert into public.torre_calendar_events(user_id,calendar_id,id,title,location,start_at,end_at,all_day,blocks_time,response_status)
 select p_user,e.calendar_id,e.id,e.title,e.location,e.start_at,e.end_at,e.all_day,e.blocks_time and e.response_status is distinct from 'declined',e.response_status
 from jsonb_to_recordset(p_events) e(calendar_id text,id text,title text,location text,start_at timestamptz,end_at timestamptz,all_day boolean,blocks_time boolean,response_status text,availability_only boolean)
 where not coalesce(e.availability_only,false)
 on conflict(user_id,calendar_id,id) do update set title=excluded.title,location=excluded.location,start_at=excluded.start_at,end_at=excluded.end_at,all_day=excluded.all_day,blocks_time=excluded.blocks_time,response_status=excluded.response_status;
 insert into public.torre_busy_blocks(user_id,start_at,end_at,source,calendar_id,external_id)
 select p_user,e.start_at,e.end_at,'google_calendar',e.calendar_id,e.id
 from jsonb_to_recordset(p_events) e(calendar_id text,id text,start_at timestamptz,end_at timestamptz,blocks_time boolean,response_status text,display_only boolean)
 where e.blocks_time and e.response_status is distinct from 'declined' and not coalesce(e.display_only,false);
 update public.torre_google_status set calendar_synced_at=now(),range_start=p_start,range_end=p_end,error=null,notice=null where user_id=p_user;
 return 0;
end $$;

