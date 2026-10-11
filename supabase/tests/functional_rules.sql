-- Synthetic users and records only. Everything is rolled back.
begin;
create temporary table functional_test_ids(owner uuid,other_owner uuid,task uuid,at timestamptz);
insert into functional_test_ids values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),(current_date+3+time '05:00') at time zone 'America/Sao_Paulo');
grant select on functional_test_ids to authenticated;
insert into auth.users(id) select owner from functional_test_ids union all select other_owner from functional_test_ids;
insert into public.torre_preferences(user_id,agenda_start_hour,agenda_end_hour) select owner,5,24 from functional_test_ids;
insert into public.torre_tasks(id,user_id,title,source,google_task_id,google_list_id,area,duration_minutes)
select task,owner,'Synthetic imported task','google_tasks','synthetic-task','synthetic-list','personal',30 from functional_test_ids;
select set_config('request.jwt.claim.sub',(select owner::text from functional_test_ids),true);
set local role authenticated;
do $$
declare i record; failed boolean:=false;
begin
 select * into i from functional_test_ids;
 perform public.torre_save_task(i.task,'{"title":"Local edit","description":"Local notes","due_date":"2030-01-01","focus_date":"2030-01-02"}',i.at,'execution');
 if not exists(select 1 from public.torre_tasks where id=i.task and title='Local edit' and focus_date='2030-01-02') then raise exception 'Local edits/focus failed'; end if;
 perform public.torre_save_task(i.task,'{"status":"waiting","waiting_for":"Synthetic person","follow_up_date":"2030-01-03"}',i.at,'reminder');
 if not exists(select 1 from public.torre_scheduled_blocks where task_id=i.task and kind='reminder') then raise exception 'Reminder failed'; end if;
 perform public.torre_save_task(i.task,'{"status":"todo","waiting_for":null,"follow_up_date":null,"duration_minutes":60}',i.at,'execution');
 if not exists(select 1 from public.torre_scheduled_blocks where task_id=i.task and kind='execution' and end_at-start_at=interval '60 minutes') then raise exception 'Conversion/duration failed'; end if;
 begin
  perform public.torre_save_task(i.task,'{"title":"Must roll back"}',i.at-interval '1 hour','execution');
 exception when check_violation then failed:=true; end;
 if not failed or exists(select 1 from public.torre_tasks where id=i.task and title='Must roll back') then raise exception 'Atomic rollback failed'; end if;
 perform public.torre_save_task(i.task,'{"status":"completed"}',null,'execution');
 if exists(select 1 from public.torre_sync_jobs where task_id=i.task) or exists(select 1 from public.torre_tasks where id=i.task and google_completion_pending) then raise exception 'Outbound completion queued'; end if;
 perform public.torre_save_task(i.task,'{"status":"todo"}',null,'execution');
 if not exists(select 1 from public.torre_tasks where id=i.task and status='todo') then raise exception 'Local reopen failed'; end if;
 perform set_config('request.jwt.claim.sub',i.other_owner::text,true);
 if exists(select 1 from public.torre_tasks where id=i.task) then raise exception 'RLS isolation failed'; end if;
 begin
  perform public.torre_save_task(i.task,'{"title":"Unauthorized edit"}',null,'execution');
  raise exception 'Foreign task edit allowed';
 exception when unique_violation then null; end;
end $$;
reset role;
do $$
declare i record; reminder uuid:=gen_random_uuid(); proposal uuid:=gen_random_uuid(); failed boolean:=false; placements jsonb;
begin
 select * into i from functional_test_ids;
 update public.torre_tasks set area='professional',duration_minutes=30 where id=i.task;
 insert into public.torre_work_hours(user_id,weekday,enabled,start_time,end_time) values(i.owner,extract(dow from (i.at at time zone 'America/Sao_Paulo'))::integer,true,'05:00','08:00');
 insert into public.torre_tasks(id,user_id,title,area,status,waiting_for,follow_up_date,duration_minutes) values(reminder,i.owner,'Synthetic reminder','personal','waiting','Synthetic person',current_date+3,30);
 insert into public.torre_scheduled_blocks(user_id,task_id,start_at,end_at,kind) values(i.owner,reminder,i.at,i.at+interval '30 minutes','reminder');
 placements:=jsonb_build_array(jsonb_build_object('taskId',i.task,'start',i.at,'end',i.at+interval '30 minutes','reason','Synthetic test'));
 insert into public.torre_google_status(user_id,connected,calendar_synced_at,error) values(i.owner,true,now()-interval '1 day','Synthetic offline calendar');
 insert into public.torre_week_proposals(id,user_id,task_ids,range_start,range_end,snapshot,placements) values(proposal,i.owner,array[i.task],i.at-interval '5 hours',i.at+interval '7 days'-interval '5 hours',public.torre_plan_snapshot(i.owner,array[i.task]),placements);
 begin
  perform public.torre_apply_week_proposal(i.owner,proposal,array[i.task],jsonb_build_array(jsonb_build_object('taskId',i.task,'start',i.at+interval '4 hours','end',i.at+interval '4 hours 30 minutes')));
 exception when check_violation then failed:=true; when raise_exception then failed:=true; end;
 if not failed then raise exception 'Automatic planning ignored work hours'; end if;
 update public.torre_google_status set calendar_synced_at=now()-interval '2 days' where user_id=i.owner;
 perform public.torre_apply_week_proposal(i.owner,proposal,array[i.task],null);
 if not exists(select 1 from public.torre_scheduled_blocks where task_id=i.task and kind='execution' and start_at=i.at) then raise exception 'Reminder blocked automatic placement'; end if;
end $$;
rollback;
select 'PASS: local editing/reopen, focus, reminders, duration, rollback, no outbound queue, RLS isolation; synthetic records rolled back' as result;
