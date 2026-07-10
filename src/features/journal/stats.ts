/*
  Statistik-Kern für eine belastbare, lokale Analyse. Ziel: echte Muster von
  Zufall trennen (Signifikanz, Mehrfachvergleichs-Korrektur) und mehrere Treiber
  gemeinsam modellieren (Ridge-Regression) statt nur paarweise zu korrelieren.
  Reine Funktionen, keine Abhängigkeiten – perfekt fürs lokale Rechnen.
*/

export const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/** z-Standardisierung (Mittel 0, SD 1). Konstante Spalten -> Nullen. */
export function zscore(xs: number[]): number[] {
  const m = mean(xs);
  const s = std(xs);
  return s === 0 ? xs.map(() => 0) : xs.map((x) => (x - m) / s);
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/** Rangzahlen (Durchschnittsränge bei Gleichstand) – Basis für Spearman. */
function ranks(xs: number[]): number[] {
  const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(xs.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r;
}

/** Spearman-Rangkorrelation (robust gegen Ausreißer & Nicht-Linearität). */
export function spearman(xs: number[], ys: number[]): number | null {
  return pearson(ranks(xs), ranks(ys));
}

/* ---------- Signifikanz (Student-t via regularisierter Beta-Funktion) ---------- */

function betacf(a: number, b: number, x: number): number {
  const FPMIN = 1e-30;
  let qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-10) break;
  }
  return h;
}

function gammaln(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/** Regularisierte unvollständige Beta-Funktion I_x(a,b). */
function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(gammaln(a + b) - gammaln(a) - gammaln(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Welch-t-Test zweier Stichproben (ungleiche Varianz) – Vorher/Während. */
export function welchT(a: number[], b: number[]): { t: number; df: number; p: number } | null {
  if (a.length < 2 || b.length < 2) return null;
  const ma = mean(a);
  const mb = mean(b);
  const va = std(a) ** 2;
  const vb = std(b) ** 2;
  const na = a.length;
  const nb = b.length;
  const se = Math.sqrt(va / na + vb / nb);
  // Beide Gruppen konstant: Unterschied ist perfekt trennscharf (oder keiner).
  if (se === 0) return { t: ma === mb ? 0 : Infinity, df: na + nb - 2, p: ma === mb ? 1 : 0 };
  const t = (ma - mb) / se;
  const df = (va / na + vb / nb) ** 2 / ((va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1));
  return { t, df, p: betai(df / 2, 0.5, df / (df + t * t)) };
}

/** Zweiseitiger p-Wert einer Korrelation r bei n Beobachtungen. */
export function corrPValue(r: number, n: number): number {
  if (n < 3) return 1;
  const df = n - 2;
  if (Math.abs(r) >= 1) return 0;
  const t = r * Math.sqrt(df / (1 - r * r));
  return betai(df / 2, 0.5, df / (df + t * t));
}

/**
 * Benjamini-Hochberg: bei vielen getesteten Zusammenhängen die falsch-positiven
 * begrenzen. Gibt je Eingabe-p den q-Wert (adjustiert) zurück.
 */
export function bhAdjust(pvals: number[]): number[] {
  const n = pvals.length;
  const order = pvals.map((p, i) => [p, i] as const).sort((a, b) => a[0] - b[0]);
  const q = new Array<number>(n);
  let prev = 1;
  for (let k = n - 1; k >= 0; k--) {
    const [p, i] = order[k];
    prev = Math.min(prev, (p * n) / (k + 1));
    q[i] = prev;
  }
  return q;
}

/* ---------- Ridge-Regression (mehrere Treiber gemeinsam) ---------- */

/** Löst A x = b (A symmetrisch, klein) per Gauß-Elimination mit Pivotisierung. */
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-12) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

export interface RegressionResult {
  /** Standardisierte Koeffizienten je Treiber (Wichtigkeit, vorzeichenbehaftet). */
  coefs: number[];
  /** Bestimmtheitsmaß R² (0–1). */
  r2: number;
  n: number;
}

/**
 * Ridge-Regression auf standardisierten Daten. Liefert vergleichbare
 * Treiber-Gewichte (unabhängiger Beitrag, um Störgrößen bereinigt) und die
 * erklärte Varianz. `lambda` stabilisiert bei wenig/kollinearen Daten.
 */
export function ridgeRegression(X: number[][], y: number[], lambda = 1): RegressionResult | null {
  const n = y.length;
  const k = X[0]?.length ?? 0;
  if (n < k + 3 || k === 0) return null;
  // Standardisieren.
  const cols: number[][] = Array.from({ length: k }, (_, j) => X.map((row) => row[j]));
  const zcols = cols.map(zscore);
  const zy = zscore(y);
  const Z = Array.from({ length: n }, (_, i) => zcols.map((c) => c[i]));

  // Normalgleichungen: (ZᵀZ + λI) β = Zᵀy
  const XtX: number[][] = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const Xty = new Array<number>(k).fill(0);
  for (let a = 0; a < k; a++) {
    for (let b = 0; b < k; b++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += Z[i][a] * Z[i][b];
      XtX[a][b] = s + (a === b ? lambda : 0);
    }
    let sy = 0;
    for (let i = 0; i < n; i++) sy += Z[i][a] * zy[i];
    Xty[a] = sy;
  }
  const beta = solve(XtX, Xty);
  if (!beta) return null;

  // R² auf standardisierter Skala.
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    let pred = 0;
    for (let a = 0; a < k; a++) pred += Z[i][a] * beta[a];
    ssRes += (zy[i] - pred) ** 2;
    ssTot += zy[i] ** 2;
  }
  const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);
  return { coefs: beta, r2, n };
}
