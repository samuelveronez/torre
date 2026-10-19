begin;
insert into auth.users(id) values('a7ba7610-735e-4da5-a17f-104419acf301'),('a7ba7610-735e-4da5-a17f-104419acf302');
do $$
declare u uuid:='a7ba7610-735e-4da5-a17f-104419acf301'; v uuid:='a7ba7610-735e-4da5-a17f-104419acf302'; c1 uuid:='a7ba7610-735e-4da5-a17f-104419acf303'; c2 uuid:='a7ba7610-735e-4da5-a17f-104419acf304'; c3 uuid:='a7ba7610-735e-4da5-a17f-104419acf305';
begin
 perform public.torre_agent_claim(u,gen_random_uuid(),'Primeira conversa','analyze',gen_random_uuid(),'openrouter/free',c1);
 update public.torre_agent_runs set state='answered' where user_id=u;
 perform public.torre_agent_claim(u,gen_random_uuid(),'Segunda conversa','analyze',gen_random_uuid(),'openrouter/free',c2);
 update public.torre_agent_runs set state='answered' where user_id=u;
 perform public.torre_agent_claim(u,gen_random_uuid(),'Histórico legado','analyze',gen_random_uuid());
 update public.torre_agent_runs set state='answered' where user_id=u;
 perform public.torre_agent_claim(v,gen_random_uuid(),'Conversa da outra pessoa','analyze',gen_random_uuid(),'openrouter/free',c3);
 update public.torre_agent_runs set state='answered' where user_id=v;
 if has_function_privilege('anon','public.torre_agent_conversation_rename(uuid,text)','execute') or has_function_privilege('anon','public.torre_agent_conversation_archive(uuid,boolean)','execute') or has_function_privilege('anon','public.torre_agent_conversations(integer,text,boolean)','execute') then raise exception 'Anonymous role can reach conversation functions'; end if;
 if has_table_privilege('authenticated','public.torre_agent_conversation_meta','insert') or has_table_privilege('authenticated','public.torre_agent_conversation_meta','update') or has_table_privilege('authenticated','public.torre_agent_conversation_meta','delete') then raise exception 'Clients can write conversation meta directly'; end if;
end $$;
set local role authenticated;
set local request.jwt.claim.sub='a7ba7610-735e-4da5-a17f-104419acf301';
do $$
declare c1 uuid:='a7ba7610-735e-4da5-a17f-104419acf303'; c2 uuid:='a7ba7610-735e-4da5-a17f-104419acf304'; c3 uuid:='a7ba7610-735e-4da5-a17f-104419acf305';
begin
 perform public.torre_agent_conversation_rename(c1,'  Plano de outubro  ');
 if (select title from public.torre_agent_conversations() where conversation_id=c1)<>'Plano de outubro' then raise exception 'Rename was not applied or not trimmed'; end if;
 if (select count(*) from public.torre_agent_conversations(0,'outubro'))<>1 then raise exception 'Search ignores the custom title'; end if;
 if (select count(*) from public.torre_agent_conversations(0,'Primeira'))<>0 then raise exception 'Search still matches the replaced first message'; end if;
 perform public.torre_agent_conversation_rename(c1,'   ');
 if (select title from public.torre_agent_conversations() where conversation_id=c1)<>'Primeira conversa' then raise exception 'Blank title did not restore the default'; end if;
 begin perform public.torre_agent_conversation_rename(c1,repeat('x',91)); raise exception 'Accepted a long title'; exception when raise_exception then if sqlerrm='Accepted a long title' then raise; end if; end;
 begin perform public.torre_agent_conversation_rename(c3,'Invasão'); raise exception 'Renamed a foreign conversation'; exception when raise_exception then if sqlerrm='Renamed a foreign conversation' then raise; end if; end;
 begin perform public.torre_agent_conversation_archive(c3,true); raise exception 'Archived a foreign conversation'; exception when raise_exception then if sqlerrm='Archived a foreign conversation' then raise; end if; end;
 begin perform public.torre_agent_conversation_rename(null,'Legado'); raise exception 'Renamed the legacy conversation'; exception when raise_exception then if sqlerrm='Renamed the legacy conversation' then raise; end if; end;
 perform public.torre_agent_conversation_archive(c2,true);
 if exists(select 1 from public.torre_agent_conversations() where conversation_id=c2) then raise exception 'Archived conversation still in the active list'; end if;
 if (select count(*) from public.torre_agent_conversations(0,'',true))<>1 then raise exception 'Archived list is wrong'; end if;
 if (select archived_at from public.torre_agent_conversations(0,'',true) where conversation_id=c2) is null then raise exception 'archived_at missing'; end if;
 if (select count(*) from public.torre_agent_runs where conversation_id=c2)<>1 then raise exception 'Archive touched the requests'; end if;
 perform public.torre_agent_conversation_archive(c2,false);
 if not exists(select 1 from public.torre_agent_conversations() where conversation_id=c2) then raise exception 'Restore failed'; end if;
 if (select count(*) from public.torre_agent_conversations())<>3 then raise exception 'Active list lost a conversation (legacy included)'; end if;
 if (select count(*) from public.torre_agent_conversation_meta)<>2 then raise exception 'Meta rows leaked or missing'; end if;
end $$;
reset role;
set local role authenticated;
set local request.jwt.claim.sub='a7ba7610-735e-4da5-a17f-104419acf302';
do $$
declare c1 uuid:='a7ba7610-735e-4da5-a17f-104419acf303';
begin
 if (select count(*) from public.torre_agent_conversation_meta)<>0 then raise exception 'Other user sees foreign meta'; end if;
 if (select count(*) from public.torre_agent_conversations())<>1 then raise exception 'Other user list is wrong'; end if;
 begin perform public.torre_agent_conversation_rename(c1,'Sequestro'); raise exception 'Hijacked a conversation title'; exception when raise_exception then if sqlerrm='Hijacked a conversation title' then raise; end if; end;
 if exists(select 1 from public.torre_agent_conversations() where title='Sequestro') then raise exception 'Foreign rename leaked'; end if;
end $$;
reset role;
rollback;
