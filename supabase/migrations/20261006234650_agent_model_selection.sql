begin;
alter table public.torre_agent_runs add column requested_model text not null default 'openrouter/free'
 check(requested_model in ('openrouter/free','google/gemini-2.5-flash'));

create function public.torre_agent_claim(p_user uuid,p_id uuid,p_message text,p_mode text,p_token uuid,p_model text)
returns jsonb language plpgsql set search_path='' as $$
declare r public.torre_agent_runs;
begin
 if p_model is null or p_model not in ('openrouter/free','google/gemini-2.5-flash') then raise exception 'Modelo não permitido'; end if;
 perform pg_advisory_xact_lock(hashtextextended('torre-agent:'||p_user::text,0));
 select * into r from public.torre_agent_runs where id=p_id for update;
 if found then
  if r.user_id<>p_user or r.message<>p_message or r.mode<>p_mode or r.requested_model<>p_model then raise exception 'Pedido inválido. O modelo do pedido original deve ser preservado.'; end if;
  if r.state not in ('processing','error') then return to_jsonb(r); end if;
  if r.state='processing' and r.lease_until>now() then raise exception 'Pedido em processamento. Aguarde antes de tentar novamente.'; end if;
 else
  if exists(select 1 from public.torre_agent_runs where user_id=p_user and state='processing' and lease_until>now()) then raise exception 'Aguarde o pedido anterior'; end if;
  if (select count(*) from public.torre_agent_runs where user_id=p_user and created_at>now()-interval '1 minute')>=6 then raise exception 'Muitos pedidos. Aguarde um minuto.'; end if;
  insert into public.torre_agent_runs(id,user_id,message,mode,token,requested_model) values(p_id,p_user,p_message,p_mode,p_token,p_model);
 end if;
 update public.torre_agent_runs set token=p_token,state='processing',error=null,lease_until=now()+interval '150 seconds' where id=p_id returning * into r;
 return to_jsonb(r);
end $$;
revoke all on function public.torre_agent_claim(uuid,uuid,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.torre_agent_claim(uuid,uuid,text,text,uuid,text) to service_role;

-- Legacy clients remain free and cannot change a paid request on retry.
create or replace function public.torre_agent_claim(p_user uuid,p_id uuid,p_message text,p_mode text,p_token uuid)
returns jsonb language sql set search_path='' as $$
 select public.torre_agent_claim(p_user,p_id,p_message,p_mode,p_token,'openrouter/free');
$$;
revoke all on function public.torre_agent_claim(uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.torre_agent_claim(uuid,uuid,text,text,uuid) to service_role;
commit;
