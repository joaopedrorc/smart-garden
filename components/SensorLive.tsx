"use client";

import { Droplets, Sprout, Thermometer, Wifi } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Reading {
  measured_at: string;
  temperature_c: number | null;
  relative_humidity: number | null;
  soil_raw: number | null;
  soil_moisture_pct: number | null;
  rssi_dbm: number | null;
}

interface Device {
  id: string;
  name: string | null;
  // Calculado no banco: recebeu dados nos últimos 5 minutos
  online: boolean;
}

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

function soilStatus(pct: number | null) {
  if (pct === null) return { label: "Sem leitura", color: "text-muted-foreground" };
  if (pct < 40) return { label: "Seco", color: "text-red-600" };
  if (pct > 80) return { label: "Encharcado", color: "text-yellow-600" };
  return { label: "Ideal", color: "text-green-600" };
}

export function SensorLive({ device, readings }: { device: Device | null; readings: Reading[] }) {
  if (!device || readings.length === 0) {
    return (
      <Card className="flex h-[400px] items-center justify-center border-dashed">
        <p className="text-muted-foreground">
          Nenhuma leitura recebida ainda. Ligue o ESP32 e aguarde o primeiro envio.
        </p>
      </Card>
    );
  }

  const last = readings[readings.length - 1];
  const { online } = device;
  const status = soilStatus(last.soil_moisture_pct);

  const chartData = readings.map((r) => ({
    time: timeLabel(r.measured_at),
    Temperatura: r.temperature_c,
    UmidadeAr: r.relative_humidity,
    UmidadeSolo: r.soil_moisture_pct,
  }));

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Temperatura do ar</CardTitle>
            <Thermometer className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{last.temperature_c?.toFixed(1) ?? "—"}°C</div>
            <p className="text-xs text-muted-foreground">Leitura de {timeLabel(last.measured_at)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Umidade relativa do ar</CardTitle>
            <Droplets className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{last.relative_humidity?.toFixed(0) ?? "—"}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Umidade do solo</CardTitle>
            <Sprout className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{last.soil_moisture_pct?.toFixed(0) ?? "—"}%</div>
            <p className={`text-xs font-medium ${status.color}`}>{status.label}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Nó sensor</CardTitle>
            <Wifi className={`h-4 w-4 ${online ? "text-green-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{online ? "Online" : "Offline"}</div>
            <p className="text-xs text-muted-foreground">
              {device.name ?? device.id} · {readings.length} leituras · {last.rssi_dbm ?? "—"} dBm
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ar: temperatura e umidade relativa</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} minTickGap={40} />
                <YAxis yAxisId="left" unit="°C" />
                <YAxis yAxisId="right" orientation="right" unit="%" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="Temperatura" stroke="#ef4444" strokeWidth={2} dot={false} connectNulls />
                <Line yAxisId="right" type="monotone" dataKey="UmidadeAr" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Solo: umidade (%)</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} minTickGap={40} />
                <YAxis unit="%" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="UmidadeSolo" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
