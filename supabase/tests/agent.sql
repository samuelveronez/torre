begin;
insert into auth.users(id) values('a7ba7610-735e-4da5-a17f-104419ace001'),('a7ba7610-735e-4da5-a17f-104419ace002');
do $$
declare u uuid:='a7ba7610-735e-4da5-a17f-104419ace001'; other_user uuid:='a7ba7610-735e-4da5-a17f-104419ace002';
 run uuid:=gen_random_uuid(); task uuid:=gen_random_uuid(); label uuid:=gen_random_uuid(); run2 uuid:=gen_random_uuid(); v jsonb; snapshot jsonb;
begin
 perform public.torre_agent_claim(u,run,'Crie tarefa e label','execute',gen_random_uuid());
 begin
  perform public.torre_agent_claim(other_user,run,'Crie tarefa e label','execute',gen_random_uuid());
  raise exception 'Accepted foreign run';
 exception when raise_exception then if sqlerrm='Accepted foreign run' then raise; end if; end;
 update public.torre_agent_runs set state='ready',operations=jsonb_build_array(
  jsonb_build_object('entity','label','id',label,'before',null,'patch',jsonb_build_object('name','Financeiro')),
  jsonb_build_object('entity','task','id',task,'before',null,'patch',jsonb_build_object('title','Pagar aluguel','label_ids',jsonb_build_array(label)))
 ) where id=run;
 v:=public.torre_agent_apply(u,run);
 if v->>'state'<>'applied' or not exists(select 1 from public.torre_task_labels where task_id=task and label_id=label) then raise exception 'Create failed'; end if;
 perform public.torre_agent_apply(u,run);
 if (select count(*) from public.torre_tasks where id=task)<>1 then raise exception 'Duplicate task'; end if;
 begin
  perform public.torre_agent_apply(other_user,run);
  raise exception 'Foreign apply';
 exception when raise_exception then if sqlerrm='Foreign apply' then raise; end if; end;
 -- Undo a creation archives the task and its newly created label, removing bindings first.
 perform public.torre_agent_apply(u,run,true);
 if (select archived_at from public.torre_tasks where id=task) is null then raise exception 'Undo creation failed'; end if;
 perform public.torre_agent_apply(u,run,true);
 -- Atomic rollback when a later operation fails a database constraint.
 perform public.torre_agent_claim(u,run2,'Crie duas','execute',gen_random_uuid());
 update public.torre_agent_runs set state='ready',operations=jsonb_build_array(
  jsonb_build_object('entity','task','id',gen_random_uuid(),'before',null,'patch',jsonb_build_object('title','Should roll back')),
  jsonb_build_object('entity','task','id',gen_random_uuid(),'before',null,'patch',jsonb_build_object('title','Invalid duration','duration_minutes',1))
 ) where id=run2;
 begin
  perform public.torre_agent_apply(u,run2);
  raise exception 'Accepted invalid batch';
 exception when check_violation then null; end;
 if exists(select 1 from public.torre_tasks where title='Should roll back') then raise exception 'Partial write'; end if;
 update public.torre_agent_runs set state='answered' where id=run2;
 -- Changed snapshots reject stale proposals and stale undo.
 run2:=gen_random_uuid(); snapshot:=public.torre_agent_snapshot(u,'task',task);
 perform public.torre_agent_claim(u,run2,'Renomeie','execute',gen_random_uuid());
 update public.torre_agent_runs set state='ready',operations=jsonb_build_array(jsonb_build_object('entity','task','id',task,'before',snapshot,'patch',jsonb_build_object('title','Novo título'))) where id=run2;
 update public.torre_tasks set priority='high' where id=task;
 begin
  perform public.torre_agent_apply(u,run2);
  raise exception 'Accepted stale snapshot';
 exception when raise_exception then if sqlerrm='Accepted stale snapshot' then raise; end if; end;
 snapshot:=public.torre_agent_snapshot(u,'task',task);
 update public.torre_agent_runs set operations=jsonb_build_array(jsonb_build_object('entity','task','id',task,'before',snapshot,'patch',jsonb_build_object('title','Novo título'))) where id=run2;
 perform public.torre_agent_apply(u,run2);
 update public.torre_tasks set priority='low' where id=task;
 begin
  perform public.torre_agent_apply(u,run2,true);
  raise exception 'Accepted stale undo';
 exception when raise_exception then if sqlerrm='Accepted stale undo' then raise; end if; end;
 -- A read-only request can never be applied, even if an operation was injected.
 run2:=gen_random_uuid();perform public.torre_agent_claim(u,run2,'Avalie','analyze',gen_random_uuid());
 update public.torre_agent_runs set state='ready',operations='[{"entity":"task"}]' where id=run2;
 begin
  perform public.torre_agent_apply(u,run2);
  raise exception 'Read-only write';
 exception when raise_exception then if sqlerrm='Read-only write' then raise; end if; end;
 if has_function_privilege('authenticated','public.torre_agent_apply(uuid,uuid,boolean)','execute') then raise exception 'Client has write RPC'; end if;
 if has_function_privilege('anon','public.torre_agent_snapshot(uuid,text,uuid)','execute') then raise exception 'Anon reads snapshot'; end if;
 if has_table_privilege('authenticated','public.torre_agent_runs','update') then raise exception 'Client edits audit'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','a7ba7610-735e-4da5-a17f-104419ace002',true);
do $$begin
 if exists(select 1 from public.torre_agent_runs) then raise exception 'History crossed accounts'; end if;
end $$;
reset role;
rollback;
