import { describe, expect, it } from 'vitest';
import {
  compactNumber,
  monotoneAreaPath,
  monotoneLinePath,
  niceCeil,
  type ChartPoint,
} from '../src/lib/chart';

/** Every y coordinate of an SVG path (pairs are always x, y in our output). */
function yValues(d: string): number[] {
  const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const ys: number[] = [];
  for (let i = 0; i < numbers.length; i += 2) ys.push(numbers[i + 1]);
  return ys;
}

function curve(points: ChartPoint[]): string {
  return monotoneLinePath(points);
}

describe('monotoneLinePath', () => {
  it('returns an empty path for no points', () => {
    expect(curve([])).toBe('');
  });

  it('draws a single move for one point', () => {
    expect(curve([{ x: 5, y: 9 }])).toBe('M 5 9');
  });

  it('joins two points with one cubic segment', () => {
    const d = curve([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ]);
    expect(d.startsWith('M 0 0')).toBe(true);
    expect(d.split('C')).toHaveLength(2);
    expect(d.endsWith('10 10')).toBe(true);
  });

  it('draws one cubic segment per pair of points', () => {
    const d = curve([
      { x: 0, y: 1 },
      { x: 10, y: 4 },
      { x: 20, y: 2 },
      { x: 30, y: 8 },
    ]);
    expect(d.split('C')).toHaveLength(4);
  });

  it('never overshoots the data range', () => {
    const spike: ChartPoint[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
      { x: 30, y: 0 },
      { x: 40, y: 0 },
    ];
    for (const y of yValues(curve(spike))) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(10);
    }
  });

  it('stays within range for uneven slopes too', () => {
    const points: ChartPoint[] = [
      { x: 0, y: 3 },
      { x: 8, y: 3 },
      { x: 16, y: 100 },
      { x: 24, y: 90 },
      { x: 32, y: 91 },
      { x: 40, y: 20 },
    ];
    for (const y of yValues(curve(points))) {
      expect(y).toBeGreaterThanOrEqual(3);
      expect(y).toBeLessThanOrEqual(100);
    }
  });

  it('produces finite coordinates for a flat series', () => {
    const d = curve([
      { x: 0, y: 5 },
      { x: 10, y: 5 },
      { x: 20, y: 5 },
    ]);
    expect(d).not.toContain('NaN');
    expect(yValues(d).every((y) => y === 5)).toBe(true);
  });
});

describe('monotoneAreaPath', () => {
  it('closes the line down to the baseline', () => {
    const d = monotoneAreaPath(
      [
        { x: 0, y: 10 },
        { x: 10, y: 20 },
      ],
      30,
    );
    expect(d.endsWith('L 0 30 Z')).toBe(true);
    expect(d).toContain('L 10 30');
  });

  it('returns an empty path for no points', () => {
    expect(monotoneAreaPath([], 10)).toBe('');
  });
});

describe('niceCeil', () => {
  it('rounds up to a nice axis maximum', () => {
    expect(niceCeil(0)).toBe(0);
    expect(niceCeil(1)).toBe(1);
    expect(niceCeil(999)).toBe(1000);
    expect(niceCeil(1234)).toBe(1500);
    expect(niceCeil(2500)).toBe(2500);
    expect(niceCeil(2501)).toBe(3000);
    expect(niceCeil(0.4)).toBeCloseTo(0.4);
  });
});

describe('compactNumber', () => {
  it('leaves small values untouched', () => {
    expect(compactNumber(0)).toBe('0');
    expect(compactNumber(999)).toBe('999');
  });

  it('shortens thousands', () => {
    const label = compactNumber(12_345);
    expect(label.length).toBeLessThan(7);
    expect(label).not.toBe('12345');
  });
});
