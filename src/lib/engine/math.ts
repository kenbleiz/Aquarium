export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = clamp((sorted.length - 1) * p, 0, sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return lerp(sorted[lo], sorted[hi], idx - lo);
}

export function movingAverage(values: number[], window: number): number[] {
  if (window <= 1) return [...values];
  const out = new Array<number>(values.length);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    const n = Math.min(i + 1, window);
    out[i] = sum / n;
  }
  return out;
}

export function normalizeMinMax(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  if (span < 1e-9) return values.map(() => 0);
  return values.map((v) => (v - min) / span);
}

export function slope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const den = n * sumXX - sumX * sumX;
  if (Math.abs(den) < 1e-9) return 0;
  return (n * sumXY - sumX * sumY) / den;
}

export function localMaxima(
  values: number[],
  options: { minDistance: number; threshold: number },
): number[] {
  const peaks: number[] = [];
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] < options.threshold) continue;
    if (values[i] >= values[i - 1] && values[i] >= values[i + 1]) {
      const last = peaks[peaks.length - 1];
      if (last === undefined || i - last >= options.minDistance) {
        peaks.push(i);
      } else if (values[i] > values[last]) {
        peaks[peaks.length - 1] = i;
      }
    }
  }
  return peaks;
}

export function overlapRatio(
  a0: number,
  a1: number,
  b0: number,
  b1: number,
): number {
  const inter = Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
  const union = Math.max(a1, b1) - Math.min(a0, b0);
  return union <= 0 ? 0 : inter / union;
}

export function formatTimecode(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}
