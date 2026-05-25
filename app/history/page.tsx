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
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
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
            <Table>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
