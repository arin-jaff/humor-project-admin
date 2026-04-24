// Interactive OAuth login. Run once per target (P1 or P3) per MODE.
// Usage: MODE=local node e2e/login.mjs P1
//        MODE=prod  node e2e/login.mjs P3
import { chromium } from "playwright";
import { URLS, AUTH_DIR, MODE } from "./config.mjs";
import { mkdirSync } from "node:fs";

const target = (process.argv[2] || "P1").toUpperCase();
if (!["P1", "P2", "P3"].includes(target)) {
  console.error("target must be P1, P2, or P3");
  process.exit(1);
}
mkdirSync(AUTH_DIR, { recursive: true });

const baseURL = URLS[target];
const statePath = `${AUTH_DIR}${target}.${MODE}.json`;

console.log(`\n[login] Opening ${baseURL} headful for ${target} (${MODE}).`);
console.log("[login] Please complete Google OAuth in the opened window.");
console.log("[login] Window will close automatically after you are signed in.\n");

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(baseURL);

// Poll for a real supabase session cookie (exclude the PKCE code-verifier
// which is set BEFORE OAuth completes).
const deadline = Date.now() + 5 * 60_000;
let signedIn = false;
while (Date.now() < deadline) {
  const cookies = await ctx.cookies();
  const session = cookies.find((c) => /sb-.*-auth-token(\.\d+)?$/.test(c.name));
  if (session) {
    signedIn = true;
    console.log(`[login] Session cookie captured: ${session.name}`);
    break;
  }
  await page.waitForTimeout(1000);
}

if (!signedIn) {
  console.error("[login] Timed out waiting for auth cookie. Closing.");
  await browser.close();
  process.exit(2);
}

// Let the app settle so any follow-up cookies land
await page.waitForTimeout(2000);
await ctx.storageState({ path: statePath });
console.log(`[login] Saved storage state → ${statePath}`);
await browser.close();
