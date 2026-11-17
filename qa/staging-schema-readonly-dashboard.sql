-- Supabase Dashboard SQL Editor fallback for project yppefayrepkqpqtprbqa only.
-- Verify the selected Dashboard project before running. This transaction is
-- read-only and returns catalog metadata/hashes, never application row data.

begin isolation level repeatable read read only;

select
  'yppefayrepkqpqtprbqa' as expected_project_ref,
  current_database() as database_name,
  current_user as database_user,
  current_setting('server_version') as server_version,
  current_setting('transaction_read_only') as transaction_read_only;

select
  version,
  name,
  md5(coalesce(statements::text, '')) as statements_md5,
  length(coalesce(statements::text, '')) as statements_length
from supabase_migrations.schema_migrations
order by version;

select
  n.nspname as schema_name,
  c.relname as relation_name,
  c.relkind,
  pg_get_userbyid(c.relowner) as owner,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'auth', 'storage')
  and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
order by n.nspname, c.relname;

select
  n.nspname as schema_name,
  c.relname as relation_name,
  a.attname as column_name,
  a.attnum as ordinal_position,
  pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
  not a.attnotnull as is_nullable,
  md5(coalesce(pg_get_expr(ad.adbin, ad.adrelid), '')) as default_md5
from pg_catalog.pg_attribute a
join pg_catalog.pg_class c on c.oid = a.attrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
left join pg_catalog.pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
where n.nspname in ('public', 'auth', 'storage')
  and c.relkind in ('r', 'p', 'v', 'm', 'f')
  and a.attnum > 0 and not a.attisdropped
order by n.nspname, c.relname, a.attnum;

select
  n.nspname as schema_name,
  c.relname as relation_name,
  con.conname as constraint_name,
  con.contype as constraint_type,
  md5(pg_get_constraintdef(con.oid, true)) as definition_md5,
  con.convalidated as validated
from pg_catalog.pg_constraint con
join pg_catalog.pg_class c on c.oid = con.conrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'auth', 'storage')
order by n.nspname, c.relname, con.conname;

select
  schemaname as schema_name,
  tablename as relation_name,
  policyname as policy_name,
  permissive,
  roles,
  cmd,
  md5(coalesce(qual, '')) as using_md5,
  md5(coalesce(with_check, '')) as with_check_md5
from pg_catalog.pg_policies
where schemaname in ('public', 'auth', 'storage')
order by schemaname, tablename, policyname;

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_userbyid(p.proowner) as owner,
  p.prosecdef as security_definer,
  p.provolatile as volatility,
  md5(pg_get_functiondef(p.oid)) as definition_md5
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'auth', 'storage')
order by n.nspname, p.proname, identity_arguments;

select
  n.nspname as schema_name,
  c.relname as relation_name,
  case when acl.grantee = 0 then 'PUBLIC' else pg_get_userbyid(acl.grantee) end as grantee,
  acl.privilege_type,
  acl.is_grantable
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
cross join lateral aclexplode(coalesce(c.relacl, acldefault(
  case when c.relkind = 'S' then 'S'::"char" else 'r'::"char" end,
  c.relowner
))) acl
where n.nspname in ('public', 'auth', 'storage')
  and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
order by n.nspname, c.relname, grantee, acl.privilege_type;

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  case when acl.grantee = 0 then 'PUBLIC' else pg_get_userbyid(acl.grantee) end as grantee,
  acl.privilege_type,
  acl.is_grantable
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
where n.nspname in ('public', 'auth', 'storage')
order by n.nspname, p.proname, identity_arguments, grantee, acl.privilege_type;

select
  pg_describe_object(d.classid, d.objid, d.objsubid) as dependent_object,
  pg_describe_object(d.refclassid, d.refobjid, d.refobjsubid) as referenced_object,
  d.deptype as dependency_type
from pg_catalog.pg_depend d
left join pg_catalog.pg_class c
  on d.classid = 'pg_class'::regclass and c.oid = d.objid
left join pg_catalog.pg_proc p
  on d.classid = 'pg_proc'::regclass and p.oid = d.objid
join pg_catalog.pg_namespace n on n.oid = coalesce(c.relnamespace, p.pronamespace)
where n.nspname in ('public', 'auth', 'storage')
order by dependent_object, referenced_object, dependency_type;

rollback;
