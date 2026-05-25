'use client'

import React, { useState } from 'react'
import Papa from 'papaparse'
import { UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { saveUploadData } from '@/app/actions/telemetry'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleFileUpload = () => {
    if (!file) return
    setIsLoading(true)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedData = results.data.map((row: any) => ({
          data: row.data,
          hora: row.hora,
          temperatura: parseFloat(row.temperatura),
          umidade_ar: parseFloat(row.umidade_ar),
          sensor_solo: parseInt(row.sensor_solo, 10),
          status: row.status,
        }))

        // Envia para o servidor salvar no db.json
        await saveUploadData(file.name, parsedData)
        setIsLoading(false)
        router.push('/history')
      },
    })
  }

  return (
    <div className="p-8 max-w-2xl mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle>Upload de Telemetria</CardTitle>
          <CardDescription>
            Envie os arquivos .csv exportados da EEPROM do Arduino para armazená-los no sistema.
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
            disabled={!file || isLoading} 
            className="w-full flex items-center gap-2"
          >
            <UploadCloud size={20} />
            {isLoading ? 'Processando e Salvando...' : 'Processar e Salvar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}