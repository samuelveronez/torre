begin;
-- Rename and archive for Modo IA conversations. Requests in torre_agent_runs are never touched or deleted:
-- a custom title and an archive mark live beside them and only change how the list is shown.
create table public.torre_agent_conversation_meta(
 conversation_id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 title text check(title is null or char_length(title) between 1 and 90),
 archived_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.torre_agent_conversation_meta enable row level security;
create policy owner_read on public.torre_agent_conversation_meta for select to authenticated using (user_id=(select auth.uid()));
revoke all on table public.torre_agent_conversation_meta from public,anon,authenticated;
grant select on table public.torre_agent_conversation_meta to authenticated;

-- Only the owner of the conversation can change it; the legacy conversation (null id) has no meta.
create function public.torre_agent_conversation_rename(p_conversation uuid,p_title text)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=(select auth.uid()); t text:=nullif(btrim(coalesce(p_title,'')),'');
begin
 if u is null then raise exception 'Entre na Torre'; end if;
 if p_conversation is null or not exists(select 1 from public.torre_agent_runs where user_id=u and conversation_id=p_conversation) then raise exception 'Conversa indisponível'; end if;
 if t is not null and char_length(t)>90 then raise exception 'Título de até 90 caracteres'; end if;
 insert into public.torre_agent_conversation_meta(conversation_id,user_id,title) values(p_conversation,u,t)
 on conflict (conversation_id) do update set title=excluded.title,updated_at=now() where public.torre_agent_conversation_meta.user_id=u;
end $$;
create function public.torre_agent_conversation_archive(p_conversation uuid,p_archived boolean)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=(select auth.uid());
begin
 if u is null then raise exception 'Entre na Torre'; end if;
 if p_conversation is null or not exists(select 1 from public.torre_agent_runs where user_id=u and conversation_id=p_conversation) then raise exception 'Conversa indisponível'; end if;
 insert into public.torre_agent_conversation_meta(conversation_id,user_id,archived_at) values(p_conversation,u,case when coalesce(p_archived,false) then now() end)
 on conflict (conversation_id) do update set archived_at=excluded.archived_at,updated_at=now() where public.torre_agent_conversation_meta.user_id=u;
end $$;
revoke all on function public.torre_agent_conversation_rename(uuid,text) from public,anon;
revoke all on function public.torre_agent_conversation_archive(uuid,boolean) from public,anon;
grant execute on function public.torre_agent_conversation_rename(uuid,text) to authenticated;
grant execute on function public.torre_agent_conversation_archive(uuid,boolean) to authenticated;

-- The listing gains a custom title and an archived filter. Calls that pass only offset and query keep working.
drop function public.torre_agent_conversations(integer,text);
create function public.torre_agent_conversations(p_offset integer default 0,p_query text default '',p_archived boolean default false)
returns table(conversation_id uuid,title text,updated_at timestamptz,run_count bigint,archived_at timestamptz)
language sql stable set search_path='' as $$
 with conversations as (
  select r.conversation_id,
   coalesce(m.title,case when r.conversation_id is null then 'Histórico anterior' else left((array_agg(r.message order by r.created_at,r.id))[1],90) end) as title,
   max(r.created_at) as updated_at,count(*) as run_count,m.archived_at
  from public.torre_agent_runs r
  left join public.torre_agent_conversation_meta m on m.conversation_id=r.conversation_id and m.user_id=r.user_id
  where r.user_id=(select auth.uid())
  group by r.conversation_id,m.title,m.archived_at
 ) select * from conversations
 where (archived_at is not null)=coalesce(p_archived,false) and strpos(lower(title),lower(coalesce(p_query,'')))>0
 order by updated_at desc,conversation_id nulls last limit 50 offset greatest(coalesce(p_offset,0),0);
$$;
revoke all on function public.torre_agent_conversations(integer,text,boolean) from public,anon;
grant execute on function public.torre_agent_conversations(integer,text,boolean) to authenticated;
commit;
