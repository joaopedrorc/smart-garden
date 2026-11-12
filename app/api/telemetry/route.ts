import { timingSafeEqual } from "crypto";
import { getPool } from "@/lib/db";

// Recebe lotes de leituras do nó ESP32.
// Autenticação: header "Authorization: Bearer <DEVICE_API_KEY>".
//
// Corpo esperado:
// {
//   "device_id": "horta-franca-01",
//   "rssi": -61,
//   "readings": [
//     { "ts": 1731427200, "temperature_c": 24.8, "relative_humidity": 61,
//       "soil_raw": 2140, "soil_pct": 47.5 }
//   ]
// }

const MAX_READINGS = 100;
const MIN_TS = Date.UTC(2024, 0, 1) / 1000;
const MAX_CLOCK_SKEW_S = 10 * 60;

type Reading = {
  ts: number;
  temperature_c: number | null;
  relative_humidity: number | null;
  soil_raw: number | null;
  soil_pct: number | null;
};

function isAuthorized(request: Request): boolean {
  const expected = process.env.DEVICE_API_KEY;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Valores fora da faixa física do sensor viram null (leitura descartada)
function inRange(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value >= min && value <= max ? value : null;
}

function parseReadings(raw: unknown): Reading[] | string {
  if (!Array.isArray(raw) || raw.length === 0) return "readings deve ser uma lista não vazia";
  if (raw.length > MAX_READINGS) return `no máximo ${MAX_READINGS} leituras por lote`;

  const nowS = Date.now() / 1000;
  const readings: Reading[] = [];

  for (const item of raw) {
    if (typeof item !== "object" || item === null) return "leitura inválida";
    const r = item as Record<string, unknown>;
    if (typeof r.ts !== "number" || !Number.isInteger(r.ts)) return "ts deve ser um inteiro (epoch UTC em segundos)";
    if (r.ts < MIN_TS || r.ts > nowS + MAX_CLOCK_SKEW_S) return `ts fora do intervalo aceito: ${r.ts}`;

    readings.push({
      ts: r.ts,
      temperature_c: inRange(r.temperature_c, -20, 70),
      relative_humidity: inRange(r.relative_humidity, 0, 100),
      soil_raw: inRange(r.soil_raw, 0, 4095),
      soil_pct: inRange(r.soil_pct, 0, 100),
    });
  }
  return readings;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "não autorizado" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const deviceId = body.device_id;
  if (typeof deviceId !== "string" || !/^[a-z0-9-]{3,64}$/.test(deviceId)) {
    return Response.json({ error: "device_id inválido" }, { status: 400 });
  }

  const readings = parseReadings(body.readings);
  if (typeof readings === "string") {
    return Response.json({ error: readings }, { status: 400 });
  }

  const rssi = typeof body.rssi === "number" ? Math.round(body.rssi) : null;
  const rows = readings.map((r) => ({
    device_id: deviceId,
    measured_at: new Date(r.ts * 1000),
    temperature_c: r.temperature_c,
    relative_humidity: r.relative_humidity,
    soil_raw: r.soil_raw === null ? null : Math.round(r.soil_raw),
    soil_moisture_pct: r.soil_pct,
    rssi_dbm: rssi,
  }));

  // Insert em lote, parametrizado: ($1..$7), ($8..$14), ...
  const columns = [
    "device_id", "measured_at", "temperature_c", "relative_humidity",
    "soil_raw", "soil_moisture_pct", "rssi_dbm",
  ] as const;
  const values = rows.flatMap((row) => columns.map((c) => row[c]));
  const placeholders = rows
    .map((_, i) => `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(", ")})`)
    .join(", ");

  const client = await getPool().connect();
  let inserted: number;
  try {
    await client.query("begin");
    await client.query(
      `insert into devices (id, last_seen_at) values ($1, now())
       on conflict (id) do update set last_seen_at = now()`,
      [deviceId],
    );
    const result = await client.query(
      `insert into telemetry (${columns.join(", ")}) values ${placeholders}
       on conflict (device_id, measured_at) do nothing`,
      values,
    );
    await client.query("commit");
    inserted = result.rowCount ?? 0;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  // "accepted" inclui duplicatas: o ESP32 pode descartar o lote do buffer
  return Response.json({ accepted: rows.length, inserted }, { status: 201 });
}

// Consulta rápida das últimas leituras (diagnóstico)
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "não autorizado" }, { status: 401 });
  }

  const { rows } = await getPool().query(
    `select device_id, measured_at, temperature_c, relative_humidity,
            soil_raw, soil_moisture_pct, rssi_dbm
     from telemetry
     order by measured_at desc
     limit 20`,
  );
  return Response.json({ readings: rows });
}
