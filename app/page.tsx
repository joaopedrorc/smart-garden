import { getTelemetryDB } from "@/app/actions/telemetry";
import { DashboardMetrics } from "@/components/DashboardMetrics";

export default async function DashboardPage() {
  const db = await getTelemetryDB();

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
        <p className="text-muted-foreground">
          Métricas consolidadas de todos os arquivos enviados.
        </p>
      </div>

      <DashboardMetrics records={db.records} />
    </div>
  );
}
