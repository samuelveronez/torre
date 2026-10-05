begin;
insert into auth.users(id,aud,role) values('a7ba7610-735e-4da5-a17f-104419acb001','authenticated','authenticated'),('a7ba7610-735e-4da5-a17f-104419acb002','authenticated','authenticated');
insert into public.torre_captures(id,user_id,body,mode) values('a7ba7610-735e-4da5-a17f-104419acb004','a7ba7610-735e-4da5-a17f-104419acb001','receita de bolo, consertar carro','list');
insert into public.torre_labels(id,user_id,name) values('a7ba7610-735e-4da5-a17f-104419acb003','a7ba7610-735e-4da5-a17f-104419acb001','Receitas');
do $$ declare ids uuid[]; again uuid[]; begin
 if has_function_privilege('authenticated','public.torre_finish_triage_many(uuid,uuid,uuid,text,jsonb,jsonb)','execute') or has_function_privilege('authenticated','public.torre_apply_week_proposal(uuid,uuid,uuid[],jsonb)','execute') then raise exception 'Privileged function exposed'; end if;
 begin perform public.torre_claim_triage('a7ba7610-735e-4da5-a17f-104419acb002','a7ba7610-735e-4da5-a17f-104419acb004','a7ba7610-735e-4da5-a17f-104419acb006');raise exception 'Owner isolation failed';exception when raise_exception then if sqlerrm='Owner isolation failed' then raise;end if;end;
 perform public.torre_claim_triage('a7ba7610-735e-4da5-a17f-104419acb001','a7ba7610-735e-4da5-a17f-104419acb004','a7ba7610-735e-4da5-a17f-104419acb006');
 begin perform public.torre_claim_triage('a7ba7610-735e-4da5-a17f-104419acb001','a7ba7610-735e-4da5-a17f-104419acb004','a7ba7610-735e-4da5-a17f-104419acb007');raise exception 'Lease failed';exception when raise_exception then if sqlerrm='Lease failed' then raise;end if;end;
 begin perform public.torre_finish_triage_many('a7ba7610-735e-4da5-a17f-104419acb001','a7ba7610-735e-4da5-a17f-104419acb004','a7ba7610-735e-4da5-a17f-104419acb006','receita de bolo, consertar carro','[{"title":"Receita","description":"receita de bolo","labelIds":[]},{"title":"Carro","description":"consertar carro","labelIds":["a7ba7610-735e-4da5-a17f-104419acb002"]}]','{}');raise exception 'Invalid label accepted';exception when raise_exception then if sqlerrm='Invalid label accepted' then raise;end if;end;
 if exists(select 1 from public.torre_tasks where capture_id='a7ba7610-735e-4da5-a17f-104419acb004') then raise exception 'Partial creation';end if;
 ids:=public.torre_finish_triage_many('a7ba7610-735e-4da5-a17f-104419acb001','a7ba7610-735e-4da5-a17f-104419acb004','a7ba7610-735e-4da5-a17f-104419acb006','receita de bolo, consertar carro','[{"title":"Receita","description":"receita de bolo","labelIds":["a7ba7610-735e-4da5-a17f-104419acb003"]},{"title":"Carro","description":"consertar carro","labelIds":[]}]','{}');
 again:=public.torre_finish_triage_many('a7ba7610-735e-4da5-a17f-104419acb001','a7ba7610-735e-4da5-a17f-104419acb004','a7ba7610-735e-4da5-a17f-104419acb006','receita de bolo, consertar carro','[]','{}');
 if ids<>again or cardinality(ids)<>2 or (select count(*) from public.torre_triage_history where capture_id='a7ba7610-735e-4da5-a17f-104419acb004')<>2 then raise exception 'Idempotency failed';end if;
end $$;
insert into public.torre_tasks(id,user_id,title,area,duration_minutes) values('a7ba7610-735e-4da5-a17f-104419acb008','a7ba7610-735e-4da5-a17f-104419acb001','Test A','professional',30),('a7ba7610-735e-4da5-a17f-104419acb009','a7ba7610-735e-4da5-a17f-104419acb001','Test B','professional',30);
insert into public.torre_preferences(user_id,timezone) values('a7ba7610-735e-4da5-a17f-104419acb001','America/Sao_Paulo');
insert into public.torre_work_hours(user_id,weekday,enabled,start_time,end_time) values('a7ba7610-735e-4da5-a17f-104419acb001',1,true,'09:00','18:00');
insert into public.torre_week_proposals(id,user_id,task_ids,range_start,range_end,snapshot,placements)
select 'a7ba7610-735e-4da5-a17f-104419acb010','a7ba7610-735e-4da5-a17f-104419acb001',array['a7ba7610-735e-4da5-a17f-104419acb008','a7ba7610-735e-4da5-a17f-104419acb009']::uuid[],'2026-10-12T03:00Z','2026-10-19T03:00Z',public.torre_plan_snapshot('a7ba7610-735e-4da5-a17f-104419acb001',array['a7ba7610-735e-4da5-a17f-104419acb008','a7ba7610-735e-4da5-a17f-104419acb009']::uuid[]),'[{"taskId":"a7ba7610-735e-4da5-a17f-104419acb008","start":"2026-10-12T12:00Z","end":"2026-10-12T12:30Z"},{"taskId":"a7ba7610-735e-4da5-a17f-104419acb009","start":"2026-10-12T12:30Z","end":"2026-10-12T13:00Z"}]';
do $$ begin
 begin perform public.torre_apply_week_proposal('a7ba7610-735e-4da5-a17f-104419acb001','a7ba7610-735e-4da5-a17f-104419acb010',array['a7ba7610-735e-4da5-a17f-104419acb008','a7ba7610-735e-4da5-a17f-104419acb009']::uuid[],'[{"taskId":"a7ba7610-735e-4da5-a17f-104419acb008","start":"2026-10-12T12:00Z","end":"2026-10-12T12:30Z"},{"taskId":"a7ba7610-735e-4da5-a17f-104419acb009","start":"2026-10-12T12:00Z","end":"2026-10-12T12:30Z"}]');raise exception 'Conflicting plan accepted';exception when check_violation then null;end;
 if exists(select 1 from public.torre_scheduled_blocks where user_id='a7ba7610-735e-4da5-a17f-104419acb001') then raise exception 'Partial plan persisted';end if;
 perform public.torre_apply_week_proposal('a7ba7610-735e-4da5-a17f-104419acb001','a7ba7610-735e-4da5-a17f-104419acb010',array['a7ba7610-735e-4da5-a17f-104419acb008','a7ba7610-735e-4da5-a17f-104419acb009']::uuid[]);
 perform public.torre_apply_week_proposal('a7ba7610-735e-4da5-a17f-104419acb001','a7ba7610-735e-4da5-a17f-104419acb010',array['a7ba7610-735e-4da5-a17f-104419acb008','a7ba7610-735e-4da5-a17f-104419acb009']::uuid[]);
 if (select count(*) from public.torre_scheduled_blocks where user_id='a7ba7610-735e-4da5-a17f-104419acb001')<>2 then raise exception 'Plan idempotency failed';end if;
end $$;
set local role authenticated;
set local request.jwt.claim.sub='a7ba7610-735e-4da5-a17f-104419acb002';
do $$ begin if exists(select 1 from public.torre_captures) or exists(select 1 from public.torre_tasks) or exists(select 1 from public.torre_week_proposals) then raise exception 'RLS isolation failed';end if;end $$;
set local request.jwt.claim.sub='a7ba7610-735e-4da5-a17f-104419acb001';
select public.torre_undo_capture('a7ba7610-735e-4da5-a17f-104419acb004');
do $$ begin if exists(select 1 from public.torre_tasks where capture_id='a7ba7610-735e-4da5-a17f-104419acb004' and archived_at is null) then raise exception 'Undo failed';end if;end $$;
rollback;
