import {
  Facebook,
  Globe,
  Hash,
  Instagram,
  Link2,
  Mail,
  Music2,
  ShoppingBag,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import type { PlatformKind } from "@/data/types";

/*
  Zentrale Registry der Plattform-Arten: Label, Icon und Markenfarbe. Eine neue
  Plattform ergänzen = ein Eintrag hier (und der Typ in types.ts).
*/
export const PLATFORMS: Record<PlatformKind, { label: string; icon: LucideIcon; color: string }> = {
  tiktok: { label: "TikTok", icon: Music2, color: "#111827" },
  youtube: { label: "YouTube", icon: Youtube, color: "#FF0000" },
  instagram: { label: "Instagram", icon: Instagram, color: "#E1306C" },
  facebook: { label: "Facebook", icon: Facebook, color: "#1877F2" },
  shop: { label: "Shop", icon: ShoppingBag, color: "#22c55e" },
  affiliate: { label: "Affiliate", icon: Link2, color: "#f59e0b" },
  website: { label: "Website", icon: Globe, color: "#64748b" },
  newsletter: { label: "Newsletter", icon: Mail, color: "#14b8a6" },
  other: { label: "Sonstiges", icon: Hash, color: "#7c6cff" },
};

export const PLATFORM_LIST = (Object.keys(PLATFORMS) as PlatformKind[]).map((value) => ({
  value,
  ...PLATFORMS[value],
}));

export function platformOf(kind: PlatformKind) {
  return PLATFORMS[kind] ?? PLATFORMS.other;
}
