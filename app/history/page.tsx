import { getTelemetryDB } from "@/app/actions/telemetry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteRowButton, ClearAllButton } from "@/components/DeleteButtons";

export default async function HistoryPage() {
  const db = await getTelemetryDB();

  const sortedUploads = [...db.uploads].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Histórico de Uploads
          </h1>
          <p className="text-muted-foreground">
            Gerencie as remessas de telemetria enviadas para o banco de dados.
          </p>
        </div>
        {sortedUploads.length > 0 && <ClearAllButton />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Arquivos Processados</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedUploads.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum upload registrado ainda.
            </p>
          ) : (
            <>
            {/* Celular: um cartão por arquivo, com a ação sempre visível */}
            <ul className="divide-y sm:hidden">
              {sortedUploads.map((upload) => (
                <li key={upload.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{upload.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(upload.date).toLocaleString("pt-BR")} · {upload.recordCount} registros
                    </p>
                  </div>
                  <DeleteRowButton uploadId={upload.id} />
                </li>
              ))}
            </ul>

            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Data do Upload</TableHead>
                  <TableHead>Nome do Arquivo</TableHead>
                  <TableHead className="text-right">
                    Registros Inseridos
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUploads.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell>
                      {new Date(upload.date).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {upload.filename}
                    </TableCell>
                    <TableCell className="text-right">
                      {upload.recordCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteRowButton uploadId={upload.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
