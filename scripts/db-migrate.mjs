// Aplica db/schema.sql no banco.
// Usa a conexão direta (DATABASE_URL_UNPOOLED): DDL não deve passar pelo PgBouncer.
// Uso: npm run db:migrate
import { readFile } from "node:fs/promises";
import pg from "pg";

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL_UNPOOLED/DATABASE_URL não definidas (confira o .env.local).");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf-8");

await client.connect();
try {
  await client.query(schema);
  const { rows } = await client.query(
    "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
  );
  console.log("Esquema aplicado. Tabelas:", rows.map((r) => r.table_name).join(", "));
} finally {
  await client.end();
}
