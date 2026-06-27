/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// "beforeinstallprompt" ist (noch) nicht in den Standard-Lib-Typen.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
}
