import { connection } from "next/server";
import { getPool, type DeviceRow, type TelemetryRow } from "@/lib/db";
import { SensorLive } from "@/components/SensorLive";
import { AutoRefresh } from "@/components/AutoRefresh";

const WINDOW_HOURS = 72;

export default async function SensorPage() {
  await connection();

  const pool = getPool();
  const { rows: devices } = await pool.query<DeviceRow & { online: boolean }>(
    `select id, name, last_seen_at,
            coalesce(last_seen_at > now() - interval '5 minutes', false) as online
     from devices
     order by last_seen_at desc nulls last
     limit 1`,
  );
  const device = devices[0];

  const readings = device
    ? (
        await pool.query<TelemetryRow>(
          `select measured_at, temperature_c, relative_humidity,
                  soil_raw, soil_moisture_pct, rssi_dbm
           from telemetry
           where device_id = $1
             and measured_at > now() - make_interval(hours => $2)
           order by measured_at`,
          [device.id, WINDOW_HOURS],
        )
      ).rows
    : [];

  return (
    <div className="p-8 space-y-8">
      <AutoRefresh intervalMs={60_000} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sensor em tempo real</h1>
        <p className="text-muted-foreground">
          Telemetria do nó ESP32 instalado na horta (últimas {WINDOW_HOURS} h).
          Atualização automática a cada minuto.
        </p>
      </div>

      <SensorLive
        device={device ? { id: device.id, online: device.online } : null}
        readings={readings.map((r) => ({ ...r, measured_at: r.measured_at.toISOString() }))}
      />
    </div>
  );
}
