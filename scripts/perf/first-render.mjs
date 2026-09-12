// First UpdateLayoutTree + first Layout duration of a page through the h2
// proxy (mobile viewport, CPU throttle RATE, default 4), median of N runs.
//   node scripts/perf/first-render.mjs / /c/Pizza/
//   BLOCK='\.woff2$' node scripts/perf/first-render.mjs /    # abort matching requests
import { chromium } from 'playwright';
const paths = process.argv.slice(2); const N = Number(process.env.N || 3);
const browser = await chromium.launch({ args: ['--ignore-certificate-errors'] });
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
for (const p of paths) {
  const rs = [], ls = [], rt = [], lt = []; let rendered = 0;
  for (let i = 0; i < N; i++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, ignoreHTTPSErrors: true });
    if (process.env.BLOCK) await ctx.route(new RegExp(process.env.BLOCK), (r) => r.abort());
    const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.RATE || 4) });
    await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' });
    const ev = []; cdp.on('Tracing.dataCollected', (e) => ev.push(...e.value));
    await page.goto('https://localhost:3443' + p, { waitUntil: 'load' }); await page.waitForTimeout(1500);
    rendered = await page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => e.getClientRects().length).length);
    await cdp.send('Tracing.end'); await new Promise((r) => cdp.on('Tracing.tracingComplete', r));
    const x = ev.filter((e) => e.ph === 'X' && (e.name === 'UpdateLayoutTree' || e.name === 'Layout')).sort((a, b) => a.ts - b.ts);
    const big = (n) => x.filter((e) => e.name === n && e.dur > 2000);
    const r = big('UpdateLayoutTree'), l = big('Layout');
    rs.push(r.length ? r[0].dur / 1000 : 0); ls.push(l.length ? l[0].dur / 1000 : 0);
    rt.push(x.filter((e) => e.name === 'UpdateLayoutTree').reduce((s, e) => s + e.dur, 0) / 1000); lt.push(x.filter((e) => e.name === 'Layout').reduce((s, e) => s + e.dur, 0) / 1000);
    await ctx.close();
  }
  console.log(`${p.padEnd(18)} first recalc ${med(rs).toFixed(1).padStart(6)} ms  first layout ${med(ls).toFixed(1).padStart(6)} ms  | total recalc ${med(rt).toFixed(0).padStart(4)} ms  total layout ${med(lt).toFixed(0).padStart(4)} ms  (median of ${N}) rendered=${rendered}`);
}
await browser.close();
