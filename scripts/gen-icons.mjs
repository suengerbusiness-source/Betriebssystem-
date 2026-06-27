// Rendert die App-Icons (PNG) aus scripts/icon-source.svg mittels Chromium.
import { chromium } from "playwright-core";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const exe = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const svg = readFileSync(resolve(__dirname, "icon-source.svg"), "utf8");

mkdirSync(resolve(root, "public/icons"), { recursive: true });

const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });

async function render(size, file, pad = 0) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const inner = size - pad * 2;
  await page.setContent(
    `<html><body style="margin:0;background:transparent">
       <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center">
         <div style="width:${inner}px;height:${inner}px">${svg.replace('width="512" height="512"', `width="${inner}" height="${inner}"`)}</div>
       </div></body></html>`,
    { waitUntil: "networkidle" },
  );
  await page.screenshot({ path: resolve(root, "public/icons", file), omitBackground: true });
  await page.close();
  console.log("wrote", file);
}

await render(192, "icon-192.png");
await render(512, "icon-512.png");
// Maskable: etwas Innenabstand, damit beim Beschneiden nichts wegfällt.
await render(512, "maskable-512.png", 64);
await render(180, "apple-touch-icon.png");

await browser.close();
