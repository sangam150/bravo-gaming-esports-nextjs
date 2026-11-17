import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { getVerifiedDatabaseConnection } from "../scripts/lib/verified-database-connection.mjs";

const STAGING_PROJECT_REF = "yppefayrepkqpqtprbqa";
const OUTPUT_PATH = path.resolve("qa-artifacts/final-platform-execution/staging-schema-readonly-inspection.json");
const { Client } = pg;

function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function validateStagingConnection(value, name) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const usernameSegments = decodeURIComponent(url.username).toLowerCase().split(".");
  const direct = host === `db.${STAGING_PROJECT_REF}.supabase.co`;
  const pooler = (host.endsWith(".pooler.supabase.com") || host.endsWith(".pooler.supabase.net"))
    && usernameSegments.includes(STAGING_PROJECT_REF);
  if (!direct && !pooler) {
    throw new Error(`${name} is not a recognized direct or pooler endpoint for the designated staging project.`);
  }
  return getVerifiedDatabaseConnection(value, name, STAGING_PROJECT_REF);
}

function redactSqlLiterals(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/'(?:''|[^'])*'/g, "'<literal>'")
    .replace(/\$([A-Za-z_][A-Za-z0-9_]*)?\$[\s\S]*?\$\1\$/g, "$<body>")
    .replace(/\b(?:sb_secret_|sb_publishable_)[A-Za-z0-9._-]+\b/g, "<redacted-key>")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "<redacted-jwt>")
    .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g, "<redacted-private-key>");
}

const SQL_TEXT_FIELDS = new Set([
  "column_default",
  "definition",
  "generation_expression",
  "qual",
  "with_check",
]);

function sanitizeEvidence(value, key = "") {
  if (Array.isArray(value)) return value.map((entry) => sanitizeEvidence(entry));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => {
      if (childKey === "statements") {
        const statements = Array.isArray(childValue) ? childValue : [childValue];
        return [childKey, statements.map((statement) => ({
          sha256: sha256(String(statement ?? "")),
          length: String(statement ?? "").length,
        }))];
      }
      return [childKey, sanitizeEvidence(childValue, childKey)];
    }));
  }
  if (typeof value === "string" && SQL_TEXT_FIELDS.has(key)) {
    return { sha256: sha256(value), redacted: redactSqlLiterals(value) };
  }
  return typeof value === "string" ? redactSqlLiterals(value) : value;
}

async function writeEvidence(evidence) {
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
}

const connectionName = process.env.DIRECT_URL?.trim() ? "DIRECT_URL" : "DATABASE_URL";
const configuredConnection = process.env[connectionName]?.trim();
if (!configuredConnection) throw new Error(`${connectionName} is missing.`);
const verified = validateStagingConnection(configuredConnection, connectionName);
const client = new Client({
  connectionString: verified.connectionString,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 30_000,
  query_timeout: 35_000,
  ssl: verified.ssl,
  application_name: "bravo_staging_readonly_schema_inspection",
});

const queries = {
  identity: `
    select current_database() as database_name,
           current_user as database_user,
           current_setting('server_version') as server_version,
           current_setting('transaction_read_only') as transaction_read_only
  `,
  migrationLedgerShape: `
    select a.attname as column_name, a.attnum as ordinal_position,
           pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
           not a.attnotnull as is_nullable
      from pg_catalog.pg_attribute a
      join pg_catalog.pg_class c on c.oid = a.attrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'supabase_migrations'
       and c.relname = 'schema_migrations'
       and a.attnum > 0 and not a.attisdropped
     order by a.attnum
  `,
  migrationLedger: `
    select to_jsonb(m) as migration
      from supabase_migrations.schema_migrations m
     order by version
  `,
  schemas: `
    select n.nspname as schema_name, pg_get_userbyid(n.nspowner) as owner,
           n.nspacl::text as acl
      from pg_catalog.pg_namespace n
     where n.nspname in ('public', 'auth', 'storage', 'supabase_migrations')
     order by n.nspname
  `,
  relations: `
    select n.nspname as schema_name, c.relname as relation_name, c.relkind,
           c.relpersistence as persistence, pg_get_userbyid(c.relowner) as owner,
           c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname in ('public', 'auth', 'storage')
       and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
     order by n.nspname, c.relname
  `,
  views: `
    select n.nspname as schema_name, c.relname as view_name,
           pg_get_userbyid(c.relowner) as owner,
           pg_get_viewdef(c.oid, true) as definition
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname in ('public', 'auth', 'storage')
       and c.relkind in ('v', 'm')
     order by n.nspname, c.relname
  `,
  types: `
    select n.nspname as schema_name, t.typname as type_name, t.typtype as type_kind,
           pg_get_userbyid(t.typowner) as owner, bt.typname as base_type,
           e.enumlabel as enum_label, e.enumsortorder as enum_sort_order
      from pg_catalog.pg_type t
      join pg_catalog.pg_namespace n on n.oid = t.typnamespace
      left join pg_catalog.pg_type bt on bt.oid = t.typbasetype
      left join pg_catalog.pg_enum e on e.enumtypid = t.oid
     where n.nspname in ('public', 'auth', 'storage')
       and t.typtype in ('d', 'e')
     order by n.nspname, t.typname, e.enumsortorder nulls first
  `,
  extensions: `
    select e.extname as extension_name, e.extversion as extension_version,
           n.nspname as schema_name
      from pg_catalog.pg_extension e
      join pg_catalog.pg_namespace n on n.oid = e.extnamespace
     order by e.extname
  `,
  columns: `
    select n.nspname as table_schema, c.relname as table_name, a.attname as column_name,
           a.attnum as ordinal_position,
           pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
           not a.attnotnull as is_nullable,
           pg_get_expr(ad.adbin, ad.adrelid) as column_default,
           a.attidentity as identity_generation, a.attgenerated as generated_kind
      from pg_catalog.pg_attribute a
      join pg_catalog.pg_class c on c.oid = a.attrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      left join pg_catalog.pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
     where n.nspname in ('public', 'auth', 'storage')
       and c.relkind in ('r', 'p', 'v', 'm', 'f')
       and a.attnum > 0 and not a.attisdropped
     order by n.nspname, c.relname, a.attnum
  `,
  constraints: `
    select n.nspname as schema_name, c.relname as table_name,
           con.conname as constraint_name, con.contype as constraint_type,
           pg_get_constraintdef(con.oid, true) as definition,
           con.condeferrable as deferrable, con.condeferred as initially_deferred,
           con.convalidated as validated
      from pg_catalog.pg_constraint con
      join pg_catalog.pg_class c on c.oid = con.conrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname in ('public', 'auth', 'storage')
     order by n.nspname, c.relname, con.conname
  `,
  indexes: `
    select n.nspname as schema_name, c.relname as table_name, i.relname as index_name,
           pg_get_indexdef(i.oid) as definition
      from pg_catalog.pg_index x
      join pg_catalog.pg_class c on c.oid = x.indrelid
      join pg_catalog.pg_class i on i.oid = x.indexrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname in ('public', 'auth', 'storage')
     order by n.nspname, c.relname, i.relname
  `,
  triggers: `
    select n.nspname as schema_name, c.relname as table_name, t.tgname as trigger_name,
           t.tgenabled as enabled, pg_get_triggerdef(t.oid, true) as definition
      from pg_catalog.pg_trigger t
      join pg_catalog.pg_class c on c.oid = t.tgrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where not t.tgisinternal and n.nspname in ('public', 'auth', 'storage')
     order by n.nspname, c.relname, t.tgname
  `,
  policies: `
    select schemaname as schema_name, tablename as table_name, policyname as policy_name,
           permissive, roles, cmd, qual, with_check
      from pg_catalog.pg_policies
     where schemaname in ('public', 'auth', 'storage')
     order by schemaname, tablename, policyname
  `,
  functions: `
    select n.nspname as schema_name, p.proname as function_name,
           pg_get_function_identity_arguments(p.oid) as identity_arguments,
           pg_get_userbyid(p.proowner) as owner, p.prosecdef as security_definer,
           p.proleakproof as leakproof, p.provolatile as volatility,
           p.proconfig as configuration, pg_get_functiondef(p.oid) as definition
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'auth', 'storage')
     order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
  `,
  relationGrants: `
    select n.nspname as schema_name, c.relname as relation_name,
           case when acl.grantee = 0 then 'PUBLIC' else pg_get_userbyid(acl.grantee) end as grantee,
           pg_get_userbyid(acl.grantor) as grantor, acl.privilege_type, acl.is_grantable
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      cross join lateral aclexplode(coalesce(c.relacl, acldefault(
        case when c.relkind = 'S' then 'S'::"char" else 'r'::"char" end,
        c.relowner
      ))) acl
     where n.nspname in ('public', 'auth', 'storage')
       and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
     order by n.nspname, c.relname, grantee, acl.privilege_type
  `,
  routineGrants: `
    select n.nspname as schema_name, p.proname as function_name,
           pg_get_function_identity_arguments(p.oid) as identity_arguments,
           case when acl.grantee = 0 then 'PUBLIC' else pg_get_userbyid(acl.grantee) end as grantee,
           pg_get_userbyid(acl.grantor) as grantor, acl.privilege_type, acl.is_grantable
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
     where n.nspname in ('public', 'auth', 'storage')
     order by n.nspname, p.proname, identity_arguments, grantee, acl.privilege_type
  `,
  roleMemberships: `
    select member.rolname as member, role.rolname as granted_role,
           pg_get_userbyid(m.grantor) as grantor, m.admin_option
      from pg_catalog.pg_auth_members m
      join pg_catalog.pg_roles role on role.oid = m.roleid
      join pg_catalog.pg_roles member on member.oid = m.member
     where member.rolname in ('anon', 'authenticated', 'service_role', 'authenticator', current_user)
     order by member.rolname, role.rolname
  `,
  dependencies: `
    select pg_describe_object(d.classid, d.objid, d.objsubid) as dependent_object,
           pg_describe_object(d.refclassid, d.refobjid, d.refobjsubid) as referenced_object,
           d.deptype as dependency_type
      from pg_catalog.pg_depend d
      left join pg_catalog.pg_class c on d.classid = 'pg_class'::regclass and c.oid = d.objid
      left join pg_catalog.pg_proc p on d.classid = 'pg_proc'::regclass and p.oid = d.objid
      join pg_catalog.pg_namespace n on n.oid = coalesce(c.relnamespace, p.pronamespace)
     where n.nspname in ('public', 'auth', 'storage')
     order by dependent_object, referenced_object, dependency_type
  `,
};

async function inspectCredentialSafety() {
  const role = (await client.query(`
    select rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb,
           rolcanlogin, rolreplication, rolbypassrls,
           has_database_privilege(current_user, current_database(), 'CREATE') as can_create_database_objects
      from pg_catalog.pg_roles where rolname = current_user
  `)).rows[0];
  const schemaPrivileges = (await client.query(`
    select n.nspname as schema_name,
           has_schema_privilege(current_user, n.oid, 'CREATE') as can_create
      from pg_catalog.pg_namespace n
     where n.nspname in ('public', 'auth', 'storage', 'supabase_migrations')
     order by n.nspname
  `)).rows;
  const applicationPrivileges = (await client.query(`
    select n.nspname as schema_name, c.relname as relation_name,
           has_table_privilege(current_user, c.oid, 'SELECT') as can_select,
           has_table_privilege(current_user, c.oid, 'INSERT') as can_insert,
           has_table_privilege(current_user, c.oid, 'UPDATE') as can_update,
           has_table_privilege(current_user, c.oid, 'DELETE') as can_delete,
           has_table_privilege(current_user, c.oid, 'TRUNCATE') as can_truncate,
           has_table_privilege(current_user, c.oid, 'REFERENCES') as can_reference,
           has_table_privilege(current_user, c.oid, 'TRIGGER') as can_trigger
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname in ('public', 'auth', 'storage') and c.relkind in ('r', 'p', 'v', 'm', 'f')
     order by n.nspname, c.relname
  `)).rows;
  const ledger = (await client.query(`
    select to_regclass('supabase_migrations.schema_migrations') is not null as exists,
           case when to_regclass('supabase_migrations.schema_migrations') is null then false
                else has_table_privilege(current_user, 'supabase_migrations.schema_migrations', 'SELECT') end as can_select
  `)).rows[0];

  const reasons = [];
  if (!role) reasons.push("current_role_not_visible");
  if (role?.rolsuper) reasons.push("role_is_superuser");
  if (role?.rolcreaterole) reasons.push("role_can_create_roles");
  if (role?.rolcreatedb) reasons.push("role_can_create_databases");
  if (role?.rolreplication) reasons.push("role_has_replication");
  if (role?.rolbypassrls) reasons.push("role_bypasses_rls");
  if (role?.can_create_database_objects) reasons.push("role_can_create_database_objects");
  if (schemaPrivileges.some((entry) => entry.can_create)) reasons.push("role_can_create_schema_objects");
  if (applicationPrivileges.some((entry) => entry.can_select)) reasons.push("role_can_read_application_rows");
  if (applicationPrivileges.some((entry) => entry.can_insert || entry.can_update || entry.can_delete
    || entry.can_truncate || entry.can_reference || entry.can_trigger)) reasons.push("role_can_write_or_alter_application_relations");
  if (!ledger?.exists) reasons.push("migration_ledger_missing");
  if (ledger?.exists && !ledger.can_select) reasons.push("migration_ledger_select_missing");

  return {
    accepted: reasons.length === 0,
    reasons,
    role: role ? {
      name: role.rolname,
      inherits: role.rolinherit,
      canLogin: role.rolcanlogin,
      superuser: role.rolsuper,
      createRole: role.rolcreaterole,
      createDatabase: role.rolcreatedb,
      replication: role.rolreplication,
      bypassRls: role.rolbypassrls,
      createDatabaseObjects: role.can_create_database_objects,
    } : null,
    schemaPrivileges,
    applicationRelationCount: applicationPrivileges.length,
    applicationSelectableCount: applicationPrivileges.filter((entry) => entry.can_select).length,
    applicationWritableCount: applicationPrivileges.filter((entry) => entry.can_insert || entry.can_update
      || entry.can_delete || entry.can_truncate || entry.can_reference || entry.can_trigger).length,
    migrationLedger: ledger,
  };
}

const evidence = {
  checkedAt: new Date().toISOString(),
  targetProjectRef: STAGING_PROJECT_REF,
  connectionName,
  transaction: "REPEATABLE READ, READ ONLY",
  credentialSafety: null,
  results: {},
};

await client.connect();
try {
  await client.query("begin isolation level repeatable read read only");
  evidence.credentialSafety = await inspectCredentialSafety();
  if (!evidence.credentialSafety.accepted) {
    await client.query("rollback");
    await writeEvidence(evidence);
    console.error(JSON.stringify({
      status: "BLOCKED",
      targetProjectRef: STAGING_PROJECT_REF,
      reasons: evidence.credentialSafety.reasons,
      outputPath: path.relative(process.cwd(), OUTPUT_PATH).replaceAll("\\", "/"),
    }, null, 2));
    process.exitCode = 1;
  } else {
    for (const [name, sql] of Object.entries(queries)) {
      await client.query("savepoint inspection_query");
      try {
        const rows = (await client.query(sql)).rows;
        evidence.results[name] = {
          rows: sanitizeEvidence(rows),
          rawSha256: sha256(rows),
        };
        await client.query("release savepoint inspection_query");
      } catch (error) {
        await client.query("rollback to savepoint inspection_query");
        await client.query("release savepoint inspection_query");
        evidence.results[name] = {
          error: error instanceof Error ? error.message : "query_failed",
          code: error?.code ?? null,
        };
      }
    }
    await client.query("rollback");
    await writeEvidence(evidence);
    console.log(JSON.stringify({
      status: "PASS",
      targetProjectRef: STAGING_PROJECT_REF,
      transaction: evidence.transaction,
      credentialSafety: "PASS",
      outputPath: path.relative(process.cwd(), OUTPUT_PATH).replaceAll("\\", "/"),
      resultSets: Object.fromEntries(Object.entries(evidence.results).map(([name, result]) => [name, {
        rowCount: result.rows?.length ?? null,
        rawSha256: result.rawSha256 ?? null,
        status: result.error ? "BLOCKED" : "PASS",
      }])),
    }, null, 2));
  }
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
