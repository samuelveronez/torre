begin;
insert into auth.users(id) values('a7ba7610-735e-4da5-a17f-104419acf201'),('a7ba7610-735e-4da5-a17f-104419acf202');
do $$
declare u uuid:='a7ba7610-735e-4da5-a17f-104419acf201'; v uuid:='a7ba7610-735e-4da5-a17f-104419acf202'; c uuid:='a7ba7610-735e-4da5-a17f-104419acf203'; d uuid:='a7ba7610-735e-4da5-a17f-104419acf204'; r uuid:=gen_random_uuid(); result jsonb;
begin
 result:=public.torre_agent_claim(u,r,'Prioridades profissionais','analyze',gen_random_uuid(),'openrouter/free',c);
 if result->>'conversation_id'<>c::text then raise exception 'Conversation not saved'; end if;
 update public.torre_agent_runs set state='error' where id=r;
 begin
  perform public.torre_agent_claim(u,r,'Prioridades profissionais','analyze',gen_random_uuid(),'openrouter/free',d);
  raise exception 'Retry moved conversation';
 exception when raise_exception then if sqlerrm='Retry moved conversation' then raise; end if; end;
 result:=public.torre_agent_claim(u,r,'Prioridades profissionais','analyze',gen_random_uuid(),'openrouter/free',c);
 update public.torre_agent_runs set state='answered' where id=r;
 begin
  perform public.torre_agent_claim(v,gen_random_uuid(),'Intrusão','analyze',gen_random_uuid(),'openrouter/free',c);
  raise exception 'Accepted foreign conversation';
 exception when raise_exception then if sqlerrm='Accepted foreign conversation' then raise; end if; end;
 perform public.torre_agent_claim(u,gen_random_uuid(),'Continuar','analyze',gen_random_uuid(),'google/gemini-2.5-flash',c);
 update public.torre_agent_runs set state='answered' where user_id=u;
 perform public.torre_agent_claim(u,gen_random_uuid(),'Labels separadas','analyze',gen_random_uuid(),'openrouter/free',d);
 update public.torre_agent_runs set state='answered' where user_id=u;
 perform public.torre_agent_claim(u,gen_random_uuid(),'Legado','analyze',gen_random_uuid());
 update public.torre_agent_runs set state='answered' where user_id=u;
 perform public.torre_agent_claim(v,gen_random_uuid(),'Conversa privada','analyze',gen_random_uuid(),'openrouter/free',gen_random_uuid());
 if has_function_privilege('authenticated','public.torre_agent_claim(uuid,uuid,text,text,uuid,text,uuid)','execute') or has_function_privilege('anon','public.torre_agent_conversations(integer,text)','execute') then raise exception 'Unexpected client permissions'; end if;
end $$;
set local role authenticated;
set local request.jwt.claim.sub='a7ba7610-735e-4da5-a17f-104419acf201';
do $$
begin
 if (select count(*) from public.torre_agent_conversations())<>3 then raise exception 'Listing leaked or lost conversation'; end if;
 if (select run_count from public.torre_agent_conversations() where title='Prioridades profissionais')<>2 then raise exception 'Wrong grouping/title'; end if;
 if (select count(*) from public.torre_agent_conversations(0,'LABELS'))<>1 then raise exception 'Search failed'; end if;
 if not exists(select 1 from public.torre_agent_conversations() where conversation_id is null and title='Histórico anterior') then raise exception 'Legacy lost'; end if;
 if (select count(*) from public.torre_agent_runs where conversation_id='a7ba7610-735e-4da5-a17f-104419acf204')<>1 then raise exception 'New conversation includes previous requests'; end if;
end $$;
reset role;
rollback;
