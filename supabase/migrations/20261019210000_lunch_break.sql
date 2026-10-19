-- Intervalo de almoço único, válido para todos os dias da jornada.
alter table public.torre_preferences
 add column lunch_enabled boolean not null default true,
 add column lunch_start time not null default '12:00',
 add column lunch_end time not null default '13:30',
 add constraint torre_lunch_range check (lunch_start < lunch_end);
