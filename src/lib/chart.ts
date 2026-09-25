/**
 * Geometry helpers for the statistics chart. Plain functions with no DOM or
 * Svelte dependency, so the curve maths can be unit-tested on its own.
 */

export interface ChartPoint {
  x: number;
  y: number;
}

/** Round to two decimals — enough precision, shorter path strings. */
function r(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * A monotone cubic (Fritsch–Carlson) path through `points`, sorted by x. The
 * curve never overshoots the data, which a plain Catmull-Rom would — dipping
 * below zero between two small values would be nonsense for a count of
 * characters written.
 */
export function monotoneLinePath(points: readonly ChartPoint[]): string {
  if (points.length === 0) return '';
  const first = points[0];
  if (points.length === 1) return `M ${r(first.x)} ${r(first.y)}`;

  const n = points.length;
  const spans: number[] = [];
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const h = points[i + 1].x - points[i].x;
    spans.push(h);
    slopes.push(h === 0 ? 0 : (points[i + 1].y - points[i].y) / h);
  }

  // Initial tangents: the average of neighbouring slopes (one-sided at ends).
  const tangents = new Array<number>(n);
  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];
  for (let i = 1; i < n - 1; i++) {
    tangents[i] = (slopes[i - 1] + slopes[i]) / 2;
  }

  // Flatten turning points and stop tangents pointing against their segment —
  // both would otherwise let the curve overshoot or wiggle.
  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    }
  }
  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) continue;
    if (tangents[i] / slopes[i] < 0) tangents[i] = 0;
    if (tangents[i + 1] / slopes[i] < 0) tangents[i + 1] = 0;
  }

  // Finally clamp the rest so no curve segment overshoots (Fritsch–Carlson).
  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) continue;
    const a = tangents[i] / slopes[i];
    const b = tangents[i + 1] / slopes[i];
    const sum = a * a + b * b;
    if (sum > 9) {
      const scale = 3 / Math.sqrt(sum);
      tangents[i] = scale * a * slopes[i];
      tangents[i + 1] = scale * b * slopes[i];
    }
  }

  let d = `M ${r(first.x)} ${r(first.y)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = spans[i];
    const c1x = points[i].x + h / 3;
    const c1y = points[i].y + (tangents[i] * h) / 3;
    const c2x = points[i + 1].x - h / 3;
    const c2y = points[i + 1].y - (tangents[i + 1] * h) / 3;
    d += ` C ${r(c1x)} ${r(c1y)}, ${r(c2x)} ${r(c2y)}, ${r(points[i + 1].x)} ${r(points[i + 1].y)}`;
  }
  return d;
}

/** Close a line path down to `baselineY` so it can be filled as an area. */
export function monotoneAreaPath(
  points: readonly ChartPoint[],
  baselineY: number,
): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${r(p.x)} ${r(p.y)} L ${r(p.x)} ${r(baselineY)} Z`;
  }
  const first = points[0];
  const last = points[points.length - 1];
  return `${monotoneLinePath(points)} L ${r(last.x)} ${r(baselineY)} L ${r(first.x)} ${r(baselineY)} Z`;
}

/** Round `value` up to a "nice" axis maximum (1/1.5/2/2.5/3/4/5/10 × 10ⁿ). */
export function niceCeil(value: number): number {
  if (!(value > 0)) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 10]) {
    const candidate = step * magnitude;
    if (value <= candidate) return candidate;
  }
  return 10 * magnitude;
}

const compact = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Compact axis label, e.g. 1_234 → "1.2K"; plain below a thousand. */
export function compactNumber(value: number): string {
  return value < 1000 ? String(value) : compact.format(value);
}
