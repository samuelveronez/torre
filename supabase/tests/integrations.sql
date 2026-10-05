begin;
insert into auth.users(id,aud,role) values('a7ba7610-735e-4da5-a17f-104419aca001','authenticated','authenticated'),('a7ba7610-735e-4da5-a17f-104419aca002','authenticated','authenticated');
set local role authenticated;
set local request.jwt.claim.sub='a7ba7610-735e-4da5-a17f-104419aca001';
insert into public.torre_labels(id,name) values('a7ba7610-735e-4da5-a17f-104419aca003','Teste');
insert into public.torre_captures(id,body) values('a7ba7610-735e-4da5-a17f-104419aca004','Organizar material');
do $$ declare task uuid; again uuid; begin
 task:=public.torre_convert_capture('a7ba7610-735e-4da5-a17f-104419aca004','',array['a7ba7610-735e-4da5-a17f-104419aca003'::uuid]);
 again:=public.torre_convert_capture('a7ba7610-735e-4da5-a17f-104419aca004');
 if task<>again then raise exception 'Duplicate capture task'; end if;
 if (select count(*) from public.torre_task_labels where task_id=task)<>1 then raise exception 'Label missing'; end if;
 perform public.torre_undo_capture('a7ba7610-735e-4da5-a17f-104419aca004');
 if not exists(select 1 from public.torre_tasks where id=task and archived_at is not null) then raise exception 'Undo failed'; end if;
 if not exists(select 1 from public.torre_captures where state='inbox') then raise exception 'Inbox failed'; end if;
 perform public.torre_convert_capture('a7ba7610-735e-4da5-a17f-104419aca004');
end $$;
insert into public.torre_captures(id) values('a7ba7610-735e-4da5-a17f-104419aca005');
insert into public.torre_attachments(id,capture_id,name,size,path,state,ordinal) values('a7ba7610-735e-4da5-a17f-104419aca006','a7ba7610-735e-4da5-a17f-104419aca005','Documento.pdf',10,'a7ba7610-735e-4da5-a17f-104419aca001/a7ba7610-735e-4da5-a17f-104419aca005/a7ba7610-735e-4da5-a17f-104419aca006','error',0);
do $$ begin
 begin perform public.torre_convert_capture('a7ba7610-735e-4da5-a17f-104419aca005');raise exception 'Expected rejection'; exception when raise_exception then if sqlerrm='Expected rejection' then raise; end if; end;
end $$;
update public.torre_attachments set state='uploaded' where id='a7ba7610-735e-4da5-a17f-104419aca006';
do $$ declare task uuid; begin
 task:=public.torre_convert_capture('a7ba7610-735e-4da5-a17f-104419aca005');
 if not exists(select 1 from public.torre_tasks where id=task and title='Documento') then raise exception 'Filename fallback failed'; end if;
end $$;
set local request.jwt.claim.sub='a7ba7610-735e-4da5-a17f-104419aca002';
do $$ begin
 if exists(select 1 from public.torre_captures) or exists(select 1 from public.torre_labels) or exists(select 1 from public.torre_attachments) then raise exception 'RLS isolation failed'; end if;
 if has_function_privilege(current_user,'public.torre_secret(uuid,text,text,boolean)','EXECUTE') then raise exception 'Secret privilege exposed'; end if;
 if has_function_privilege(current_user,'public.torre_apply_calendar(uuid,timestamptz,timestamptz,jsonb)','EXECUTE') then raise exception 'Calendar service privilege exposed'; end if;
end $$;
reset role;
insert into public.torre_google_status(user_id,connected) values('a7ba7610-735e-4da5-a17f-104419aca001',true);
insert into public.torre_calendars(user_id,id,name,access_role,selected) values('a7ba7610-735e-4da5-a17f-104419aca001','test','Agenda teste','owner',true);
set local role authenticated;
set local request.jwt.claim.sub='a7ba7610-735e-4da5-a17f-104419aca001';
insert into public.torre_scheduled_blocks(task_id,start_at,end_at) select id,'2099-01-05 19:00:00-03','2099-01-05 19:30:00-03' from public.torre_tasks where capture_id='a7ba7610-735e-4da5-a17f-104419aca004' and archived_at is null;
reset role;
select public.torre_apply_calendar('a7ba7610-735e-4da5-a17f-104419aca001','2099-01-05','2099-01-12','[{"calendar_id":"test","id":"event","title":"Ocupado","location":null,"start_at":"2099-01-05T22:00:00Z","end_at":"2099-01-05T23:00:00Z","all_day":false,"blocks_time":true}]'::jsonb);
do $$ begin if not exists(select 1 from public.torre_scheduled_blocks where user_id='a7ba7610-735e-4da5-a17f-104419aca001') then raise exception 'Sync erased manual reservation';end if;end $$;
select 'PASS: idempotency, labels, undo, filename fallback, failed uploads, owner isolation, secret ACL, stale calendar manual reservation, preservation after sync' as tests;
rollback;
