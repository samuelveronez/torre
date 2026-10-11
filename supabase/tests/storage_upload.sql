-- Synthetic metadata only, under real RLS; everything rolls back.
begin;
create temporary table storage_test_ids(owner uuid,other_owner uuid,capture uuid,attachment uuid,path text);
insert into storage_test_ids select gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),null;
update storage_test_ids set path=owner::text||'/'||capture::text||'/'||attachment::text;
grant select on storage_test_ids to authenticated;
insert into auth.users(id) select owner from storage_test_ids union all select other_owner from storage_test_ids;
insert into public.torre_captures(id,user_id) select capture,owner from storage_test_ids;
insert into public.torre_attachments(id,user_id,capture_id,name,size,path,state) select attachment,owner,capture,'acceptance.txt',4,path,'error' from storage_test_ids;
select set_config('request.jwt.claim.sub',(select owner::text from storage_test_ids),true);
set local role authenticated;
insert into storage.objects(bucket_id,name,owner_id) select 'torre-attachments',path,owner::text from storage_test_ids;
do $$declare i record;begin
 select * into i from storage_test_ids;
 if not exists(select 1 from storage.objects where name=i.path) then raise exception 'Own uploaded file is not readable'; end if;
 begin
  insert into storage.objects(bucket_id,name) values('torre-attachments','unregistered/'||gen_random_uuid()::text);
  raise exception 'Unregistered file allowed';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub',i.other_owner::text,true);
 if exists(select 1 from storage.objects where name=i.path) then raise exception 'Foreign file visible'; end if;
 begin
  insert into storage.objects(bucket_id,name) values('torre-attachments',i.path||'/other');
  raise exception 'Foreign upload allowed';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: own upload/read, error retry, unregistered/foreign paths rejected; rolled back' as result;
