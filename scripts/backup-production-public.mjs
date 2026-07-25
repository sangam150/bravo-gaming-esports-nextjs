import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const outputDirectory = process.argv[2];

if (!outputDirectory) {
  throw new Error("Usage: node --env-file=.env.local scripts/backup-production-public.mjs <output-directory>");
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required");
}

await mkdir(outputDirectory, { recursive: true });

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  await client.query("begin transaction isolation level repeatable read read only");

  const snapshot = {
    generatedAt: new Date().toISOString(),
    database: "production",
    schema: "public",
    tables: {},
    metadata: {},
  };

  const tablesResult = await client.query(`
    select tablename
    from pg_catalog.pg_tables
    where schemaname = 'public'
    order by tablename
  `);

  for (const { tablename } of tablesResult.rows) {
    const safeIdentifier = `"${String(tablename).replaceAll('"', '""')}"`;
    const rows = await client.query(`select * from public.${safeIdentifier}`);
    snapshot.tables[tablename] = rows.rows;
  }

  const metadataQueries = {
    columns: `
      select table_name, column_name, ordinal_position, data_type, udt_name,
             is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public'
      order by table_name, ordinal_position
    `,
    constraints: `
      select con.conname as name, cls.relname as table_name,
             pg_get_constraintdef(con.oid, true) as definition
      from pg_constraint con
      join pg_class cls on cls.oid = con.conrelid
      join pg_namespace ns on ns.oid = cls.relnamespace
      where ns.nspname = 'public'
      order by cls.relname, con.conname
    `,
    indexes: `
      select tablename as table_name, indexname as name, indexdef as definition
      from pg_indexes
      where schemaname = 'public'
      order by tablename, indexname
    `,
    policies: `
      select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      from pg_policies
      where schemaname = 'public'
      order by tablename, policyname
    `,
    functions: `
      select p.proname as name, pg_get_function_identity_arguments(p.oid) as arguments,
             pg_get_functiondef(p.oid) as definition
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
      order by p.proname, arguments
    `,
    views: `
      select viewname as name, definition
      from pg_views
      where schemaname = 'public'
      order by viewname
    `,
  };

  for (const [name, sql] of Object.entries(metadataQueries)) {
    snapshot.metadata[name] = (await client.query(sql)).rows;
  }

  const migrationTable = await client.query(`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'supabase_migrations'
        and table_name = 'schema_migrations'
    ) as exists
  `);
  snapshot.metadata.migrations = migrationTable.rows[0]?.exists
    ? (await client.query("select * from supabase_migrations.schema_migrations order by version")).rows
    : [];

  await client.query("commit");

  const json = JSON.stringify(snapshot, null, 2);
  const outputFile = path.join(outputDirectory, "production-public-snapshot.json");
  await writeFile(outputFile, json, { encoding: "utf8", flag: "wx" });

  const manifest = {
    generatedAt: snapshot.generatedAt,
    file: path.basename(outputFile),
    sha256: createHash("sha256").update(json).digest("hex"),
    tableCount: Object.keys(snapshot.tables).length,
    rowCounts: Object.fromEntries(
      Object.entries(snapshot.tables).map(([table, rows]) => [table, rows.length])
    ),
    migrationCount: snapshot.metadata.migrations.length,
  };
  await writeFile(
    path.join(outputDirectory, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    { encoding: "utf8", flag: "wx" }
  );

  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
} catch (error) {
  await client.query("rollback").catch(() => {});
  throw error;
} finally {
  await client.end();
}
