import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '../../.db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {digestDates,validateSchedule,summaryInstructions} from '../functions/_shared/telegramDigest.ts';
assert.equal(digestDates(new Date('2026-10-08T02:59:59Z')).today,'2026-10-07');
assert.equal(digestDates(new Date('2026-10-08T03:00:00Z')).today,'2026-10-08');
assert.equal(digestDates(new Date('2026-12-31T23:00:00-03:00')).tomorrow,'2027-01-01');
assert.equal(digestDates(new Date('2028-02-28T21:00:00-03:00')).tomorrow,'2028-02-29');
for(const bad of [{enabled:true,weekdays:[],sendTime:'21:00'},{enabled:true,weekdays:[7],sendTime:'21:00'},{enabled:true,weekdays:[1,1],sendTime:'21:00'},{enabled:true,weekdays:[1],sendTime:'24:00'}])assert.throws(()=>validateSchedule(bad));
assert.deepEqual(validateSchedule({enabled:true,weekdays:[5,1],sendTime:'23:59'}).weekdays,[1,5]);
assert.ok(summaryInstructions().includes('reserva não prova conclusão'));
const db=new PGlite();
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated,service_role;grant execute on function auth.uid() to authenticated,service_role;`);
 const schema=await readFile(new URL('../schema/telegram-digest.sql',import.meta.url),'utf8');await db.exec(schema.split('-- Reuse')[0]+'commit;');
 const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002';
 await db.exec(`insert into auth.users values('${a}'),('${b}');insert into torre_telegram_settings(user_id,link_hash,link_expires_at) values('${a}','valid',now()+interval '10 minutes'),('${b}','expired',now()-interval '1 minute');set role service_role;`);
 const bind=async(uid,hash,chat)=>(await db.query('select torre_telegram_bind($1,$2,$3) as ok',[uid,hash,chat])).rows[0].ok;
 assert.equal(await bind(a,'wrong',123),false);assert.equal(await bind(b,'expired',456),false);assert.equal(await bind(a,'valid',123),true);assert.equal(await bind(a,'valid',456),false);
 await db.exec(`update torre_telegram_settings set enabled=true,send_time=(now() at time zone timezone)::time-interval '1 minute',weekdays=array[extract(dow from now() at time zone timezone)::smallint] where user_id='${a}';`);
 assert.equal((await db.query('select * from torre_telegram_claim()')).rows.length,1);assert.equal((await db.query('select * from torre_telegram_claim()')).rows.length,0);
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${b}';`);
 assert.equal((await db.query('select user_id,enabled from torre_telegram_settings')).rows.length,1);assert.equal((await db.query('select * from torre_telegram_deliveries')).rows.length,0);
 await assert.rejects(()=>db.query('select link_hash from torre_telegram_settings'));await assert.rejects(()=>db.query('select torre_telegram_claim()'));await assert.rejects(()=>db.query(`update torre_telegram_settings set enabled=true`));
 console.log('PASS: São Paulo dates, schedule validation, one-time link, expiry, no duplicate claims, RLS and secret field protection');
}finally{await db.close();}
