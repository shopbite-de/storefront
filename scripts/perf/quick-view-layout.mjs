// Logs the quick view drawer body per animation frame after opening it and
// after switching a variant, collapsed to the distinct layout states, plus
// the /api/product requests (docs/notes/2026-09-13-quick-view-flicker.md).
//
//   BASE_URL=http://localhost:3000 node scripts/perf/quick-view-layout.mjs
//   MOBILE=1 OUT=/tmp node scripts/perf/quick-view-layout.mjs
//
// Expects a listing at CATEGORY_PATH (default /c/Salate/) containing a card
// whose name matches PRODUCT (default "Insalata di Pollo") with variants.
import { chromium } from "@playwright/test";
const base = process.env.BASE_URL ?? "http://localhost:3000";
const mobile = process.env.MOBILE === "1";
const browser = await chromium.launch();
const ctx = await browser.newContext(
  mobile
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
    : { viewport: { width: 1280, height: 800 } },
);
const page = await ctx.newPage();
page.on("request", (r) => {
  if (r.url().includes("/api/product"))
    console.log(
      "  ->",
      Math.round(performance.now() - (globalThis.__t0 ?? 0)),
      "ms",
      r.method(),
      r.url().replace(base, ""),
    );
});
page.on("response", (r) => {
  if (r.url().includes("/api/product"))
    console.log(
      "  <-",
      Math.round(performance.now() - (globalThis.__t0 ?? 0)),
      "ms",
      r.status(),
      r.url().replace(base, ""),
    );
});
await page.goto(`${base}${process.env.CATEGORY_PATH ?? "/c/Salate/"}`, {
  waitUntil: "networkidle",
});

async function record(label, action, ms = 2500) {
  globalThis.__t0 = performance.now();
  await page.evaluate(() => {
    window.__log = [];
    window.__t0 = performance.now();
    const tick = () => {
      const body = document.querySelector('[data-slot="body"]');
      const content = document.querySelector('[data-slot="content"]');
      window.__log.push({
        t: Math.round(performance.now() - window.__t0),
        content: content
          ? Math.round(content.getBoundingClientRect().height)
          : null,
        body: body ? Math.round(body.scrollHeight) : null,
        skeletons: body ? body.querySelectorAll(".animate-pulse").length : 0,
        combos: body ? body.querySelectorAll('[role="combobox"]').length : 0,
        chips: body ? body.querySelectorAll('[role="group"] button').length : 0,
      });
      if (performance.now() - window.__t0 < 6000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await action();
  await page.waitForTimeout(ms);
  const log = await page.evaluate(() => window.__log);
  // Collapse consecutive identical states.
  const steps = [];
  for (const entry of log) {
    const key = JSON.stringify([
      entry.content,
      entry.body,
      entry.skeletons,
      entry.combos,
      entry.chips,
    ]);
    if (!steps.length || steps[steps.length - 1].key !== key)
      steps.push({ key, ...entry });
  }
  console.log(`\n== ${label}: ${steps.length - 1} state changes`);
  for (const s of steps)
    console.log(
      `  t=${String(s.t).padStart(4)}ms content=${s.content} body=${s.body} skeletons=${s.skeletons} selects=${s.combos} chips=${s.chips}`,
    );
}

await record("open quick view", async () => {
  await page
    .getByText(process.env.PRODUCT ?? "Insalata di Pollo", { exact: false })
    .first()
    .click();
});
await page.screenshot({
  path: `${process.env.OUT ?? "."}/open-${mobile ? "mobile" : "desktop"}.png`,
});

await record("switch variant", async () => {
  const combo = page.locator('[data-slot="body"] [role="combobox"]').first();
  const current = (await combo.innerText()).trim();
  await combo.click();
  const listbox = page.getByRole("listbox");
  await listbox.waitFor({ state: "visible" });
  const options = listbox.getByRole("option");
  const texts = await options.allInnerTexts();
  console.log(
    "  options:",
    texts.map((t) => t.trim()).join(" | "),
    "current:",
    current,
  );
  const idx = texts.findIndex((t) => t.trim() !== current);
  await options.nth(idx).click();
  await page.waitForFunction(
    (c) =>
      document
        .querySelector('[data-slot="body"] [role="combobox"]')
        ?.innerText.trim() !== c,
    current,
  );
});
await page.screenshot({
  path: `${process.env.OUT ?? "."}/variant-${mobile ? "mobile" : "desktop"}.png`,
});
await browser.close();
