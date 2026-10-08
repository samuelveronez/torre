begin;
insert into auth.users(id) values('a7ba7610-735e-4da5-a17f-104419acf101'),('a7ba7610-735e-4da5-a17f-104419acf102');
insert into public.torre_ai_settings(user_id,default_model,capture_profile) values('a7ba7610-735e-4da5-a17f-104419acf101','google/gemini-2.5-flash','free');
insert into public.torre_people(id,user_id,name) values('a7ba7610-735e-4da5-a17f-104419acf103','a7ba7610-735e-4da5-a17f-104419acf101','Ana Costa'),('a7ba7610-735e-4da5-a17f-104419acf104','a7ba7610-735e-4da5-a17f-104419acf102','Outra Ana');
insert into public.torre_captures(id,user_id,body,mode,ai_profile) values('a7ba7610-735e-4da5-a17f-104419acf105','a7ba7610-735e-4da5-a17f-104419acf101','Enviar proposta para Ana Costa','free','luna');
do $$declare claim jsonb; task uuid; ids uuid[];
begin
 claim:=public.torre_claim_capture('a7ba7610-735e-4da5-a17f-104419acf101','a7ba7610-735e-4da5-a17f-104419acf105','a7ba7610-735e-4da5-a17f-104419acf106',null);
 if claim->>'profile'<>'luna' or claim->>'referenceDate' is null then raise exception 'Profile snapshot missing';end if;
 begin
  perform public.torre_claim_capture('a7ba7610-735e-4da5-a17f-104419acf101','a7ba7610-735e-4da5-a17f-104419acf105','a7ba7610-735e-4da5-a17f-104419acf107','gemini');raise exception 'Concurrent claim accepted';
 exception when raise_exception then if sqlerrm='Concurrent claim accepted' then raise;end if;end;
 ids:=public.torre_finish_triage_many('a7ba7610-735e-4da5-a17f-104419acf101','a7ba7610-735e-4da5-a17f-104419acf105','a7ba7610-735e-4da5-a17f-104419acf106','Enviar proposta para Ana Costa','[{"title":"Enviar proposta","description":"Enviar proposta para Ana Costa","area":"professional","labelIds":[],"people":[{"name":"Ana Costa","personId":"a7ba7610-735e-4da5-a17f-104419acf103","role":"involved"},{"name":"Equipe nova","personId":null,"role":"involved"}],"dateReview":["Data ambígua"]}]','{"profile":"luna"}');task:=ids[1];
 if (select count(*) from public.torre_task_people where task_id=task)<>2 then raise exception 'People not persisted';end if;
 if (select triage_summary->'dateReview' from public.torre_captures where id='a7ba7610-735e-4da5-a17f-104419acf105')='[]' then raise exception 'Review warning lost';end if;
 if public.torre_finish_triage_many('a7ba7610-735e-4da5-a17f-104419acf101','a7ba7610-735e-4da5-a17f-104419acf105','a7ba7610-735e-4da5-a17f-104419acf106','Enviar proposta para Ana Costa','[]','{}') is distinct from ids then raise exception 'Not idempotent';end if;
 begin
  perform public.torre_set_task_people_internal('a7ba7610-735e-4da5-a17f-104419acf101',task,'[{"name":"Outra Ana","personId":"a7ba7610-735e-4da5-a17f-104419acf104","role":"involved"}]');raise exception 'Cross owner accepted';
 exception when raise_exception then if sqlerrm='Cross owner accepted' then raise;end if;end;
 if (select count(*) from public.torre_task_people where task_id=task)<>2 then raise exception 'Partial people delete';end if;
 perform set_config('request.jwt.claim.sub','a7ba7610-735e-4da5-a17f-104419acf101',true);
 perform public.torre_set_task_people(task,'[{"name":"Pessoa livre","personId":null,"role":"involved"}]');
 perform public.torre_undo_capture('a7ba7610-735e-4da5-a17f-104419acf105');
 if not exists(select 1 from public.torre_tasks where id=task and archived_at is not null) then raise exception 'Undo failed';end if;
 if has_function_privilege('authenticated','public.torre_claim_capture(uuid,uuid,uuid,text)','execute') then raise exception 'Backend RPC exposed';end if;
 if has_table_privilege('anon','public.torre_task_people','select') then raise exception 'Anonymous access';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','a7ba7610-735e-4da5-a17f-104419acf102',true);
do $$begin if exists(select 1 from public.torre_task_people) then raise exception 'RLS exposed another owner';end if;end $$;
reset role;
rollback;
