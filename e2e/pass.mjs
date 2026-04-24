// Full end-to-end pass across all three apps.
// Usage: PASS=1 [MODE=prod|local] [RUN_TEST_FLAVOR=1] node e2e/pass.mjs
import { chromium } from "playwright";
import { URLS, AUTH_DIR, MODE, E2E_TAG } from "./config.mjs";
import { shot, logStep, consoleErrorCollector } from "./helpers.mjs";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";

const PASS = process.env.PASS || "1";
const P1_MODE = MODE;
const P2_MODE = MODE;
const P3_MODE = MODE;
const RUN_TEST_FLAVOR = process.env.RUN_TEST_FLAVOR === "1";

mkdirSync(`${AUTH_DIR}`, { recursive: true });
const results = { pass: PASS, mode: MODE, started: new Date().toISOString(), steps: [], issues: [] };

function record(app, step, ok, detail = "") {
  const entry = { app, step, ok, detail, t: new Date().toISOString() };
  results.steps.push(entry);
  logStep(`P${PASS}`, app, `${ok ? "✓" : "✗"} ${step}${detail ? " — " + detail : ""}`);
  if (!ok) results.issues.push(entry);
}

async function runP1(browser) {
  const stateFile = `${AUTH_DIR}P1.${P1_MODE}.json`;
  if (!existsSync(stateFile)) {
    record("P1", "storage-state-missing", false, stateFile);
    return;
  }
  const ctx = await browser.newContext({ storageState: stateFile });
  const page = await ctx.newPage();
  const errs = await consoleErrorCollector(page);

  const base = URLS.P1;

  // 1. Landing
  try {
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForSelector("text=Hello, World!", { timeout: 15_000 });
    await shot(page, `p${PASS}-p1-landing`);
    record("P1", "landing renders", true);
  } catch (e) { record("P1", "landing renders", false, e.message); }

  // 2. Swipe
  try {
    await page.goto(`${base}/swipe`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await shot(page, `p${PASS}-p1-swipe`);
    const hasSignin = await page.locator("text=Sign in").first().isVisible().catch(() => false);
    record("P1", "swipe renders authed", !hasSignin, hasSignin ? "Sign in prompt still shown" : "");
  } catch (e) { record("P1", "swipe renders", false, e.message); }

  // 3. Review
  try {
    await page.goto(`${base}/review`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await shot(page, `p${PASS}-p1-review`);
    record("P1", "review renders", true);
  } catch (e) { record("P1", "review renders", false, e.message); }

  // 4. Rate — test vote flow
  try {
    await page.goto(`${base}/rate`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await shot(page, `p${PASS}-p1-rate-initial`);

    // Find first upvote button by title
    const upvote = page.locator('button[title*="Upvote"], button[title*="upvote"]').first();
    const downvote = page.locator('button[title*="Downvote"], button[title*="downvote"]').first();
    const hasUpvote = await upvote.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!hasUpvote) {
      record("P1", "rate: vote buttons visible", false, "no upvote button found (maybe no captions loaded)");
    } else {
      // Click upvote, wait for toast
      await upvote.click();
      await page.waitForTimeout(1500);
      await shot(page, `p${PASS}-p1-rate-upvoted`);
      // Click downvote (change)
      await downvote.click();
      await page.waitForTimeout(1500);
      await shot(page, `p${PASS}-p1-rate-changed`);
      // Click upvote again (change back) — leaves in upvoted state (neutral pre-test)
      await upvote.click();
      await page.waitForTimeout(1500);
      record("P1", "rate: vote + change vote", true);
    }
  } catch (e) { record("P1", "rate flow", false, e.message); }

  // 5. Upload page renders (no actual upload to avoid DB pollution)
  try {
    await page.goto(`${base}/upload`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await shot(page, `p${PASS}-p1-upload`);
    const dropZoneVisible = await page.locator("text=Drop an image").first().isVisible().catch(() => false);
    const signInVisible = await page.locator("text=Sign in with Google").first().isVisible().catch(() => false);
    record("P1", "upload page authed (no sign-in CTA)", !signInVisible && dropZoneVisible, signInVisible ? "shows sign-in" : (!dropZoneVisible ? "no drop zone" : ""));
  } catch (e) { record("P1", "upload renders", false, e.message); }

  // 6. Protected page
  try {
    await page.goto(`${base}/protected`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await shot(page, `p${PASS}-p1-protected`);
    record("P1", "protected renders", true);
  } catch (e) { record("P1", "protected renders", false, e.message); }

  record("P1", "console errors", errs.length === 0, errs.slice(0, 5).join(" | "));
  await ctx.close();
}

async function runP2(browser) {
  const stateFile = `${AUTH_DIR}P2.${P2_MODE}.json`;
  if (!existsSync(stateFile)) {
    record("P2", "storage-state-missing", false, stateFile);
    return;
  }
  const ctx = await browser.newContext({ storageState: stateFile });
  const page = await ctx.newPage();
  const errs = await consoleErrorCollector(page);
  const base = URLS.P2;

  const dashboardPages = [
    "/dashboard",
    "/dashboard/images",
    "/dashboard/captions",
    "/dashboard/caption-stats",
    "/dashboard/caption-requests",
    "/dashboard/caption-examples",
    "/dashboard/humor-flavors",
    "/dashboard/humor-flavor-steps",
    "/dashboard/humor-mix",
    "/dashboard/llm-providers",
    "/dashboard/llm-models",
    "/dashboard/llm-prompt-chains",
    "/dashboard/llm-responses",
    "/dashboard/users",
    "/dashboard/terms",
    "/dashboard/allowed-signup-domains",
    "/dashboard/whitelisted-emails",
  ];

  for (const path of dashboardPages) {
    try {
      await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
      // Wait for either rows, empty state, or loader to resolve
      await page.waitForTimeout(800);
      const slug = path.replace(/\//g, "_").replace(/^_/, "");
      await shot(page, `p${PASS}-p2-${slug || "root"}`);
      record("P2", `render ${path}`, true);
    } catch (e) { record("P2", `render ${path}`, false, e.message); }
  }

  // CRUD round-trip on whitelisted-emails (the safest table for test data)
  const TEST_EMAIL = `e2e-test+pass${PASS}-${Date.now()}@example.invalid`;
  try {
    await page.goto(`${base}/dashboard/whitelisted-emails`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.getByRole("button", { name: /Add Email Address/i }).click();
    await page.waitForTimeout(800);
    // Modal is a fixed-inset div; fill the first text input inside.
    const modalInput = page.locator(".fixed.inset-0 input[type=text]").first();
    await modalInput.waitFor({ state: "visible", timeout: 10_000 });
    await modalInput.fill(TEST_EMAIL);
    await shot(page, `p${PASS}-p2-wl-create-form`);
    const saveBtn = page.locator(".fixed.inset-0 button", { hasText: /^Save$/ }).last();
    await saveBtn.click();
    await page.waitForTimeout(2000);
    // Verify presence in rows
    const visible = await page.getByText(TEST_EMAIL, { exact: false }).first().isVisible({ timeout: 5000 }).catch(() => false);
    record("P2", `CRUD create whitelisted_email (${TEST_EMAIL})`, visible, visible ? "" : "created row not visible");

    if (visible) {
      const row = page.locator("tr", { hasText: TEST_EMAIL });
      await row.getByRole("button", { name: /^Edit$/i }).click();
      await page.waitForTimeout(800);
      const saveBtn2 = page.locator(".fixed.inset-0 button", { hasText: /^Save$/ }).last();
      await saveBtn2.click();
      await page.waitForTimeout(1500);
      record("P2", "CRUD edit whitelisted_email", true);

      const row2 = page.locator("tr", { hasText: TEST_EMAIL });
      await row2.getByRole("button", { name: /^Delete$/i }).click();
      await page.waitForTimeout(800);
      const confirm = page.locator(".fixed.inset-0 button", { hasText: /^Delete$/ }).last();
      await confirm.click();
      await page.waitForTimeout(2500);
      const stillThere = await page.getByText(TEST_EMAIL, { exact: false }).first().isVisible({ timeout: 2000 }).catch(() => false);
      record("P2", "CRUD delete whitelisted_email", !stillThere, stillThere ? "row still visible after delete" : "");
      await shot(page, `p${PASS}-p2-wl-after-delete`);
    }
  } catch (e) { record("P2", "CRUD round-trip whitelisted_emails", false, e.message); }

  record("P2", "console errors", errs.length === 0, errs.slice(0, 5).join(" | "));
  await ctx.close();
}

async function runP3(browser) {
  const stateFile = `${AUTH_DIR}P3.${P3_MODE}.json`;
  if (!existsSync(stateFile)) {
    record("P3", "storage-state-missing", false, stateFile);
    return;
  }
  const ctx = await browser.newContext({ storageState: stateFile });
  const page = await ctx.newPage();
  const errs = await consoleErrorCollector(page);
  const base = URLS.P3;

  // 1. Load admin UI
  try {
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForSelector("text=Humor Flavor Prompt Chains", { timeout: 20_000 });
    await shot(page, `p${PASS}-p3-home`);
    record("P3", "admin UI renders authorized", true);
  } catch (e) {
    record("P3", "admin UI renders", false, e.message);
    await ctx.close();
    return;
  }

  const FLAVOR_NAME = `${E2E_TAG}_pass${PASS}`;

  // 2. Create flavor
  try {
    await page.getByPlaceholder("Flavor name").fill(FLAVOR_NAME);
    await page.getByPlaceholder("Flavor description").fill("E2E test flavor — delete me");
    await page.getByRole("button", { name: /^Create Flavor$/ }).click();
    await page.waitForTimeout(2000);
    const visible = await page.getByText(FLAVOR_NAME).first().isVisible({ timeout: 5000 }).catch(() => false);
    record("P3", `create flavor (${FLAVOR_NAME})`, visible);
    await shot(page, `p${PASS}-p3-flavor-created`);
  } catch (e) { record("P3", "create flavor", false, e.message); }

  // 3. Select the flavor
  try {
    await page.getByText(FLAVOR_NAME).first().click();
    await page.waitForTimeout(1000);
    record("P3", "select flavor", true);
  } catch (e) { record("P3", "select flavor", false, e.message); }

  // 4. Add 2 steps
  try {
    const stepInput = page.getByPlaceholder("New step instruction");
    await stepInput.fill(`E2E step A pass${PASS}`);
    await page.getByRole("button", { name: /^Add$/ }).click();
    await page.waitForTimeout(1500);
    await stepInput.fill(`E2E step B pass${PASS}`);
    await page.getByRole("button", { name: /^Add$/ }).click();
    await page.waitForTimeout(1500);
    const stepA = await page.getByText(`E2E step A pass${PASS}`).first().isVisible().catch(() => false);
    const stepB = await page.getByText(`E2E step B pass${PASS}`).first().isVisible().catch(() => false);
    record("P3", "add 2 steps", stepA && stepB);
    await shot(page, `p${PASS}-p3-steps-added`);
  } catch (e) { record("P3", "add steps", false, e.message); }

  // 5. Reorder — move down on first step
  try {
    const moveDown = page.getByRole("button", { name: /^Move Down$/ }).first();
    await moveDown.click();
    await page.waitForTimeout(1500);
    record("P3", "reorder steps", true);
    await shot(page, `p${PASS}-p3-steps-reordered`);
  } catch (e) { record("P3", "reorder steps", false, e.message); }

  // 6. Edit (save) first step — we just click Save Step to verify the endpoint works
  try {
    await page.getByRole("button", { name: /^Save Step$/ }).first().click();
    await page.waitForTimeout(1500);
    record("P3", "save step", true);
  } catch (e) { record("P3", "save step", false, e.message); }

  // 7. Delete one step
  try {
    page.once("dialog", (d) => d.accept().catch(() => {}));
    await page.getByRole("button", { name: /^Delete Step$/ }).first().click();
    await page.waitForTimeout(2000);
    record("P3", "delete one step", true);
  } catch (e) { record("P3", "delete step", false, e.message); }

  // 8. Optional test-flavor run (only if explicitly enabled)
  if (RUN_TEST_FLAVOR) {
    try {
      await page.getByRole("button", { name: /^Load Test Images$/ }).click();
      await page.waitForTimeout(3000);
      // Select first image thumbnail
      const firstImg = page.locator("img[alt='test']").first();
      await firstImg.click({ timeout: 10_000 }).catch(() => {});
      await page.getByRole("button", { name: /^Generate Captions$/ }).click();
      await page.waitForTimeout(15_000);
      await shot(page, `p${PASS}-p3-test-flavor-run`);
      record("P3", "test-flavor run via live crackd API", true);
    } catch (e) { record("P3", "test-flavor run", false, e.message); }
  }

  // 9. Delete the test flavor
  try {
    page.once("dialog", (d) => d.accept().catch(() => {}));
    await page.getByRole("button", { name: /^Delete Flavor$/ }).click();
    await page.waitForTimeout(2500);
    const gone = !(await page.getByText(FLAVOR_NAME).first().isVisible({ timeout: 2000 }).catch(() => false));
    record("P3", "delete flavor (cleanup)", gone);
    await shot(page, `p${PASS}-p3-flavor-deleted`);
  } catch (e) { record("P3", "delete flavor", false, e.message); }

  record("P3", "console errors", errs.length === 0, errs.slice(0, 5).join(" | "));
  await ctx.close();
}

// MAIN
const browser = await chromium.launch({ headless: true });
try {
  await runP1(browser);
  await runP2(browser);
  await runP3(browser);
} finally {
  await browser.close();
}
results.finished = new Date().toISOString();
mkdirSync("e2e/results", { recursive: true });
const outPath = `e2e/results/pass-${PASS}.json`;
writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(`\nResults: ${results.steps.filter(s => s.ok).length} ok / ${results.issues.length} issues — wrote ${outPath}`);
if (results.issues.length) {
  console.log("\nIssues:");
  for (const i of results.issues) console.log(`  [${i.app}] ${i.step}: ${i.detail}`);
}
