begin;
insert into auth.users(id) values ('aaf61005-0000-4000-8000-000000000001'),('aaf61005-0000-4000-8000-000000000002');
insert into public.torre_tasks(id,user_id,title,area) values
 ('bbf61005-0000-4000-8000-000000000001','aaf61005-0000-4000-8000-000000000001','Priority test owner','personal'),
 ('bbf61005-0000-4000-8000-000000000002','aaf61005-0000-4000-8000-000000000002','Priority test other','personal');
set local role authenticated;
select set_config('request.jwt.claim.sub','aaf61005-0000-4000-8000-000000000001',true);
do $$
declare value text; changed integer;
begin
 select priority into value from public.torre_tasks where id='bbf61005-0000-4000-8000-000000000001';
 if value <> 'none' then raise exception 'Priority default failed'; end if;
 foreach value in array array['high','medium','low','none'] loop
  update public.torre_tasks set priority=value where id='bbf61005-0000-4000-8000-000000000001';
  if not exists(select 1 from public.torre_tasks where id='bbf61005-0000-4000-8000-000000000001' and priority=value) then raise exception 'Priority save failed'; end if;
 end loop;
 update public.torre_tasks set priority='high' where id='bbf61005-0000-4000-8000-000000000002';
 get diagnostics changed = row_count;
 if changed <> 0 then raise exception 'Priority owner isolation failed'; end if;
 begin
  update public.torre_tasks set priority='invalid' where id='bbf61005-0000-4000-8000-000000000001';
  raise exception 'Invalid priority accepted';
 exception when check_violation then null;
 end;
end $$;
reset role;
rollback;
