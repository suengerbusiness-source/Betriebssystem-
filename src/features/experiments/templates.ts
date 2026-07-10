/*
  Feste Experiment-Vorlagen. Bewusst klar definiert, damit die Wirkung lokal
  sauber messbar ist (Vorher/Während-Vergleich). Vielfältig über Digital,
  Ernährung, Bewegung, Schlaf, Achtsamkeit und Fokus.
*/

export interface ExperimentTemplate {
  id: string;
  title: string;
  category: string;
  durationDays: number;
  hypothesis: string;
  intervention: string;
  /** Beobachtete Kennzahlen (Metrik-/Signal-IDs) für die Auswertung. */
  watchMetrics: string[];
  icon: string;
}

export const EXPERIMENT_CATEGORIES = ["Digital", "Ernährung", "Bewegung", "Schlaf", "Achtsamkeit", "Fokus"] as const;

export const EXPERIMENT_TEMPLATES: ExperimentTemplate[] = [
  { id: "phone-detox-24h", title: "24 Stunden kein Handy", category: "Digital", durationDays: 1, hypothesis: "Mehr Ruhe & Fokus, weniger Zerstreuung.", intervention: "Handy 24 h komplett weglegen/ausschalten (nur echte Notfälle).", watchMetrics: ["focus", "mood", "socialMin", "screenPassive"], icon: "smartphone" },
  { id: "no-social-3d", title: "3 Tage kein Social Media", category: "Digital", durationDays: 3, hypothesis: "Bessere Stimmung & Produktivität.", intervention: "Keine sozialen Netzwerke öffnen (Instagram, TikTok, X …).", watchMetrics: ["mood", "focus", "productivity", "socialMin"], icon: "smartphone" },
  { id: "screen-fast-evening", title: "1 Woche Bildschirm-Fasten ab 21 Uhr", category: "Schlaf", durationDays: 7, hypothesis: "Besserer Schlaf & mehr Fokus.", intervention: "Ab 21 Uhr keine Bildschirme mehr (Handy, TV, Laptop).", watchMetrics: ["sleepQuality", "sleepHours", "focus"], icon: "moon" },
  { id: "no-sweets-24h", title: "24 Stunden keine Süßigkeiten", category: "Ernährung", durationDays: 1, hypothesis: "Stabilere Energie, weniger Tief.", intervention: "24 h komplett auf Süßes & Zuckerhaltiges verzichten.", watchMetrics: ["energy", "mood", "physical"], icon: "candy" },
  { id: "no-sugar-week", title: "1 Woche kein Zucker", category: "Ernährung", durationDays: 7, hypothesis: "Mehr Energie & besseres Körpergefühl.", intervention: "Eine Woche keinen zugesetzten Zucker.", watchMetrics: ["energy", "mood", "physical", "nutrition"], icon: "candy" },
  { id: "water-2l", title: "1 Woche 2 L Wasser pro Tag", category: "Ernährung", durationDays: 7, hypothesis: "Mehr Energie & Konzentration.", intervention: "Jeden Tag mindestens 2 Liter Wasser trinken.", watchMetrics: ["energy", "focus", "physical"], icon: "droplet" },
  { id: "no-caffeine-afternoon", title: "1 Woche kein Koffein nach 14 Uhr", category: "Schlaf", durationDays: 7, hypothesis: "Besserer Schlaf.", intervention: "Nach 14 Uhr kein Kaffee/Energy/Cola.", watchMetrics: ["sleepQuality", "energy", "caffeine"], icon: "coffee" },
  { id: "walk-daily-2w", title: "2 Wochen täglich 1 Stunde spazieren", category: "Bewegung", durationDays: 14, hypothesis: "Mehr Energie, bessere Stimmung & Erholung.", intervention: "Jeden Tag mindestens 1 Stunde an die frische Luft.", watchMetrics: ["energy", "mood", "sleepQuality", "recovery"], icon: "footprints" },
  { id: "steps-10k", title: "5 Tage 10.000 Schritte", category: "Bewegung", durationDays: 5, hypothesis: "Mehr Energie & Stimmung.", intervention: "Jeden Tag mindestens 10.000 Schritte gehen.", watchMetrics: ["energy", "mood", "sport"], icon: "footprints" },
  { id: "cold-shower", title: "1 Woche jeden Morgen kalt duschen", category: "Achtsamkeit", durationDays: 7, hypothesis: "Wacher, klarer, mehr Antrieb.", intervention: "Jeden Morgen mind. 30 s kalt duschen.", watchMetrics: ["energy", "mood", "motivation"], icon: "droplet" },
  { id: "sleep-before-23", title: "1 Woche vor 23 Uhr im Bett", category: "Schlaf", durationDays: 7, hypothesis: "Mehr Schlaf, mehr Energie & Fokus.", intervention: "Jeden Abend vor 23 Uhr im Bett, Licht aus.", watchMetrics: ["sleepHours", "sleepQuality", "energy", "focus"], icon: "moon" },
  { id: "gratitude-week", title: "1 Woche abends 3 Dinge Dankbarkeit", category: "Achtsamkeit", durationDays: 7, hypothesis: "Bessere Stimmung & mehr Sinn.", intervention: "Jeden Abend 3 Dinge aufschreiben, für die du dankbar bist.", watchMetrics: ["mood", "meaning", "recovery"], icon: "heart" },
  { id: "meditation-2w", title: "2 Wochen täglich 10 Min meditieren", category: "Achtsamkeit", durationDays: 14, hypothesis: "Weniger Stress, mehr Fokus & Ruhe.", intervention: "Jeden Tag 10 Minuten still meditieren.", watchMetrics: ["stress", "focus", "recovery", "mood"], icon: "brain" },
  { id: "deep-work-week", title: "1 Woche täglich 90 Min Deep Work", category: "Fokus", durationDays: 7, hypothesis: "Deutlich mehr Produktivität.", intervention: "Jeden Tag 90 Min am Stück ohne Ablenkung arbeiten.", watchMetrics: ["productivity", "focus", "screenProductive"], icon: "target" },
  { id: "no-alcohol-week", title: "1 Woche kein Alkohol", category: "Ernährung", durationDays: 7, hypothesis: "Besserer Schlaf & mehr Energie.", intervention: "Eine Woche komplett auf Alkohol verzichten.", watchMetrics: ["sleepQuality", "energy", "mood"], icon: "wine" },
  { id: "morning-sun", title: "1 Woche 10 Min Morgensonne", category: "Schlaf", durationDays: 7, hypothesis: "Besserer Rhythmus, mehr Energie.", intervention: "Innerhalb 1 h nach dem Aufstehen 10 Min ins Tageslicht.", watchMetrics: ["energy", "mood", "sleepQuality"], icon: "sun" },
];

export const templateById = (id?: string) => EXPERIMENT_TEMPLATES.find((t) => t.id === id);
