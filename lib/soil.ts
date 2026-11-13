// Calibração do sensor de umidade do solo resistivo (sonda em garfo + módulo HW-103/LM393)
// instalado na horta de Uberlândia (MG).
//
// A leitura é o valor bruto do ADC de 12 bits do ESP32 (0 a 4095): quanto MENOR, mais úmido.
// O banco guarda sempre o valor bruto; a classificação é feita aqui, então uma calibração
// melhor recalcula todo o histórico sem regravar o firmware.
//
// Pontos de referência medidos em 12 e 13/11/2026:
//   sensor no ar ............................ 4095
//   sonda num copo d'água .................... 1588
//   solo saturado, logo após a instalação .... ~1290
//   capacidade de campo (estabilizou após a drenagem noturna) ... ~1380
// O lado seco ainda não foi medido na terra da horta: as faixas acima de "Muito úmido"
// são PROVISÓRIAS até o ensaio gravimétrico com terra seca.

export const SOIL_REFERENCE = {
  airRaw: 4095,
  waterRaw: 1588,
  saturatedRaw: 1290,
  fieldCapacityRaw: 1380,
  provisional: true,
} as const;

export interface SoilBand {
  key: string;
  label: string;
  // Limite superior (exclusivo) da leitura bruta para esta faixa
  maxRaw: number;
  advice: string;
  textClass: string;
  fill: string;
}

export const SOIL_BANDS: SoilBand[] = [
  {
    key: "encharcado",
    label: "Encharcado",
    maxRaw: 1335, // ponto médio entre saturado e capacidade de campo
    advice: "Água em excesso, risco para as raízes. Não regar.",
    textClass: "text-blue-700",
    fill: "#1d4ed8",
  },
  {
    key: "muito-umido",
    label: "Muito úmido",
    maxRaw: 1600,
    advice: "Perto da capacidade de campo. Bom para plantar ou transplantar. Não regar.",
    textClass: "text-sky-600",
    fill: "#0ea5e9",
  },
  {
    key: "umido",
    label: "Úmido",
    maxRaw: 2100,
    advice: "Umidade adequada para as hortaliças.",
    textClass: "text-green-600",
    fill: "#16a34a",
  },
  {
    key: "pouco-seco",
    label: "Pouco seco",
    maxRaw: 2700,
    advice: "Atenção: regar em breve, se não houver chuva prevista.",
    textClass: "text-amber-600",
    fill: "#d97706",
  },
  {
    key: "seco",
    label: "Seco",
    maxRaw: 3900,
    advice: "Hora de regar.",
    textClass: "text-red-600",
    fill: "#dc2626",
  },
  {
    key: "sem-contato",
    label: "Sem contato com o solo",
    maxRaw: SOIL_REFERENCE.airRaw + 1,
    advice: "Leitura igual à do sensor no ar. Confira se a sonda está enterrada.",
    textClass: "text-muted-foreground",
    fill: "#737373",
  },
];

export function classifySoil(raw: number | null): SoilBand | null {
  if (raw === null) return null;
  return SOIL_BANDS.find((band) => raw < band.maxRaw) ?? SOIL_BANDS[SOIL_BANDS.length - 1];
}

// Índice de umidade: 0% = sensor no ar, 100% = solo saturado da horta.
// É uma escala relativa ao sensor, não a umidade volumétrica do solo.
export function soilIndex(raw: number | null): number | null {
  if (raw === null) return null;
  const { airRaw, saturatedRaw } = SOIL_REFERENCE;
  const pct = (100 * (airRaw - raw)) / (airRaw - saturatedRaw);
  return Math.min(100, Math.max(0, pct));
}

// Faixa de leitura bruta [mínimo, máximo) de cada classe, para exibir na legenda
export function bandRange(index: number): [number, number] {
  const min = index === 0 ? 0 : SOIL_BANDS[index - 1].maxRaw;
  return [min, Math.min(SOIL_BANDS[index].maxRaw, SOIL_REFERENCE.airRaw + 1)];
}
