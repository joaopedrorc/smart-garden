"use server";

import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";

const dataDirectory = path.join(process.cwd(), "data");
const dbPath = path.join(dataDirectory, "db.json");

export interface UploadHistory {
  id: string;
  filename: string;
  date: string;
  recordCount: number;
}

interface DatabaseSchema {
  uploads: UploadHistory[];
  records: any[];
}

async function initDB(): Promise<DatabaseSchema> {
  try {
    await fs.access(dbPath);
    const fileContents = await fs.readFile(dbPath, "utf-8");
    return JSON.parse(fileContents);
  } catch {
    await fs.mkdir(dataDirectory, { recursive: true });
    const initialData: DatabaseSchema = { uploads: [], records: [] };
    await fs.writeFile(dbPath, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

export async function getTelemetryDB() {
  return await initDB();
}

export async function saveUploadData(filename: string, parsedRecords: any[]) {
  const db = await initDB();
  const uploadId = crypto.randomUUID();

  const newUpload: UploadHistory = {
    id: uploadId,
    filename,
    date: new Date().toISOString(),
    recordCount: parsedRecords.length,
  };

  // Atrela o ID do upload a cada linha do CSV para podermos deletar depois
  const recordsWithRelations = parsedRecords.map((record) => ({
    ...record,
    uploadId,
  }));

  db.uploads.push(newUpload);
  db.records.push(...recordsWithRelations);

  await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
  revalidatePath("/");
  revalidatePath("/history");

  return { success: true };
}

// Nova função para deletar um upload específico
export async function deleteUpload(uploadId: string) {
  const db = await initDB();

  db.uploads = db.uploads.filter((u) => u.id !== uploadId);
  db.records = db.records.filter((r) => r.uploadId !== uploadId);

  await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
  revalidatePath("/");
  revalidatePath("/history");

  return { success: true };
}

// Nova função para limpar todo o banco de dados
export async function clearAllHistory() {
  const db = await initDB();

  db.uploads = [];
  db.records = [];

  await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
  revalidatePath("/");
  revalidatePath("/history");

  return { success: true };
}
