"use client";

import React, { useMemo } from "react";
import { Activity, Droplets, Thermometer } from "lucide-react";
import { calculateAverage, calculateMedian } from "@/lib/math";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export function DashboardMetrics({ records }: { records: any[] }) {
  const metrics = useMemo(() => {
    const temps = records.map((r) => r.temperatura).filter((n) => !isNaN(n));
    const umidades = records.map((r) => r.umidade_ar).filter((n) => !isNaN(n));
    const solos = records.map((r) => r.sensor_solo).filter((n) => !isNaN(n));

    return {
      avgTemp: calculateAverage(temps).toFixed(1),
      medTemp: calculateMedian(temps).toFixed(1),
      avgUmidade: calculateAverage(umidades).toFixed(1),
      avgSolo: calculateAverage(solos).toFixed(0),
      totalLeituras: records.length,
    };
  }, [records]);

  const chartData = records.map((r) => ({
    time: `${r.data} ${r.hora}`,
    Temperatura: r.temperatura,
    UmidadeAr: r.umidade_ar,
    SensorSolo: r.sensor_solo,
  }));

  if (records.length === 0) {
    return (
      <Card className="flex h-[400px] items-center justify-center border-dashed">
        <p className="text-muted-foreground">
          Nenhum dado importado. Faça o upload de um CSV para iniciar.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Temperatura Média
            </CardTitle>
            <Thermometer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgTemp}°C</div>
            <p className="text-xs text-muted-foreground">
              Mediana: {metrics.medTemp}°C
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Umidade Rel. Ar
            </CardTitle>
            <Droplets className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgUmidade}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Umidade Solo (ADC)
            </CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgSolo}</div>
            <p className="text-xs text-muted-foreground">0 a 1023</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Leituras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalLeituras}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clima: Temp. vs Umidade (Ar)</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} minTickGap={30} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="Temperatura"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="UmidadeAr"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Solo: Resistência/Capacitância</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} minTickGap={30} />
                <YAxis reversed domain={[0, 1023]} />
                <Tooltip />
                <Legend />
                <Line
                  type="step"
                  dataKey="SensorSolo"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
