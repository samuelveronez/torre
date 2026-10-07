begin;
create table public.torre_telegram_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 chat_id bigint unique,
 enabled boolean not null default false,
 weekdays smallint[] not null default array[0,1,2,3,4,5,6]::smallint[] check (cardinality(weekdays) between 1 and 7 and weekdays <@ array[0,1,2,3,4,5,6]::smallint[]),
 send_time time not null default '21:00',
 timezone text not null default 'America/Sao_Paulo' check(timezone='America/Sao_Paulo'),
 link_hash text,
 link_expires_at timestamptz,
 test_after timestamptz,
 updated_at timestamptz not null default now(),
 check(not enabled or chat_id is not null)
);
alter table public.torre_telegram_settings enable row level security;
create policy telegram_owner on public.torre_telegram_settings for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.torre_telegram_settings from anon,authenticated;
grant select(user_id,enabled,weekdays,send_time,timezone,updated_at) on public.torre_telegram_settings to authenticated;
grant all on public.torre_telegram_settings to service_role;
create table public.torre_telegram_deliveries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 digest_date date not null,
 state text not null default 'generating' check(state in ('generating','sending','sent','error','uncertain')),
 started_at timestamptz not null default now(),
 sent_at timestamptz,
 error text,
 model text,
 telegram_message_id bigint,
 unique(user_id,digest_date)
);
alter table public.torre_telegram_deliveries enable row level security;
create policy telegram_delivery_owner on public.torre_telegram_deliveries for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.torre_telegram_deliveries from anon,authenticated;
grant select on public.torre_telegram_deliveries to authenticated;
grant all on public.torre_telegram_deliveries to service_role;
create function public.torre_telegram_bind(p_user uuid,p_hash text,p_chat bigint) returns boolean language plpgsql set search_path='' as $$
begin
 update public.torre_telegram_settings set chat_id=p_chat,enabled=false,link_hash=null,link_expires_at=null,updated_at=now()
 where user_id=p_user and link_hash=p_hash and link_expires_at>now();
 return found;
end $$;
create function public.torre_telegram_claim() returns setof public.torre_telegram_deliveries language sql set search_path='' as $$
 insert into public.torre_telegram_deliveries(user_id,digest_date)
 select user_id,(now() at time zone timezone)::date from public.torre_telegram_settings
 where enabled and chat_id is not null and extract(dow from now() at time zone timezone)::smallint=any(weekdays)
 and (now() at time zone timezone)::time>=send_time
 and (now() at time zone timezone)<((now() at time zone timezone)::date+send_time+interval '1 hour')
 and not exists(select 1 from public.torre_telegram_deliveries d where d.user_id=torre_telegram_settings.user_id and d.digest_date=(now() at time zone timezone)::date)
 order by user_id limit 5
 on conflict(user_id,digest_date) do nothing returning *;
$$;
revoke all on function public.torre_telegram_bind(uuid,text,bigint), public.torre_telegram_claim() from public,anon,authenticated;
grant execute on function public.torre_telegram_bind(uuid,text,bigint), public.torre_telegram_claim() to service_role;
-- Reuse the existing Vault worker credential; it never reaches the frontend.
select cron.schedule('torre-telegram-digest','* * * * *',$job$
 select net.http_post(
  url:='https://nvxwqrpztecrvrxoddxf.supabase.co/functions/v1/torre-telegram-worker',
  headers:=jsonb_build_object('Content-Type','application/json','x-torre-worker',(select decrypted_secret from vault.decrypted_secrets where name='torre_worker_token')),
  body:='{}'::jsonb,timeout_milliseconds:=90000
 ) where exists (
  select 1 from public.torre_telegram_settings s where s.enabled and s.chat_id is not null
  and extract(dow from now() at time zone s.timezone)::smallint=any(s.weekdays)
  and (now() at time zone s.timezone)::time>=s.send_time
  and (now() at time zone s.timezone)<((now() at time zone s.timezone)::date+s.send_time+interval '1 hour')
  and not exists(select 1 from public.torre_telegram_deliveries d where d.user_id=s.user_id and d.digest_date=(now() at time zone s.timezone)::date)
 );
$job$);
commit;
