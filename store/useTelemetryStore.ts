// store/useTelemetryStore.ts
import { create } from "zustand";

export interface TelemetryData {
  id: string;
  data: string;
  hora: string;
  temperatura: number;
  umidade_ar: number;
  sensor_solo: number;
  status: string;
}

interface TelemetryStore {
  records: TelemetryData[];
  addRecords: (newRecords: Omit<TelemetryData, "id">[]) => void;
  clearRecords: () => void;
}

export const useTelemetryStore = create<TelemetryStore>((set) => ({
  records: [],
  addRecords: (newRecords) =>
    set((state) => {
      const formattedRecords = newRecords.map((rec) => ({
        ...rec,
        id: crypto.randomUUID(), // Gera um ID único para cada entrada (útil para keys no React)
      }));
      return { records: [...state.records, ...formattedRecords] };
    }),
  clearRecords: () => set({ records: [] }),
}));
