/*
  Hintergrund-Erinnerungen über ntfy.sh (kostenlos, ohne eigenen Server).

  Der Themen-Name („Topic") liegt lokal in localStorage – nur damit die App
  eine Test-Benachrichtigung schicken und den Status anzeigen kann. Die echten
  zeitgesteuerten Erinnerungen verschickt der GitHub-Action-Zeitplan
  (.github/workflows/reminders.yml) an dasselbe Thema; dort wird es als Secret
  NTFY_TOPIC hinterlegt. Empfangen wird über die ntfy-App auf dem Handy.
*/
const TOPIC_KEY = "lifeos.ntfyTopic";

export function getNtfyTopic(): string | undefined {
  if (typeof localStorage === "undefined") return undefined;
  return localStorage.getItem(TOPIC_KEY) || undefined;
}

export function setNtfyTopic(topic: string): void {
  localStorage.setItem(TOPIC_KEY, topic.trim());
}

export function clearNtfyTopic(): void {
  localStorage.removeItem(TOPIC_KEY);
}

/** Erlaubt sind nur unkritische Zeichen (passt zu ntfy-Topics). */
export function isValidTopic(t: string): boolean {
  return /^[A-Za-z0-9_-]{6,64}$/.test(t.trim());
}

/** Einen Vorschlag für einen schwer zu erratenden Themen-Namen erzeugen. */
export function suggestTopic(): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `lifeos-${rnd}`;
}

/** Test-Benachrichtigung direkt aus dem Browser senden. */
export async function sendTestNotification(topic: string): Promise<void> {
  await fetch(`https://ntfy.sh/${encodeURIComponent(topic.trim())}`, {
    method: "POST",
    headers: { Title: "Coach", Tags: "muscle" },
    body: "Coach hier. Test angekommen – ab jetzt halte ich dich auf Kurs. 💪",
  });
}
