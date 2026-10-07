begin;
alter table public.torre_labels add column area text not null default 'both' check (area in ('personal','professional','both'));
commit;
