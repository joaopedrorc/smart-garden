import { getTelemetryDB } from "@/app/actions/telemetry";
import { DashboardMetrics } from "@/components/DashboardMetrics";

export default async function DashboardPage() {
  const db = await getTelemetryDB();

  return (
    <div className="space-y-6 p-4 md:space-y-8 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Visão Geral</h1>
        <p className="text-muted-foreground">
          Métricas consolidadas de todos os arquivos enviados.
        </p>
      </div>

      <DashboardMetrics records={db.records} />
    </div>
  );
}
