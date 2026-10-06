begin;
insert into auth.users(id) values('a7ba7610-735e-4da5-a17f-104419acb021');
insert into public.torre_captures(id,user_id,body,mode) values('a7ba7610-735e-4da5-a17f-104419acb022','a7ba7610-735e-4da5-a17f-104419acb021','Enviar proposta; aguardo Ana','list');
select public.torre_claim_triage('a7ba7610-735e-4da5-a17f-104419acb021','a7ba7610-735e-4da5-a17f-104419acb022','a7ba7610-735e-4da5-a17f-104419acb023');
do $$begin
 begin
 perform public.torre_finish_triage_many('a7ba7610-735e-4da5-a17f-104419acb021','a7ba7610-735e-4da5-a17f-104419acb022','a7ba7610-735e-4da5-a17f-104419acb023','Enviar proposta; aguardo Ana','[{"title":"Enviar","description":"Enviar","labelIds":[]},{"title":"Aguardo","description":"Aguardo","labelIds":[],"situation":"waiting"}]','{}');
 raise exception 'Accepted incomplete waiting';
 exception when raise_exception then if sqlerrm='Accepted incomplete waiting' then raise;end if;end;
 if exists(select 1 from public.torre_tasks where user_id='a7ba7610-735e-4da5-a17f-104419acb021') then raise exception 'Partial write';end if;
 perform public.torre_finish_triage_many('a7ba7610-735e-4da5-a17f-104419acb021','a7ba7610-735e-4da5-a17f-104419acb022','a7ba7610-735e-4da5-a17f-104419acb023','Enviar proposta; aguardo Ana','[{"title":"Enviar","description":"Enviar","labelIds":[],"situation":"todo"},{"title":"Aguardo","description":"Aguardo Ana","labelIds":[],"situation":"waiting","waitingFor":"Ana","followUpDate":"2026-10-07"}]','{}');
 if (select count(*) from public.torre_tasks where user_id='a7ba7610-735e-4da5-a17f-104419acb021' and status='todo')<>1 then raise exception 'Action missing';end if;
 if (select count(*) from public.torre_tasks where user_id='a7ba7610-735e-4da5-a17f-104419acb021' and status='waiting' and waiting_for='Ana' and follow_up_date='2026-10-07')<>1 then raise exception 'Waiting missing';end if;
 if has_function_privilege('authenticated','public.torre_finish_triage_many(uuid,uuid,uuid,text,jsonb,jsonb)','execute') then raise exception 'Privilege expanded';end if;
end $$;
rollback;
