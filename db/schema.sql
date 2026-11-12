-- Esquema do Smart Garden 2.0 (PostgreSQL)
-- Idempotente: pode ser executado mais de uma vez.

create table if not exists devices (
  id           text primary key,
  name         text,
  latitude     double precision,
  longitude    double precision,
  altitude_m   double precision,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists telemetry (
  id                bigserial primary key,
  device_id         text not null references devices (id),
  measured_at       timestamptz not null,
  received_at       timestamptz not null default now(),
  temperature_c     real,
  relative_humidity real,
  soil_raw          integer,
  soil_moisture_pct real,
  rssi_dbm          integer,
  -- Reenvios do buffer do ESP32 não duplicam leituras
  unique (device_id, measured_at)
);

create index if not exists telemetry_device_time_idx
  on telemetry (device_id, measured_at desc);
