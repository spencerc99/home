// Load test for the Play Together live room: one stage and many phones, all
// real browsers, in a throwaway room (?event=loadtest-<time>), so nothing
// lands in the talk's own room. Walks the stage through every live moment
// while every phone joins in at once, then drops some phones off the network
// and checks they come back.
//
//   node scripts/loadTestTalk.mjs [--phones 50] [--base https://spencer.place] [--out <folder>]
//
// Prints a report and writes stage screenshots into --out.
// Uses the Playwright installed in ~/Projects/playhtml.
const { chromium } = await import(`${process.env.HOME}/Projects/playhtml/node_modules/playwright/index.mjs`);
import { mkdirSync } from "node:fs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const PHONES = Number(arg("phones", 50));
// Stop after this many phases (1 = only the join spike).
const PHASES = Number(arg("phases", 99));
const BASE = arg("base", "https://spencer.place");
const OUT = arg("out", `/tmp/talk-loadtest-${Date.now()}`);
const EVENT = `loadtest-${Date.now().toString(36)}`;
// Slide numbers of the live moments, as in src/components/talk/perpetualPlayDeck.ts.
const SLIDE = { join: 2, circle: 6, seat: 12, fridgeDoor: 15 };
const COLORS = ["hsl(33, 100%, 56%)", "hsl(205, 85%, 52%)", "hsl(330, 75%, 62%)", "hsl(150, 55%, 42%)", "hsl(265, 60%, 62%)"];
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s]`, ...a);
const report = [];
const note = (phase, result) => {
  report.push({ phase, ...result });
  log(phase, JSON.stringify(result));
};

/** Waits until fn() is truthy; returns the ms it took, or null on timeout. */
async function until(fn, timeout = 20000, every = 100) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await fn().catch(() => false)) return Date.now() - start;
    await sleep(every);
  }
  return null;
}

// Network and error counters for one page.
function watch(page, who) {
  const stats = { who, wsOpened: 0, wsClosed: 0, framesIn: 0, bytesIn: 0, framesOut: 0, bytesOut: 0, errors: [] };
  page.on("websocket", (ws) => {
    stats.wsOpened++;
    ws.on("framereceived", (f) => {
      stats.framesIn++;
      stats.bytesIn += typeof f.payload === "string" ? f.payload.length : f.payload.byteLength;
    });
    ws.on("framesent", (f) => {
      stats.framesOut++;
      stats.bytesOut += typeof f.payload === "string" ? f.payload.length : f.payload.byteLength;
    });
    ws.on("close", () => stats.wsClosed++);
  });
  const at = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;
  page.on("pageerror", (e) => stats.errors.push(`${at()} pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") stats.errors.push(`${at()} ${m.type()}: ${m.text().slice(0, 400)}`);
  });
  return stats;
}

// ---- the stage ----
const stageBrowser = await chromium.launch();
const stageContext = await stageBrowser.newContext({ viewport: { width: 1920, height: 1080 } });
// Counts painted frames, so a struggling stage shows up as a low frame rate.
await stageContext.addInitScript(() => {
  window.__frames = 0;
  const tick = () => {
    window.__frames++;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const stage = await stageContext.newPage();
const stageStats = watch(stage, "stage");
await stage.goto(`${BASE}/talk/stage/?event=${EVENT}`);
await stage.waitForSelector(".talk-stage__live", { state: "attached" });
await stage.keyboard.press("l");
if (!(await stage.$(".talk-live__here"))) await stage.keyboard.press("j");
log(`stage up, room ${EVENT}`);

const goto = async (slide) => {
  await stage.keyboard.type(String(slide));
  await stage.keyboard.press("Enter");
};
const fps = async (ms = 3000) => {
  const a = await stage.evaluate(() => window.__frames);
  await sleep(ms);
  const b = await stage.evaluate(() => window.__frames);
  return Math.round(((b - a) * 1000) / ms);
};
const shot = (name) => stage.screenshot({ path: `${OUT}/${name}.png` });

// ---- the phones: spread over a few browsers, like separate devices ----
const phoneBrowsers = await Promise.all([0, 1, 2].map(() => chromium.launch()));
const phones = [];
for (let i = 0; i < PHONES; i++) {
  const context = await phoneBrowsers[i % 3].newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  // Every phone has already picked a colour, so it goes straight into the room.
  await context.addInitScript((color) => localStorage.setItem("talk:color", color), COLORS[i % COLORS.length]);
  const page = await context.newPage();
  const phone = { i, context, page, stats: watch(page, `phone ${i}`), cut: false, links: [] };
  // A fifth of the phones go through a switch that can cut their connections,
  // like wifi dropping (Chrome's offline mode leaves open sockets alone).
  if (i < Math.max(1, Math.round(PHONES / 5))) {
    await page.routeWebSocket(/.*/, (ws) => {
      if (phone.cut) return ws.close({ code: 1006, reason: "wifi down" });
      const server = ws.connectToServer();
      phone.links.push({ ws, server });
      ws.onMessage((m) => server.send(m));
      server.onMessage((m) => ws.send(m));
    });
  }
  phones.push(phone);
}
const allPhones = [...phones];

const inRoom = (p) =>
  p.page.evaluate(() => !!document.querySelector("main.phone[data-connected]"));
const stageCount = async () => {
  const text = await stage.textContent(".talk-live__here").catch(() => null);
  return text ? Number(text.match(/(\d+) here/)?.[1] ?? NaN) : NaN;
};

// 1. Everyone scans the QR at the same moment.
{
  const start = Date.now();
  const joined = await Promise.all(
    phones.map(async (p) => {
      await p.page.goto(`${BASE}/talk/?event=${EVENT}`, { waitUntil: "commit", timeout: 60000 });
      const ms = await until(() => inRoom(p), 60000);
      p.joined = ms !== null;
      p.pageLoadMs = await p.page.evaluate(() => Math.round(performance.getEntriesByType("navigation")[0]?.domContentLoadedEventEnd ?? -1));
      return ms === null ? null : Date.now() - start;
    }),
  );
  const loads = phones.map((p) => p.pageLoadMs).sort((a, b) => a - b);
  const ok = joined.filter((ms) => ms !== null).sort((a, b) => a - b);
  const seen = await until(async () => (await stageCount()) >= PHONES, 30000);
  note("1 join spike", {
    phonesInRoom: `${ok.length}/${PHONES}`,
    joinMsMedian: ok[Math.floor(ok.length / 2)],
    joinMsSlowest: ok.at(-1),
    pageLoadMsMedian: loads[Math.floor(loads.length / 2)],
    pageLoadMsSlowest: loads.at(-1),
    stageCountsEveryone: seen === null ? `no, shows ${await stageCount()}` : `yes, ${seen}ms after the last phone`,
  });
  await shot("1-lobby");
  // Phones that never got in: what they show, and what went wrong on them.
  const stuck = phones.filter((p) => !p.joined);
  for (const p of stuck.slice(0, 5)) {
    const screen = (await p.page.innerText("main").catch(() => "?")).replace(/\s+/g, " ").slice(0, 80);
    console.log(`  stuck phone ${p.i}: shows "${screen}"`);
    for (const e of p.stats.errors.filter((e) => !e.includes("wake lock")).slice(0, 6)) console.log(`    ${e}`);
  }
  // The rest of the test goes on with the phones that got in.
  phones.splice(0, phones.length, ...phones.filter((p) => p.joined));
  phones.forEach((p, k) => (p.k = k));
}
if (PHASES < 2) await finish();

// Moves a finger around the phone's pad for `ms`.
async function scribble(page, selector, ms, { loop = false, i = 0 } = {}) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no ${selector} on phone ${i}`);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const r = Math.min(box.width, box.height) * (0.2 + (i % 5) * 0.04);
  await page.mouse.move(cx + r, cy);
  await page.mouse.down();
  const steps = Math.round(ms / 40);
  for (let s = 1; s <= steps; s++) {
    const a = (s / steps) * Math.PI * 2 * (loop ? 1 : 3) + i;
    await page.mouse.move(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    await sleep(40);
  }
  await page.mouse.up();
}

const sumIn = () => phones.reduce((n, p) => n + p.stats.bytesIn, 0);

// 2. The lobby: everyone touches at once.
{
  const before = sumIn();
  const started = Date.now();
  let maxGlows = 0;
  const watching = (async () => {
    while (Date.now() - started < 5000) {
      maxGlows = Math.max(maxGlows, (await stage.$$(".talk-live__glow")).length);
      await sleep(200);
    }
  })();
  const rate = fps(4000);
  await Promise.all(phones.map((p) => scribble(p.page, ".phone__pad", 4000, { i: p.i })));
  await watching;
  note("2 lobby touches", {
    stageMostGlowsAtOnce: maxGlows,
    stageFps: await rate,
    kbPerPhonePerSec: Math.round((sumIn() - before) / phones.length / 1024 / ((Date.now() - started) / 1000)),
  });
}

// 3. Slide 2, joining: everyone touches at once.
{
  await goto(SLIDE.join);
  await stage.keyboard.press("ArrowRight");
  const switched = await Promise.all(phones.map((p) => until(() => p.page.locator(".phone__pad").isVisible(), 15000)));
  let maxGlows = 0;
  const started = Date.now();
  const watching = (async () => {
    while (Date.now() - started < 5000) {
      maxGlows = Math.max(maxGlows, (await stage.$$(".talk-live__glow")).length);
      await sleep(200);
    }
  })();
  const rate = fps(4000);
  await Promise.all(phones.map((p) => (switched[p.k] === null ? null : scribble(p.page, ".phone__pad", 4000, { i: p.i }))));
  await watching;
  await shot("3-join");
  note("3 joining on slide 2", {
    phonesSwitched: `${switched.filter((ms) => ms !== null).length}/${phones.length}`,
    slowestSwitchMs: Math.max(...switched.filter((ms) => ms !== null)),
    stageCount: await stageCount(),
    stageMostGlowsAtOnce: maxGlows,
    stageFps: await rate,
  });
}

// 4. The circle slide: everyone draws two loops at the same time.
{
  await goto(SLIDE.circle);
  const switched = await Promise.all(phones.map((p) => until(() => p.page.locator(".phone__draw").isVisible(), 15000)));
  const before = sumIn();
  const started = Date.now();
  const rate = fps(6000);
  await Promise.all(
    phones.map(async (p) => {
      if (switched[p.k] === null) return;
      await scribble(p.page, ".phone__draw", 2500, { loop: true, i: p.i });
      await scribble(p.page, ".phone__draw", 2500, { loop: true, i: p.i + 2 });
    }),
  );
  const drawnMs = Date.now() - started;
  const counts = await Promise.all(
    phones.map((p) => p.page.textContent(".phone__meta").then((t) => Number(t?.match(/(\d+)/)?.[1] ?? 0))),
  );
  const expected = counts.reduce((a, b) => a + b, 0);
  const converged = await until(async () => (await stage.$$(".talk-live__loops path")).length >= expected, 30000);
  // Every phone should end up holding every loop too.
  const phoneLoops = await Promise.all(phones.map((p) => p.page.evaluate(() => document.querySelectorAll("path").length)));
  await shot("4-title");
  note("4 drawing", {
    phonesSwitched: `${switched.filter((ms) => ms !== null).length}/${phones.length}`,
    loopsSaved: expected,
    stageShows: (await stage.$$(".talk-live__loops path")).length,
    stageCaughtUp: converged === null ? "no" : `${converged}ms after the last stroke`,
    stageFps: await rate,
    kbPerPhonePerSec: Math.round((sumIn() - before) / phones.length / 1024 / ((Date.now() - started) / 1000)),
    drawnForMs: drawnMs,
    phonePathsMin: Math.min(...phoneLoops),
  });
}

// 5. Take a seat: everyone drags their cursor around.
{
  await goto(SLIDE.seat);
  for (let b = 0; b < 4; b++) await stage.keyboard.press("ArrowRight");
  const switched = await Promise.all(phones.map((p) => until(() => p.page.locator(".phone__trackpad").isVisible(), 15000)));
  const rate = fps(4000);
  let maxCursors = 0;
  const started = Date.now();
  const watching = (async () => {
    while (Date.now() - started < 5000) {
      maxCursors = Math.max(maxCursors, (await stage.$$(".talk-live__cursor")).length);
      await sleep(200);
    }
  })();
  await Promise.all(phones.map((p) => (switched[p.k] === null ? null : scribble(p.page, ".phone__trackpad", 4000, { i: p.i }))));
  await watching;
  await shot("5-seats");
  note("5 seats", {
    phonesSwitched: `${switched.filter((ms) => ms !== null).length}/${phones.length}`,
    stageMostCursors: maxCursors,
    stageFps: await rate,
  });
}

// 6. The fridge door: everyone drags a word.
{
  await goto(SLIDE.fridgeDoor);
  await stage.keyboard.press("ArrowRight");
  const switched = await Promise.all(phones.map((p) => until(() => p.page.locator(".talk-fridge__word").first().isVisible(), 15000)));
  const rate = fps(4000);
  await Promise.all(
    phones.map(async (p) => {
      if (switched[p.k] === null) return;
      const word = p.page.locator(".talk-fridge__word").nth(p.i % 24);
      const box = await word.boundingBox();
      await p.page.mouse.move(box.x + 4, box.y + 4);
      await p.page.mouse.down();
      for (let s = 0; s < 20; s++) {
        await p.page.mouse.move(box.x + 4 + s * 3, box.y + 4 + s * 4);
        await sleep(40);
      }
      await p.page.mouse.up();
    }),
  );
  const moved = await until(
    async () =>
      (await stage.$$eval(".talk-live__fridge .talk-fridge__word", (ws) =>
        ws.filter((w) => w.style.getPropertyValue("--mover") !== "transparent").length,
      )) >= Math.min(24, phones.length),
    15000,
  );
  await shot("6-fridge");
  note("6 fridge", {
    phonesSwitched: `${switched.filter((ms) => ms !== null).length}/${phones.length}`,
    stageShowsAllMovedWords: moved === null ? "no" : `yes, ${moved}ms after`,
    stageFps: await rate,
  });
}

// 7. A fifth of the phones lose wifi for 15s, then come back.
{
  await goto(SLIDE.join - 1);
  await sleep(1000);
  if (!(await stage.$(".talk-live__here"))) await stage.keyboard.press("j");
  const dropped = phones.filter((p) => p.links.length);
  for (const p of dropped) {
    p.cut = true;
    for (const { ws, server } of p.links.splice(0)) {
      ws.close({ code: 1006, reason: "wifi down" });
      server.close();
    }
  }
  const leaving = await until(async () => (await stageCount()) <= phones.length - dropped.length, 30000, 250);
  await sleep(5000);
  const whileDown = (await dropped[0].page.innerText("main")).replace(/\s+/g, " ").slice(0, 120);
  await sleep(10000);
  for (const p of dropped) p.cut = false;
  const back = await until(async () => (await stageCount()) >= phones.length, 60000, 250);
  const stillWorking = await Promise.all(dropped.map((p) => inRoom(p)));
  // Back phones can draw again: switch to the circle slide and have one draw.
  await goto(SLIDE.circle);
  const drawn = await until(() => dropped[0].page.locator(".phone__draw").isVisible(), 15000);
  let loopArrived = null;
  if (drawn !== null) {
    const before = (await stage.$$(".talk-live__loops path")).length;
    await scribble(dropped[0].page, ".phone__draw", 2000, { loop: true, i: 1 });
    loopArrived = await until(async () => (await stage.$$(".talk-live__loops path")).length > before, 15000);
  }
  note("7 wifi drop", {
    dropped: dropped.length,
    stageNoticedLeavingMs: leaving,
    phoneSaysWhileDown: whileDown,
    cameBackMs: back,
    stageCountAfterReturn: await stageCount(),
    droppedPhonesStillInRoom: `${stillWorking.filter(Boolean).length}/${dropped.length}`,
    droppedPhoneLoopReachedStage: loopArrived === null ? "no" : `yes, ${loopArrived}ms`,
  });
}

// 8. A phone whose connection to the room never opens at all.
{
  const context = await phoneBrowsers[0].newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => localStorage.setItem("talk:color", "hsl(33, 100%, 56%)"));
  const page = await context.newPage();
  await page.routeWebSocket(/.*/, (ws) => ws.close());
  await page.goto(`${BASE}/talk/?event=${EVENT}`);
  await sleep(15000);
  note("8 no connection", { phoneShows: (await page.innerText("main")).replace(/\s+/g, " ").slice(0, 160) });
  await page.screenshot({ path: `${OUT}/8-phone-no-connection.png` });
  await context.close();
}

await finish();

async function finish() {
  const all = [stageStats, ...allPhones.map((p) => p.stats)];
  const errors = all.flatMap((s) => s.errors.map((e) => `${s.who}: ${e}`));
  note("totals", {
    stageMbIn: +(stageStats.bytesIn / 1e6).toFixed(1),
    phoneMbInMax: +(Math.max(...allPhones.map((p) => p.stats.bytesIn)) / 1e6).toFixed(1),
    socketsOpened: all.reduce((n, s) => n + s.wsOpened, 0),
    socketsClosed: all.reduce((n, s) => n + s.wsClosed, 0),
    errorCount: errors.length,
  });
  for (const e of errors.slice(0, 60)) console.log("  error:", e);
  console.log(`\nscreenshots in ${OUT}`);
  await Promise.all([stageBrowser, ...phoneBrowsers].map((b) => b.close()));
  process.exit(0);
}
