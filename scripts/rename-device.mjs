// Renomeia um nó sensor e move o histórico de leituras para o novo ID.
// Uso: npm run db:rename-device -- <id-antigo> <id-novo> "<nome de exibição>"
// Idempotente: pode rodar de novo se o nó voltar a enviar com o ID antigo.
import pg from "pg";

const [oldId, newId, name] = process.argv.slice(2);
if (!oldId || !newId || !name) {
  console.error('Uso: npm run db:rename-device -- <id-antigo> <id-novo> "<nome>"');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
const client = new pg.Client({ connectionString });
await client.connect();

try {
  await client.query("begin");
  await client.query(
    `insert into devices (id, name, latitude, longitude, altitude_m, created_at, last_seen_at)
     select $2, $3, latitude, longitude, altitude_m, created_at, last_seen_at
     from devices where id = $1
     on conflict (id) do update set name = excluded.name,
       last_seen_at = greatest(devices.last_seen_at, excluded.last_seen_at)`,
    [oldId, newId, name],
  );
  // Garante o registro do novo ID mesmo que o antigo não exista
  await client.query(
    `insert into devices (id, name) values ($1, $2)
     on conflict (id) do update set name = excluded.name`,
    [newId, name],
  );
  const moved = await client.query(
    `update telemetry set device_id = $2
     where device_id = $1
       and not exists (
         select 1 from telemetry t
         where t.device_id = $2 and t.measured_at = telemetry.measured_at)`,
    [oldId, newId],
  );
  await client.query("delete from telemetry where device_id = $1", [oldId]);
  await client.query("delete from devices where id = $1", [oldId]);
  await client.query("commit");
  console.log(`${moved.rowCount} leituras movidas de ${oldId} para ${newId} ("${name}").`);
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
