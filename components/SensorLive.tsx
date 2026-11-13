"use client";

import { Droplets, Sprout, Thermometer, Wifi } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SOIL_BANDS, SOIL_REFERENCE, bandRange, classifySoil, soilIndex } from "@/lib/soil";

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

// O estado do solo usa a média dos últimos minutos: leituras isoladas oscilam
const SOIL_SMOOTHING_READINGS = 15;

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtRaw = (raw: number) => raw.toLocaleString("pt-BR");

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

  const recentSoil = readings
    .slice(-SOIL_SMOOTHING_READINGS)
    .map((r) => r.soil_raw)
    .filter((v): v is number => v !== null);
  const soilMean = recentSoil.length
    ? Math.round(recentSoil.reduce((a, b) => a + b, 0) / recentSoil.length)
    : null;
  const soilBand = classifySoil(soilMean);
  const soilPct = soilIndex(soilMean);

  // Leituras com a sonda fora da terra (montagem, manutenção) ficam fora do gráfico do solo:
  // elas esticariam o eixo e esconderiam a variação real
  const inSoil = (raw: number | null) => raw !== null && classifySoil(raw)?.key !== "sem-contato";
  const chartData = readings.map((r) => ({
    time: timeLabel(r.measured_at),
    Temperatura: r.temperature_c,
    UmidadeAr: r.relative_humidity,
    LeituraSolo: inSoil(r.soil_raw) ? r.soil_raw : null,
  }));
  const soilValues = readings.map((r) => r.soil_raw).filter((v): v is number => inSoil(v));
  const soilDomain: [number, number] = soilValues.length
    ? [Math.max(0, Math.min(...soilValues) - 60), Math.max(...soilValues) + 60]
    : [0, SOIL_REFERENCE.airRaw];
  const soilHidden = readings.length - soilValues.length;

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
            <div className={`text-2xl font-bold ${soilBand?.textClass ?? ""}`}>
              {soilBand?.label ?? "Sem leitura"}
            </div>
            <p className="text-xs text-muted-foreground">
              Índice {soilPct?.toFixed(1) ?? "—"}% · leitura bruta{" "}
              {soilMean !== null ? fmtRaw(soilMean) : "—"}
            </p>
            {soilBand && <p className="mt-1 text-xs">{soilBand.advice}</p>}
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
            <CardTitle>Solo: leitura bruta do sensor</CardTitle>
            <p className="text-xs text-muted-foreground">
              Eixo invertido: para cima = mais úmido. As cores de fundo são as faixas da legenda abaixo.
              {soilHidden > 0 &&
                ` ${soilHidden} leitura(s) com a sonda fora da terra não aparecem no gráfico.`}
            </p>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} minTickGap={40} />
                <YAxis reversed domain={soilDomain} allowDecimals={false} width={56} />
                {SOIL_BANDS.map((band, i) => {
                  const [y1, y2] = bandRange(i);
                  return (
                    <ReferenceArea
                      key={band.key}
                      y1={y1}
                      y2={y2}
                      ifOverflow="hidden"
                      fill={band.fill}
                      fillOpacity={0.08}
                      strokeOpacity={0}
                    />
                  );
                })}
                <ReferenceLine
                  y={SOIL_REFERENCE.fieldCapacityRaw}
                  ifOverflow="hidden"
                  stroke="#0ea5e9"
                  strokeDasharray="4 4"
                  label={{ value: "capacidade de campo", position: "insideTopRight", fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value) => {
                    const raw = Number(value);
                    return [`${fmtRaw(raw)} (${classifySoil(raw)?.label ?? "—"})`, "Leitura do solo"];
                  }}
                />
                <Line type="monotone" dataKey="LeituraSolo" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Como ler a umidade do solo</CardTitle>
          <p className="text-sm text-muted-foreground">
            O sensor mede a condução elétrica entre as duas hastes da sonda: quanto menor a leitura
            (0 a 4.095), mais úmido está o solo. O estado exibido usa a média das últimas{" "}
            {SOIL_SMOOTHING_READINGS} leituras.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Estado</th>
                <th className="py-2 pr-4 font-medium">Leitura bruta</th>
                <th className="py-2 font-medium">O que fazer</th>
              </tr>
            </thead>
            <tbody>
              {SOIL_BANDS.map((band, i) => {
                const [min, max] = bandRange(i);
                const current = soilBand?.key === band.key;
                return (
                  <tr key={band.key} className={`border-b last:border-0 ${current ? "bg-muted/60" : ""}`}>
                    <td className={`py-2 pr-4 font-medium ${band.textClass}`}>
                      {band.label}
                      {current && <span className="ml-2 text-xs text-muted-foreground">(agora)</span>}
                    </td>
                    <td className="py-2 pr-4 tabular-nums">
                      {fmtRaw(min)} a {fmtRaw(max - 1)}
                    </td>
                    <td className="py-2">{band.advice}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              Referências medidas nesta horta: solo saturado ≈ {fmtRaw(SOIL_REFERENCE.saturatedRaw)},
              capacidade de campo ≈ {fmtRaw(SOIL_REFERENCE.fieldCapacityRaw)}, sonda na água ={" "}
              {fmtRaw(SOIL_REFERENCE.waterRaw)}, sonda no ar = {fmtRaw(SOIL_REFERENCE.airRaw)}.
            </p>
            <p>
              O índice de umidade vai de 0% (sonda no ar) a 100% (solo saturado desta horta). É uma
              escala relativa ao sensor, não a umidade volumétrica do solo.
            </p>
            {SOIL_REFERENCE.provisional && (
              <p>
                Calibração provisória: as faixas do lado seco (Úmido a Seco) ainda serão ajustadas com
                o ensaio de calibração usando terra seca da própria horta.
              </p>
            )}
            <p>
              Sensores resistivos também variam com a temperatura do solo: nas horas quentes do dia a
              leitura desce (parece mais úmido) sem que tenha chovido ou sido regado. A leitura da
              madrugada, com o solo frio, é a referência mais confiável.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
