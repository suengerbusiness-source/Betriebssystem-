import { useMemo, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, FileUp, Upload } from "lucide-react";
import { transactions } from "@/data/repo";
import { MODES, type TxMode } from "@/data/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { guessColumn, parseAmount, parseCsv, parseDate, type ParsedCsv } from "./csv";

interface Mapping {
  date: number;
  amount: number;
  desc: number;
}

/*
  Import-Assistent für Kontoauszüge (CSV).
  1) Datei hochladen oder Text einfügen
  2) Spalten zuordnen (Datum/Betrag/Beschreibung) + Modus & Kategorie wählen
  3) Vorschau prüfen und importieren -> Buchungen (zum Einhaken im Abschluss).
*/
export function ImportModal({
  open,
  onClose,
  accountId,
  defaultMode,
}: {
  open: boolean;
  onClose: () => void;
  accountId: string;
  defaultMode: TxMode;
}) {
  const [step, setStep] = useState<"input" | "map">("input");
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Mapping>({ date: -1, amount: -1, desc: -1 });
  const [mode, setMode] = useState<TxMode>(defaultMode);
  const [category, setCategory] = useState("Unkategorisiert");
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("input");
    setRaw("");
    setParsed(null);
    setResult(null);
  }
  function handleClose() {
    reset();
    onClose();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRaw(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function analyze() {
    const p = parseCsv(raw, true);
    if (p.headers.length === 0 || p.rows.length === 0) return;
    setParsed(p);
    setMapping({
      date: guessColumn(p.headers, ["buchungstag", "datum", "valuta", "wertstellung", "date"]),
      amount: guessColumn(p.headers, ["betrag", "umsatz", "amount", "wert"]),
      desc: guessColumn(p.headers, [
        "verwendungszweck",
        "buchungstext",
        "beschreibung",
        "empfänger",
        "beguenstigter",
        "auftraggeber",
        "name",
        "zweck",
      ]),
    });
    setStep("map");
  }

  // Vorschau / Validierung der zugeordneten Zeilen.
  const preview = useMemo(() => {
    if (!parsed || mapping.date < 0 || mapping.amount < 0) return [];
    return parsed.rows.map((r) => {
      const date = parseDate(r[mapping.date] ?? "");
      const amt = parseAmount(r[mapping.amount] ?? "");
      const desc = mapping.desc >= 0 ? r[mapping.desc] ?? "" : "";
      const valid = !!date && amt !== null && amt !== 0;
      return { date, amt, desc, valid };
    });
  }, [parsed, mapping]);

  const validCount = preview.filter((p) => p.valid).length;

  async function doImport() {
    let imported = 0;
    let skipped = 0;
    for (const row of preview) {
      if (!row.valid || !row.date || row.amt === null) {
        skipped++;
        continue;
      }
      await transactions.create({
        accountId,
        type: row.amt < 0 ? "expense" : "income",
        mode,
        amount: Math.abs(row.amt),
        currency: "EUR",
        category: category.trim() || "Unkategorisiert",
        note: row.desc ? row.desc.slice(0, 140) : undefined,
        date: row.date,
        reviewed: false,
      });
      imported++;
    }
    setResult({ imported, skipped });
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Kontoauszug importieren"
      description="CSV-Datei hochladen oder einfügen. Alles bleibt lokal auf deinem Gerät."
      className="max-w-2xl"
    >
      {result ? (
        <div className="py-6 text-center">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-success" />
          <p className="text-lg font-semibold">{result.imported} Buchungen importiert</p>
          {result.skipped > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">{result.skipped} Zeilen übersprungen (kein gültiges Datum/Betrag).</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">Du kannst sie jetzt im Monatsabschluss einhaken und beschriften.</p>
          <Button className="mt-5" onClick={handleClose}>
            Fertig
          </Button>
        </div>
      ) : step === "input" ? (
        <div className="space-y-4">
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" onChange={onFile} className="hidden" />
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full">
            <Upload size={18} /> CSV-Datei auswählen
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> oder einfügen <span className="h-px flex-1 bg-border" />
          </div>
          <Textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={"Datum;Betrag;Verwendungszweck\n01.06.2026;-49,90;Supermarkt\n02.06.2026;1500,00;Gehalt"}
            className="min-h-[160px] font-mono text-xs"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handleClose}>
              Abbrechen
            </Button>
            <Button onClick={analyze} disabled={!raw.trim()}>
              <FileUp size={16} /> Analysieren
            </Button>
          </div>
        </div>
      ) : (
        parsed && (
          <div className="space-y-4">
            {/* Spaltenzuordnung */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ColumnSelect label="Datum" headers={parsed.headers} value={mapping.date} onChange={(v) => setMapping((m) => ({ ...m, date: v }))} />
              <ColumnSelect label="Betrag" headers={parsed.headers} value={mapping.amount} onChange={(v) => setMapping((m) => ({ ...m, amount: v }))} />
              <ColumnSelect label="Beschreibung" headers={parsed.headers} value={mapping.desc} onChange={(v) => setMapping((m) => ({ ...m, desc: v }))} optional />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Modus</Label>
                <div className="inline-flex w-full rounded-md bg-secondary p-1">
                  {MODES.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMode(m.value)}
                      className={cn("flex-1 rounded px-2.5 py-1.5 text-sm font-medium transition-colors", mode === m.value ? "bg-card shadow-sm" : "text-muted-foreground")}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="imp-cat">Kategorie (Startwert)</Label>
                <Input id="imp-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="h-9" />
              </div>
            </div>

            {/* Vorschau */}
            <div>
              <p className="mb-2 text-sm text-muted-foreground">
                Vorschau · {validCount} von {preview.length} Zeilen importierbar
              </p>
              <div className="max-h-56 overflow-y-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    {preview.slice(0, 50).map((row, i) => (
                      <tr key={i} className={cn(!row.valid && "opacity-40")}>
                        <td className="px-2 py-1.5 text-xs text-muted-foreground">{row.date ?? "—"}</td>
                        <td className="max-w-[18rem] truncate px-2 py-1.5">{row.desc || "—"}</td>
                        <td className="px-2 py-1.5 text-right">
                          {row.amt !== null ? (
                            <span className={cn("inline-flex items-center gap-1 font-medium tabular-nums", row.amt < 0 ? "text-foreground" : "text-success")}>
                              {row.amt < 0 ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                              {formatCurrency(Math.abs(row.amt))}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep("input")}>
                Zurück
              </Button>
              <Button onClick={doImport} disabled={validCount === 0}>
                {validCount} Buchungen importieren
              </Button>
            </div>
          </div>
        )
      )}
    </Modal>
  );
}

function ColumnSelect({
  label,
  headers,
  value,
  onChange,
  optional,
}: {
  label: string;
  headers: string[];
  value: number;
  onChange: (v: number) => void;
  optional?: boolean;
}) {
  return (
    <div>
      <Label>{label}{optional && <span className="text-muted-foreground"> (optional)</span>}</Label>
      <Select value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-9">
        <option value={-1}>— keine —</option>
        {headers.map((h, i) => (
          <option key={i} value={i}>
            {h || `Spalte ${i + 1}`}
          </option>
        ))}
      </Select>
    </div>
  );
}
