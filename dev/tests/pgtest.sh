set -e
D=/tmp/pgtest; rm -rf $D; mkdir -p $D; chown postgres $D 2>/dev/null || true
PGBIN=/usr/lib/postgresql/16/bin
su postgres -c "$PGBIN/initdb -D $D/data -A trust >/dev/null" 
su postgres -c "$PGBIN/pg_ctl -D $D/data -o '-p 5499 -k $D' -l $D/log start -w >/dev/null"
P="psql -h $D -p 5499 -U postgres -v ON_ERROR_STOP=1 -q"
$P -d postgres <<'SQL'
create role anon nologin; create role authenticated nologin;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
grant usage on schema auth to anon, authenticated; grant usage on schema public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
insert into auth.users values ('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222');
SQL
echo "== schema (2x uitvoeren: herhaalbaar) =="
$P -d postgres -f "$(cd "$(dirname "$0")/../.." && pwd)/supabase/schema.sql"; $P -d postgres -f "$(cd "$(dirname "$0")/../.." && pwd)/supabase/schema.sql"; echo ok
$P -d postgres -A -t <<'SQL'
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into entries(started_at,ended_at,note) values ('2026-11-09 09:00+01','2026-11-09 12:30+01','Zitting');   -- user_id via default auth.uid()
insert into costs(cost_date,description,amount) values ('2026-11-09','Reiskosten',12.5);
insert into user_settings(rate,btw) values (70,21);
select 'user1 ziet', (select count(*) from entries), (select count(*) from costs), (select rate from user_settings);
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select 'user2 ziet', (select count(*) from entries), (select count(*) from costs), (select count(*) from user_settings);
-- user2 probeert een rij voor user1 te schrijven
do $$ begin insert into entries(user_id,started_at,ended_at) values ('11111111-1111-1111-1111-111111111111',now(),now()+interval '1h'); raise exception 'FOUT: schrijven namens een ander is gelukt'; exception when insufficient_privilege then raise notice 'user2 -> insert namens user1 geweigerd (goed)'; end $$;
-- user2 probeert user1 uren te verwijderen/wijzigen
with d as (delete from entries returning 1) select 'user2 verwijderde', count(*) from d;
update entries set note='gehackt';
reset role; select 'user1 uren nog aanwezig', count(*) from entries;
-- constraint: eindtijd voor begintijd
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do $$ begin insert into entries(started_at,ended_at) values (now(),now()-interval '1h'); raise exception 'FOUT'; exception when check_violation then raise notice 'eind<begin geweigerd (goed)'; end $$;
-- anon (niet ingelogd)
reset role; set role anon;
do $$ begin perform count(*) from entries; raise exception 'FOUT: anon mag lezen'; exception when insufficient_privilege then raise notice 'anon geweigerd (goed)'; end $$;
SQL
su postgres -c "$PGBIN/pg_ctl -D $D/data stop -m fast >/dev/null"
