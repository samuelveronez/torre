alter table public.torre_tasks add column focus_date date;
alter table public.torre_scheduled_blocks add column kind text not null default 'execution'
 check(kind in ('execution','reminder'));

create or replace function public.torre_clear_reservation() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.status='completed' or new.archived_at is not null then
  delete from public.torre_scheduled_blocks where user_id=new.user_id and task_id=new.id;
 elsif new.status is distinct from old.status or new.duration_minutes is distinct from old.duration_minutes then
  update public.torre_scheduled_blocks set
   kind=case when new.status='waiting' then 'reminder' else kind end,
   end_at=start_at+pg_catalog.make_interval(mins=>new.duration_minutes)
  where user_id=new.user_id and task_id=new.id;
 end if;
 return new;
end $$;

create or replace function public.torre_release_expired_blocks() returns integer
language plpgsql set search_path='' as $$
declare released integer;
begin
 delete from public.torre_scheduled_blocks where user_id=(select auth.uid()) and end_at<now() and kind='execution';
 get diagnostics released=row_count;
 return released;
end $$;
