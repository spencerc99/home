// Records the slide 14 demo: playhtml.fun in a desktop window and a phone at
// once, with scripted clicks on the lamp, plant, logo, hydrant and counters.
// Writes JPEG frames plus <name>.txt concat lists into the folder given.
// The clicks are real, so they show up for everyone on playhtml.fun.
//
//   node scripts/recordPlayhtmlDemo.mjs <folder>
//   cd <folder> && ffmpeg -f concat -safe 0 -i desk.txt -f concat -safe 0 -i phone.txt \
//     -filter_complex "color=c=#161616:s=1920x1188:r=30[bg];[0]fps=30,scale=1280:1100,setsar=1[d];[1]fps=30,scale=508:1100,setsar=1[p];[bg][d]overlay=44:44:shortest=1[a];[a][p]overlay=1368:44:shortest=1,format=yuv420p" \
//     -c:v libx264 -crf 20 -preset slow -movflags +faststart -an playhtml-home-interactions.mp4
//
// Uses the Playwright installed in ~/Projects/playhtml.
const { chromium } = await import(`${process.env.HOME}/Projects/playhtml/node_modules/playwright/index.mjs`);
import { mkdirSync, writeFileSync } from "node:fs";
const out = process.argv[2];
const browser = await chromium.launch();

// A visible pointer for the desktop window, and a tap ring for the phone.
const desktopPointer = () => {
  addEventListener("DOMContentLoaded", () => {
    const c = document.createElement("div");
    c.innerHTML = `<svg width="26" height="26" viewBox="0 0 32 32"><path d="M4 2 L4 26 L10 20 L14 29 L18 27 L14 18 L22 18 Z" fill="#111" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>`;
    Object.assign(c.style, { position: "fixed", left: "-50px", top: "-50px", zIndex: 2147483647, pointerEvents: "none", transform: "translate(-4px,-2px)" });
    document.documentElement.appendChild(c);
    addEventListener("mousemove", (e) => { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; }, true);
    addEventListener("mousedown", () => { c.style.scale = "0.85"; }, true);
    addEventListener("mouseup", () => { c.style.scale = "1"; }, true);
  });
};
const phoneTaps = () => {
  addEventListener("DOMContentLoaded", () => {
    addEventListener("pointerdown", (e) => {
      const d = document.createElement("div");
      Object.assign(d.style, { position: "fixed", left: e.clientX - 22 + "px", top: e.clientY - 22 + "px", width: "44px", height: "44px", borderRadius: "50%", background: "rgba(40,40,40,.28)", border: "2px solid rgba(255,255,255,.9)", zIndex: 2147483647, pointerEvents: "none", transition: "opacity .5s, transform .5s" });
      document.documentElement.appendChild(d);
      setTimeout(() => { d.style.opacity = "0"; d.style.transform = "scale(1.4)"; }, 250);
      setTimeout(() => d.remove(), 800);
    }, true);
  });
};

async function open(name, opts, init) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(init);
  const page = await ctx.newPage();
  await page.goto("https://playhtml.fun/", { waitUntil: "networkidle" });
  const dir = `${out}/${name}`;
  mkdirSync(dir, { recursive: true });
  const frames = [];
  const cdp = await ctx.newCDPSession(page);
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    const file = `${dir}/${String(frames.length).padStart(5, "0")}.jpg`;
    writeFileSync(file, Buffer.from(data, "base64"));
    frames.push({ file, t: metadata.timestamp });
    await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  return { page, cdp, frames, dir };
}

const desk = await open("desk", { viewport: { width: 1024, height: 880 } }, desktopPointer);
const phone = await open("phone", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, phoneTaps);
await desk.page.waitForTimeout(2500);

const center = async (page, sel) => {
  const b = await page.locator(sel).first().boundingBox();
  if (!b) throw new Error(`${sel} is not on the page`);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
let at = { x: 520, y: 700 };
await desk.page.mouse.move(at.x, at.y);
const glide = async (sel, dx = 0, dy = 0) => {
  const c = await center(desk.page, sel);
  const to = { x: c.x + dx, y: c.y + dy };
  await desk.page.mouse.move(to.x, to.y, { steps: 40 });
  at = to;
};
const click = async (times = 1, gap = 450) => {
  for (let i = 0; i < times; i++) {
    await desk.page.mouse.down();
    await desk.page.waitForTimeout(70);
    await desk.page.mouse.up();
    if (i < times - 1) await desk.page.waitForTimeout(gap);
  }
};
const tap = async (sel, times = 1) => {
  for (let i = 0; i < times; i++) {
    const c = await center(phone.page, sel);
    await phone.page.touchscreen.tap(c.x, c.y);
    await phone.page.waitForTimeout(500);
  }
};
// Swipe the phone's sideways row of toys so `sel` is in view.
const swipeTo = (sel) =>
  phone.page.evaluate((sel) => {
    const el = document.querySelector(sel);
    let row = el.parentElement;
    while (row && !(row.scrollWidth > row.clientWidth + 4 && getComputedStyle(row).overflowX !== "visible")) row = row.parentElement;
    if (!row) throw new Error("no sideways row around " + sel);
    const r = el.getBoundingClientRect(), rr = row.getBoundingClientRect();
    row.scrollBy({ left: r.left + r.width / 2 - (rr.left + rr.width / 2), behavior: "smooth" });
  }, sel);

for (const s of [desk, phone]) await s.cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, everyNthFrame: 1 });
const wait = (ms) => desk.page.waitForTimeout(ms);
await wait(1500);

await glide("#lamp-hanging", 0, 30); await wait(250); await click(); await wait(1400);
await glide("#plant", 0, 60); await wait(200); await click(3, 500); await wait(1000);
await glide("#stamp"); await wait(200); await click(2, 700); await wait(1200);
await tap("#stamp"); await wait(1200);
await swipeTo(".fire-hydrant"); await wait(1100);
await tap(".fire-hydrant"); await wait(3200);
await glide("#orb-1"); await click(2, 350); await glide("#orb-2"); await click(2, 350); await glide("#orb-3"); await click(2, 350);
await wait(600);
await swipeTo("#orb-2"); await wait(1000);
await tap("#orb-2", 2); await tap("#orb-3"); await wait(900);
await glide("#viewCount", 0, 90); await wait(600);
await phone.page.evaluate(() => scrollTo({ top: 0, behavior: "smooth" }));
await tap("#lamp-hanging"); await wait(1800);

for (const s of [desk, phone]) await s.cdp.send("Page.stopScreencast");
await wait(300);
for (const s of [desk, phone]) {
  const list = s.frames.map((f, i) => `file '${f.file}'\nduration ${((s.frames[i + 1]?.t ?? f.t + 0.05) - f.t).toFixed(4)}`).join("\n");
  writeFileSync(`${s.dir}.txt`, list + `\nfile '${s.frames.at(-1).file}'\n`);
  console.log(s.dir, s.frames.length, "frames from", s.frames[0].t.toFixed(3), "to", s.frames.at(-1).t.toFixed(3));
}
await browser.close();
