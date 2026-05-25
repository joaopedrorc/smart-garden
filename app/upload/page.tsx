// app/upload/page.tsx
"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import { UploadCloud } from "lucide-react";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const addRecords = useTelemetryStore((state) => state.addRecords);
  const router = useRouter();

  const handleFileUpload = () => {
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Mapeia os dados convertendo strings para numéricos de forma segura
        const parsedData = results.data.map((row: any) => ({
          data: row.data,
          hora: row.hora,
          temperatura: parseFloat(row.temperatura),
          umidade_ar: parseFloat(row.umidade_ar),
          sensor_solo: parseInt(row.sensor_solo, 10),
          status: row.status,
        }));

        addRecords(parsedData);
        router.push("/");
      },
    });
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Upload de Telemetria</CardTitle>
          <CardDescription>
            Envie os arquivos .csv exportados da EEPROM do Arduino.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <Button
            onClick={handleFileUpload}
            disabled={!file}
            className="w-full flex items-center gap-2"
          >
            <UploadCloud size={20} />
            Processar e Adicionar ao Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
