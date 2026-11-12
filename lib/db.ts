import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";

// Um único pool por processo (o hot reload do Next.js recria módulos em dev).
// DATABASE_URL é a conexão "pooled" do Neon (PgBouncer), indicada para a aplicação.
const globalForDb = globalThis as unknown as { pool?: Pool };

export function getPool(): Pool {
  if (globalForDb.pool) return globalForDb.pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não definida.");

  const pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 20_000 });
  // Na Vercel (Fluid compute), mantém a instância viva até liberar conexões ociosas
  attachDatabasePool(pool);
  globalForDb.pool = pool;
  return pool;
}

export interface TelemetryRow {
  measured_at: Date;
  temperature_c: number | null;
  relative_humidity: number | null;
  soil_raw: number | null;
  soil_moisture_pct: number | null;
  rssi_dbm: number | null;
}

export interface DeviceRow {
  id: string;
  name: string | null;
  last_seen_at: Date | null;
}
