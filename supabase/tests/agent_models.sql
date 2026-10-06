begin;
insert into auth.users(id) values('a7ba7610-735e-4da5-a17f-104419acf101');
do $$
declare u uuid:='a7ba7610-735e-4da5-a17f-104419acf101'; free_run uuid:=gen_random_uuid(); paid_run uuid:=gen_random_uuid(); invalid_run uuid:=gen_random_uuid(); v jsonb;
begin
 v:=public.torre_agent_claim(u,free_run,'Avalie','analyze',gen_random_uuid());
 if v->>'requested_model'<>'openrouter/free' then raise exception 'Legacy default not free'; end if;
 update public.torre_agent_runs set state='answered' where id=free_run;
 v:=public.torre_agent_claim(u,paid_run,'Avalie com Gemini','analyze',gen_random_uuid(),'google/gemini-2.5-flash');
 if v->>'requested_model'<>'google/gemini-2.5-flash' then raise exception 'Paid model not saved'; end if;
 update public.torre_agent_runs set state='error' where id=paid_run;
 v:=public.torre_agent_claim(u,paid_run,'Avalie com Gemini','analyze',gen_random_uuid(),'google/gemini-2.5-flash');
 if v->>'requested_model'<>'google/gemini-2.5-flash' then raise exception 'Retry changed model'; end if;
 update public.torre_agent_runs set state='answered' where id=paid_run;
 v:=public.torre_agent_claim(u,paid_run,'Avalie com Gemini','analyze',gen_random_uuid(),'google/gemini-2.5-flash');
 if v->>'state'<>'answered' then raise exception 'Replay invoked again'; end if;
 begin
  perform public.torre_agent_claim(u,paid_run,'Avalie com Gemini','analyze',gen_random_uuid(),'openrouter/free');
  raise exception 'Accepted model change';
 exception when raise_exception then if sqlerrm='Accepted model change' then raise; end if; end;
 begin
  perform public.torre_agent_claim(u,paid_run,'Avalie com Gemini','analyze',gen_random_uuid());
  raise exception 'Legacy changed paid model';
 exception when raise_exception then if sqlerrm='Legacy changed paid model' then raise; end if; end;
 begin
  perform public.torre_agent_claim(u,invalid_run,'Avalie','analyze',gen_random_uuid(),'paid/unknown');
  raise exception 'Unknown model accepted';
 exception when raise_exception then if sqlerrm='Unknown model accepted' then raise; end if; end;
 if exists(select 1 from public.torre_agent_runs where id=invalid_run) then raise exception 'Invalid model created run'; end if;
 if has_function_privilege('authenticated','public.torre_agent_claim(uuid,uuid,text,text,uuid,text)','execute') or has_function_privilege('anon','public.torre_agent_claim(uuid,uuid,text,text,uuid,text)','execute') then raise exception 'Client can claim model'; end if;
 if not has_function_privilege('service_role','public.torre_agent_claim(uuid,uuid,text,text,uuid,text)','execute') then raise exception 'Backend cannot claim'; end if;
end $$;
rollback;
