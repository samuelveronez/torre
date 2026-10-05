alter table public.torre_tasks add column priority text not null default 'none'
  constraint torre_tasks_priority_check check (priority in ('none','low','medium','high'));
comment on column public.torre_tasks.priority is 'Local Torre priority; not synchronized to Google Tasks.';
notify pgrst, 'reload schema';
