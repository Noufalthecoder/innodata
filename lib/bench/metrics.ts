// Pure scoring maths for the benchmark report. No I/O, so every number can be unit-tested.

export type Scored = { correct: boolean; choice: number | null };

/** Wilson score interval for a proportion (95% by default). Honest with small n, unlike the normal approximation. */
export function wilson(correct: number, n: number, z = 1.96): { low: number; high: number } {
  if (n === 0) return { low: 0, high: 0 };
  const p = correct / n;
  const d = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / d;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return { low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

/** Accuracy rescaled so random guessing = 0 and perfect = 1 (can go negative when worse than chance). */
export function chanceAdjusted(accuracy: number, chance: number): number {
  return chance >= 1 ? 0 : (accuracy - chance) / (1 - chance);
}

/** Exact two-sided McNemar test on paired right/wrong outcomes. b = only A correct, c = only B correct. */
export function mcnemarExact(b: number, c: number): number {
  const n = b + c;
  if (n === 0) return 1;
  const k = Math.min(b, c);
  // P(X <= k) for X ~ Binomial(n, 0.5), doubled; computed in log space to stay exact for large n
  let logC = 0;
  let tail = 0;
  for (let i = 0; i <= k; i++) {
    if (i > 0) logC += Math.log(n - i + 1) - Math.log(i);
    tail += Math.exp(logC - n * Math.LN2);
  }
  return Math.min(1, 2 * tail);
}

/** How often each option letter was picked, to expose position bias (e.g. a model that always says "A"). */
export function choiceDistribution(rows: Scored[], maxOptions: number): number[] {
  const counts = Array<number>(maxOptions).fill(0);
  for (const r of rows) if (r.choice !== null && r.choice < maxOptions) counts[r.choice]++;
  const total = counts.reduce((a, b) => a + b, 0);
  return counts.map((c) => (total ? c / total : 0));
}

export type Cell = { n: number; correct: number; accuracy: number; ci: { low: number; high: number } };

export function cell(rows: Scored[]): Cell {
  const correct = rows.filter((r) => r.correct).length;
  return { n: rows.length, correct, accuracy: rows.length ? correct / rows.length : 0, ci: wilson(correct, rows.length) };
}

/** Best model(s) for one category. Models whose 95% interval overlaps the leader's are reported as statistically tied. */
export function pickBest(entries: { model: string; cell: Cell }[]): { leader: string[]; tied: string[]; accuracy: number } {
  const top = Math.max(...entries.map((e) => e.cell.accuracy));
  const leaders = entries.filter((e) => e.cell.accuracy === top);
  const lowestLeaderLow = Math.min(...leaders.map((e) => e.cell.ci.low));
  const tied = entries.filter((e) => e.cell.accuracy < top && e.cell.ci.high >= lowestLeaderLow).map((e) => e.model);
  return { leader: leaders.map((e) => e.model), tied, accuracy: top };
}
