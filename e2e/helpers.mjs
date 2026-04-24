import { mkdirSync } from "node:fs";
import { SCREEN_DIR } from "./config.mjs";

mkdirSync(SCREEN_DIR, { recursive: true });

export async function shot(page, name) {
  const path = `${SCREEN_DIR}${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

export function logStep(pass, app, msg) {
  const t = new Date().toISOString().split("T")[1].split(".")[0];
  console.log(`[${t}] [${pass}] [${app}] ${msg}`);
}

export async function consoleErrorCollector(page) {
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}
