begin;
insert into auth.users(id,aud,role) values('a7ba7610-735e-4da5-a17f-104419acc001','authenticated','authenticated'),('a7ba7610-735e-4da5-a17f-104419acc002','authenticated','authenticated');
insert into public.torre_preferences(user_id,timezone) values('a7ba7610-735e-4da5-a17f-104419acc001','America/Sao_Paulo');
insert into public.torre_google_status(user_id,connected) values('a7ba7610-735e-4da5-a17f-104419acc001',true);
insert into public.torre_calendars(user_id,id,name,access_role,mode,selected) values('a7ba7610-735e-4da5-a17f-104419acc001','test','Agenda teste','owner','details',true);
insert into public.torre_tasks(id,user_id,title,area,duration_minutes) values
 ('a7ba7610-735e-4da5-a17f-104419acc003','a7ba7610-735e-4da5-a17f-104419acc001','Manual A','personal',30),
 ('a7ba7610-735e-4da5-a17f-104419acc004','a7ba7610-735e-4da5-a17f-104419acc001','Manual B','personal',30),
 ('a7ba7610-735e-4da5-a17f-104419acc005','a7ba7610-735e-4da5-a17f-104419acc001','Automatic A','personal',30),
 ('a7ba7610-735e-4da5-a17f-104419acc006','a7ba7610-735e-4da5-a17f-104419acc001','Automatic B','personal',30);
set local role authenticated;
set local request.jwt.claim.sub='a7ba7610-735e-4da5-a17f-104419acc001';
-- Manual overlapping reservations are allowed even with a never-synced account.
insert into public.torre_scheduled_blocks(task_id,start_at,end_at) values
 ('a7ba7610-735e-4da5-a17f-104419acc003','2099-01-05T22:00Z','2099-01-05T22:30Z'),
 ('a7ba7610-735e-4da5-a17f-104419acc004','2099-01-05T22:15Z','2099-01-05T22:45Z');
reset role;
select public.torre_apply_calendar('a7ba7610-735e-4da5-a17f-104419acc001','2099-01-05T03:00Z','2099-01-12T03:00Z','[
 {"calendar_id":"test","id":"accepted","title":"Reunião","start_at":"2099-01-05T22:00Z","end_at":"2099-01-05T23:00Z","all_day":false,"blocks_time":true,"response_status":"accepted"},
 {"calendar_id":"test","id":"maybe","title":"Talvez","start_at":"2099-01-05T23:00Z","end_at":"2099-01-05T23:30Z","all_day":false,"blocks_time":true,"response_status":"tentative"},
 {"calendar_id":"test","id":"pending","title":"Sem resposta","start_at":"2099-01-05T23:30Z","end_at":"2099-01-06T00:00Z","all_day":false,"blocks_time":true,"response_status":"needsAction"},
 {"calendar_id":"test","id":"declined","title":"Recusado","start_at":"2099-01-06T00:00Z","end_at":"2099-01-06T00:30Z","all_day":false,"blocks_time":true,"response_status":"declined"}
]');
do $$ begin
 if (select count(*) from public.torre_scheduled_blocks where user_id='a7ba7610-735e-4da5-a17f-104419acc001')<>2 then raise exception 'Sync erased reservations'; end if;
 if (select count(*) from public.torre_busy_blocks where user_id='a7ba7610-735e-4da5-a17f-104419acc001')<>3 then raise exception 'Invitation blocking failed'; end if;
 if exists(select 1 from public.torre_calendar_events where id='declined' and blocks_time) then raise exception 'Declined blocks planning'; end if;
 if (select response_status from public.torre_calendar_events where id='maybe')<>'tentative' then raise exception 'Response missing'; end if;
 if exists(select 1 from public.torre_google_status where user_id='a7ba7610-735e-4da5-a17f-104419acc001' and notice is not null) then raise exception 'Obsolete release notice'; end if;
end $$;
-- Moving a manual reservation onto a busy event must persist too.
set local role authenticated;
set local request.jwt.claim.sub='a7ba7610-735e-4da5-a17f-104419acc001';
update public.torre_scheduled_blocks set start_at='2099-01-05T23:00Z',end_at='2099-01-05T23:30Z' where task_id='a7ba7610-735e-4da5-a17f-104419acc004';
do $$ begin
 begin update public.torre_scheduled_blocks set end_at='2099-01-06T00:00Z' where task_id='a7ba7610-735e-4da5-a17f-104419acc004';raise exception 'Wrong duration allowed';exception when check_violation then null;end;
end $$;
reset role;
-- Each test proposal starts with a fresh snapshot. Edited automatic placements
-- must reject busy intervals, existing tasks and intra-proposal overlaps.
do $$ declare proposal uuid; placements jsonb; requested_ids uuid[]:=array['a7ba7610-735e-4da5-a17f-104419acc005','a7ba7610-735e-4da5-a17f-104419acc006']::uuid[]; begin
 placements:='[{"taskId":"a7ba7610-735e-4da5-a17f-104419acc005","start":"2099-01-06T00:00Z","end":"2099-01-06T00:30Z"},{"taskId":"a7ba7610-735e-4da5-a17f-104419acc006","start":"2099-01-06T00:30Z","end":"2099-01-06T01:00Z"}]';
 insert into public.torre_week_proposals(user_id,task_ids,range_start,range_end,snapshot,placements)
 values('a7ba7610-735e-4da5-a17f-104419acc001',requested_ids,'2099-01-05T03:00Z','2099-01-12T03:00Z',public.torre_plan_snapshot('a7ba7610-735e-4da5-a17f-104419acc001',requested_ids),placements) returning id into proposal;
 for placements in select jsonb_build_array(jsonb_build_object('taskId',requested_ids[1],'start',time_at,'end',time_at+interval '30 minutes')) from unnest(array['2099-01-05T22:00Z','2099-01-05T23:00Z','2099-01-05T23:30Z']::timestamptz[]) time_at loop
  begin perform public.torre_apply_week_proposal('a7ba7610-735e-4da5-a17f-104419acc001',proposal,array[requested_ids[1]],placements);raise exception 'Automatic conflict accepted';exception when check_violation then null;end;
 end loop;
 -- Isolate a reservation conflict, outside the Google busy intervals.
 update public.torre_scheduled_blocks set start_at='2099-01-06T00:00Z',end_at='2099-01-06T00:30Z' where task_id='a7ba7610-735e-4da5-a17f-104419acc003';
 update public.torre_week_proposals set snapshot=public.torre_plan_snapshot('a7ba7610-735e-4da5-a17f-104419acc001',requested_ids) where id=proposal;
 begin perform public.torre_apply_week_proposal('a7ba7610-735e-4da5-a17f-104419acc001',proposal,array[requested_ids[1]],'[ {"taskId":"a7ba7610-735e-4da5-a17f-104419acc005","start":"2099-01-06T00:00Z","end":"2099-01-06T00:30Z"}]');raise exception 'Task conflict accepted';exception when check_violation then null;end;
 delete from public.torre_scheduled_blocks where task_id='a7ba7610-735e-4da5-a17f-104419acc003';
 update public.torre_week_proposals set snapshot=public.torre_plan_snapshot('a7ba7610-735e-4da5-a17f-104419acc001',requested_ids) where id=proposal;
 begin perform public.torre_apply_week_proposal('a7ba7610-735e-4da5-a17f-104419acc001',proposal,requested_ids,'[{"taskId":"a7ba7610-735e-4da5-a17f-104419acc005","start":"2099-01-06T00:00Z","end":"2099-01-06T00:30Z"},{"taskId":"a7ba7610-735e-4da5-a17f-104419acc006","start":"2099-01-06T00:15Z","end":"2099-01-06T00:45Z"}]');raise exception 'Intra-proposal conflict accepted';exception when check_violation then null;end;
 if exists(select 1 from public.torre_scheduled_blocks where task_id=any(requested_ids)) then raise exception 'Partial proposal persisted';end if;
 -- Adjacent placements overlapping only the declined event succeed.
 perform public.torre_apply_week_proposal('a7ba7610-735e-4da5-a17f-104419acc001',proposal,requested_ids);
 if (select count(*) from public.torre_scheduled_blocks where task_id=any(requested_ids))<>2 then raise exception 'Free proposal failed';end if;
end $$;
set local role authenticated;
set local request.jwt.claim.sub='a7ba7610-735e-4da5-a17f-104419acc002';
do $$ begin
 if exists(select 1 from public.torre_calendar_events) or exists(select 1 from public.torre_scheduled_blocks) then raise exception 'RLS isolation failed';end if;
 if has_function_privilege(current_user,'public.torre_apply_week_proposal(uuid,uuid,uuid[],jsonb)','execute') or has_function_privilege(current_user,'public.torre_apply_calendar(uuid,timestamptz,timestamptz,jsonb)','execute') then raise exception 'Service RPC exposed';end if;
end $$;
set local request.jwt.claim.sub='a7ba7610-735e-4da5-a17f-104419acc001';
update public.torre_calendars set mode='busy' where id='test';
do $$ begin if exists(select 1 from public.torre_calendar_events where response_status is not null or title<>'Ocupado') then raise exception 'Privacy switch leaked details';end if;end $$;
reset role;
select 'PASS: manual overlaps, stale calendar, sync preservation, RSVP blocking, duration, strict automatic proposals, atomic rollback, adjacency, owner isolation and privacy' as tests;
rollback;
