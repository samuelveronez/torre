import {PGlite} from '../.db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {readFile} from 'node:fs/promises';
const db=new PGlite();
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
try {
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create table auth.users(id uuid primary key,aud text,role text);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to authenticated,anon,service_role;
 grant execute on function auth.uid() to authenticated,anon,service_role;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 create schema vault;create table vault.secrets(id uuid primary key default gen_random_uuid());`);
 await db.exec(await read('./migrations/202610040001_torre.sql'));
 await db.exec(await read('./schema/integrations.sql'));
 // Network worker setup needs Supabase extensions; it is unrelated to these tests.
 await db.exec((await read('./schema/integrations-hardening.sql')).split('create extension if not exists pg_net')[0]+'commit;');
 await db.exec(await read('./schema/openrouter-triage.sql'));
 await db.exec(await read('./migrations/20261005011145_capture_many_and_week_proposal.sql'));
 await db.exec(await read('./migrations/20261005102708_calendar_responses_manual_overlaps.sql'));
 await db.exec(await read('./migrations/20261006123023_capture_workflow_status.sql'));
 await db.exec(await read('./migrations/20261005112048_task_priority.sql'));
 await db.exec(await read('./migrations/20261006160000_ai_agent.sql'));
 await db.exec(await read('./migrations/20261006234650_agent_model_selection.sql'));
 await db.exec(await read('./migrations/20261007010329_agent_conversations.sql'));
 for(const path of ['./tests/calendar_overlaps.sql','./tests/integrations.sql','./tests/capture_many.sql','./tests/capture_workflow.sql','./tests/agent.sql','./tests/agent_models.sql','./tests/agent_conversations.sql']){
  await db.exec(await read(path));console.log('PASS:',path);
 }
} catch(error){console.error(error.message,error.detail??'',error.where??'');process.exitCode=1;} finally {await db.close();}
