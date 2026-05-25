// lib/math.ts
export const calculateAverage = (arr: number[]) => {
  if (arr.length === 0) return 0;
  return arr.reduce((acc, curr) => acc + curr, 0) / arr.length;
};

export const calculateMedian = (arr: number[]) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};
