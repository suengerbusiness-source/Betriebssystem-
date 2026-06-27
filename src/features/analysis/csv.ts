/*
  Leichtgewichtiger CSV-Parser für Kontoauszüge.
  Unterstützt typische deutsche Bank-Exporte: Trennzeichen ; , oder Tab,
  Felder in Anführungszeichen, Komma als Dezimaltrennzeichen, Datum dd.mm.yyyy.
  Läuft komplett lokal – es werden keine Daten hochgeladen.
*/

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  delimiter: string;
}

/** Erkennt das wahrscheinlichste Trennzeichen anhand der ersten Zeilen. */
function detectDelimiter(sample: string): string {
  const candidates = [";", "\t", ","];
  const firstLine = sample.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  let best = ";";
  let bestCount = -1;
  for (const d of candidates) {
    const count = firstLine.split(d).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

/** Eine CSV-Zeile in Felder zerlegen (mit Quote-Handling). */
function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      out.push(field);
      field = "";
    } else {
      field += c;
    }
  }
  out.push(field);
  return out.map((f) => f.trim());
}

export function parseCsv(text: string, hasHeader = true): ParsedCsv {
  const delimiter = detectDelimiter(text);
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [], delimiter };
  const all = lines.map((l) => splitLine(l, delimiter));
  // Header = Zeile mit den meisten Spalten (überspringt evtl. Vorspann).
  let headerIdx = 0;
  let maxCols = 0;
  all.forEach((r, i) => {
    if (r.length > maxCols) {
      maxCols = r.length;
      headerIdx = i;
    }
  });
  if (!hasHeader) {
    const headers = Array.from({ length: maxCols }, (_, i) => `Spalte ${i + 1}`);
    return { headers, rows: all.filter((r) => r.length === maxCols), delimiter };
  }
  const headers = all[headerIdx];
  const rows = all.slice(headerIdx + 1).filter((r) => r.length === headers.length);
  return { headers, rows, delimiter };
}

/** Findet den Spaltenindex anhand von Stichwörtern in der Überschrift. */
export function guessColumn(headers: string[], keywords: string[]): number {
  const lower = headers.map((h) => h.toLowerCase());
  for (const kw of keywords) {
    const idx = lower.findIndex((h) => h.includes(kw));
    if (idx >= 0) return idx;
  }
  return -1;
}

/** Deutschen/internationalen Betrag in eine (vorzeichenbehaftete) Zahl wandeln. */
export function parseAmount(raw: string): number | null {
  if (!raw) return null;
  let s = raw.replace(/[^\d,.\-+]/g, "").trim();
  if (!s || s === "-" || s === "+") return null;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // Das zuletzt auftretende Zeichen ist das Dezimaltrennzeichen.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Datum in verschiedenen Formaten -> yyyy-MM-dd (oder null). */
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})$/); // dd.mm.yyyy
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? "20" + y : y;
    return `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); // yyyy-mm-dd
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}
