begin;
-- Existing requests stay together as the legacy conversation; nothing is deleted.
alter table public.torre_agent_runs add column conversation_id uuid;
create index torre_agent_conversation_history on public.torre_agent_runs(user_id,conversation_id,created_at desc,id desc);

create function public.torre_agent_claim(p_user uuid,p_id uuid,p_message text,p_mode text,p_token uuid,p_model text,p_conversation uuid)
returns jsonb language plpgsql set search_path='' as $$
declare r public.torre_agent_runs;
begin
 if p_model is null or p_model not in ('openrouter/free','google/gemini-2.5-flash') then raise exception 'Modelo não permitido'; end if;
 perform pg_advisory_xact_lock(hashtextextended('torre-agent:'||p_user::text,0));
 if p_conversation is not null then
  perform pg_advisory_xact_lock(hashtextextended('torre-conversation:'||p_conversation::text,0));
  if exists(select 1 from public.torre_agent_runs where conversation_id=p_conversation and user_id<>p_user) then raise exception 'Conversa indisponível'; end if;
 end if;
 select * into r from public.torre_agent_runs where id=p_id for update;
 if found then
  if r.user_id<>p_user or r.message<>p_message or r.mode<>p_mode or r.requested_model<>p_model or r.conversation_id is distinct from p_conversation then raise exception 'Pedido inválido. Preserve o modelo e a conversa originais.'; end if;
  if r.state not in ('processing','error') then return to_jsonb(r); end if;
  if r.state='processing' and r.lease_until>now() then raise exception 'Pedido em processamento. Aguarde antes de tentar novamente.'; end if;
 else
  if exists(select 1 from public.torre_agent_runs where user_id=p_user and state='processing' and lease_until>now()) then raise exception 'Aguarde o pedido anterior'; end if;
  if (select count(*) from public.torre_agent_runs where user_id=p_user and created_at>now()-interval '1 minute')>=6 then raise exception 'Muitos pedidos. Aguarde um minuto.'; end if;
  insert into public.torre_agent_runs(id,user_id,message,mode,token,requested_model,conversation_id) values(p_id,p_user,p_message,p_mode,p_token,p_model,p_conversation);
 end if;
 update public.torre_agent_runs set token=p_token,state='processing',error=null,lease_until=now()+interval '150 seconds' where id=p_id returning * into r;
 return to_jsonb(r);
end $$;
revoke all on function public.torre_agent_claim(uuid,uuid,text,text,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.torre_agent_claim(uuid,uuid,text,text,uuid,text,uuid) to service_role;

create or replace function public.torre_agent_claim(p_user uuid,p_id uuid,p_message text,p_mode text,p_token uuid,p_model text)
returns jsonb language sql set search_path='' as $$
 select public.torre_agent_claim(p_user,p_id,p_message,p_mode,p_token,p_model,null);
$$;

-- Invoker rights and existing owner_read RLS apply to the conversation listing.
create function public.torre_agent_conversations(p_offset integer default 0,p_query text default '')
returns table(conversation_id uuid,title text,updated_at timestamptz,run_count bigint)
language sql stable set search_path='' as $$
 with conversations as (
  select r.conversation_id,
   case when r.conversation_id is null then 'Histórico anterior' else left((array_agg(r.message order by r.created_at,r.id))[1],90) end as title,
   max(r.created_at) as updated_at,count(*) as run_count
  from public.torre_agent_runs r where r.user_id=(select auth.uid()) group by r.conversation_id
 ) select * from conversations where strpos(lower(title),lower(coalesce(p_query,'')))>0
 order by updated_at desc,conversation_id nulls last limit 50 offset greatest(coalesce(p_offset,0),0);
$$;
revoke all on function public.torre_agent_conversations(integer,text) from public,anon;
grant execute on function public.torre_agent_conversations(integer,text) to authenticated;
commit;
