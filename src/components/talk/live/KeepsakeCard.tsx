import { useEffect, useRef, useState } from "react";
import { answers as answersChannel, circleLoops, type Answers, type Loops } from "./talkRoom";
import { parseAnswers, parseLoops } from "./roomData";

// Each phone's keepsake at the end of the talk: the room's loops with yours
// bold, the room's patina, and the wishes, yours and the slide's first. Drawn
// on a canvas so the picture on screen is the file that gets saved. The design
// is card H on the design canvas ("Keepsake card · H").

const CARD_W = 360;
const CARD_H = 640;
/** Drawn at 3x, so the saved image is 1080x1920. */
const SCALE = 3;
const PAPER = "/talk/perpetual-play/img/paper.webp";
const INK = "rgb(30, 28, 26)";
const MUTED = "rgb(97, 110, 129)";
const LINK = "#007fd9";
const PRESENTER_COLOR = "#ffae00";
const SLIDE_WISHES = ["fun", "caring", "creative"];
/** The most wish lines that fit in the words box; others drop out first. */
const MAX_LINES = 8;
/** The most of the room's loops drawn behind yours. */
const MAX_OTHER_LOOPS = 800;
/** How often the card redraws while the room keeps changing. */
const REDRAW_MS = 1500;

type Word = { text: string; color: string; strong: boolean };

function hashOf(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`[talk] could not load ${src}`));
    image.src = src;
  });
}

/** Lays the wish phrases out in lines, word by word, inside `width`. */
function layoutWords(ctx: CanvasRenderingContext2D, phrases: Word[], width: number) {
  const space = ctx.measureText(" ").width;
  const dot = ctx.measureText("·").width;
  const placed: { text: string; x: number; line: number; color: string; strong: boolean; underline: boolean }[] = [];
  let x = 0;
  let line = 0;
  const put = (text: string, color: string, strong: boolean, underline: boolean) => {
    const w = ctx.measureText(text).width;
    if (x > 0 && x + w > width) {
      line++;
      x = 0;
    }
    placed.push({ text, x, line, color, strong, underline });
    x += w + space;
  };
  phrases.forEach((phrase, i) => {
    for (const word of phrase.text.split(/\s+/).filter(Boolean)) put(word, phrase.color, phrase.strong, true);
    if (i < phrases.length - 1) {
      if (x + dot > width) {
        line++;
        x = 0;
      }
      placed.push({ text: "·", x, line, color: MUTED, strong: false, underline: false });
      x += dot + space;
    }
  });
  return { placed, lines: line + 1 };
}

function draw(
  canvas: HTMLCanvasElement,
  { loops, answers, color, pid, hidden, paper }: { loops: Loops; answers: Answers; color: string; pid: string; hidden: ReadonlySet<string>; paper: HTMLImageElement | null },
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("[talk] no 2d canvas for the keepsake card");
  canvas.width = CARD_W * SCALE;
  canvas.height = CARD_H * SCALE;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

  // Paper.
  ctx.fillStyle = "rgb(255, 252, 235)";
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  if (paper) {
    ctx.globalCompositeOperation = "multiply";
    const k = Math.max(CARD_W / paper.width, CARD_H / paper.height);
    ctx.drawImage(paper, (CARD_W - paper.width * k) / 2, (CARD_H - paper.height * k) / 2, paper.width * k, paper.height * k);
    ctx.globalCompositeOperation = "source-over";
  }

  // The words: the slide's, then yours, then a shuffled handful of the room's.
  const mine = (key: string) => key.startsWith(`${pid}:`);
  const seen = new Set<string>();
  const wishes = Object.entries(answers)
    .filter(([key, a]) => a.kind === "wish" && !hidden.has(key))
    .sort(([a], [b]) => (mine(b) ? 1 : 0) - (mine(a) ? 1 : 0) || hashOf(a) - hashOf(b))
    .filter(([, a]) => {
      const text = a.text.toLowerCase();
      if (seen.has(text)) return false;
      seen.add(text);
      return true;
    });
  const ownWords = wishes.filter(([key]) => mine(key));
  const others = wishes.filter(([key]) => !mine(key));
  ctx.font = '16px "Vulf Sans", sans-serif';
  const boxX = 24;
  const boxW = CARD_W - 48;
  const textW = boxW - 32;
  let take = others.length;
  let layout = layoutWords(ctx, [], textW);
  let phrases: Word[] = [];
  for (;;) {
    phrases = [
      ...SLIDE_WISHES.map((text) => ({ text, color: PRESENTER_COLOR, strong: true })),
      ...ownWords.map(([, a]) => ({ text: a.text, color, strong: true })),
      ...others.slice(0, take).map(([, a]) => ({ text: a.text, color: a.color, strong: false })),
    ];
    layout = layoutWords(ctx, phrases, textW);
    if (layout.lines <= MAX_LINES || take === 0) break;
    take--;
  }
  const more = others.length - take;
  const lineH = 23;
  const boxH = 14 + 13 + 8 + layout.lines * lineH + (more > 0 ? 18 : 0) + 12;
  const boxBottom = 561;
  const boxTop = boxBottom - boxH;

  // Loops, framed in the space between the heading and the words.
  const areaTop = 84;
  const areaBottom = boxTop - 12;
  const all = Object.entries(loops);
  const toSlide = (points: number[], i: number): [number, number] => [((1 - points[i + 1]) / 2) * 1920, ((1 + points[i]) / 2) * 1080];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [, loop] of all) {
    for (let i = 0; i + 1 < loop.points.length; i += 2) {
      const [x, y] = toSlide(loop.points, i);
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  const areaW = CARD_W - 48;
  const areaH = Math.max(60, areaBottom - areaTop);
  const k = all.length ? Math.min(areaW / Math.max(1, x1 - x0), areaH / Math.max(1, y1 - y0)) : 1;
  const ox = 24 + (areaW - (x1 - x0) * k) / 2;
  const oy = areaTop + (areaH - (y1 - y0) * k) / 2;
  const place = (points: number[], i: number): [number, number] => {
    const [x, y] = toSlide(points, i);
    return [ox + (x - x0) * k, oy + (y - y0) * k];
  };
  // Patina: a soft mark where each person first drew; yours strongest.
  const firstByPerson = new Map<string, Loops[string]>();
  for (const [key, loop] of all) {
    const person = key.split(":")[0];
    if (!firstByPerson.has(person)) firstByPerson.set(person, loop);
  }
  for (const [person, loop] of firstByPerson) {
    const [x, y] = place(loop.points, 0);
    const own = person === pid;
    const r = own ? 60 : 44;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, own ? color : loop.color);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalAlpha = own ? 0.5 : 0.2;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
  const stroke = (loop: Loops[string], width: number, alpha: number, strokeColor: string) => {
    ctx.beginPath();
    for (let i = 0; i + 1 < loop.points.length; i += 2) {
      const [x, y] = place(loop.points, i);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };
  for (const [, loop] of all.filter(([key]) => !mine(key)).slice(-MAX_OTHER_LOOPS)) stroke(loop, 1.1, 0.3, loop.color);
  for (const [, loop] of all.filter(([key]) => mine(key))) stroke(loop, 3.6, 1, color);
  ctx.globalAlpha = 1;

  // Heading.
  ctx.fillStyle = INK;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = 'bold 26px "Vulf Sans", sans-serif';
  ctx.fillText("Play Together", 24, 48);
  ctx.font = '11px "Sono", monospace';
  ctx.fillStyle = MUTED;
  ctx.textAlign = "right";
  ctx.fillText("Melbourne", CARD_W - 24, 36);
  ctx.fillText("NOV 2026", CARD_W - 24, 50);
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = '13px "Vulf Sans", sans-serif';
  ctx.fillText("A talk by Spencer Chang", 24, 70);

  // Words box.
  ctx.fillStyle = "rgba(251, 250, 246, 0.9)";
  ctx.beginPath();
  ctx.roundRect(boxX, boxTop, boxW, boxH, 10);
  ctx.fill();
  ctx.fillStyle = MUTED;
  ctx.font = '11px "Sono", monospace';
  ctx.fillText("We wish technology was...", boxX + 16, boxTop + 14 + 10);
  ctx.font = '16px "Vulf Sans", sans-serif';
  const firstBaseline = boxTop + 14 + 13 + 8 + 16;
  for (const word of layout.placed) {
    const x = boxX + 16 + word.x;
    const y = firstBaseline + word.line * lineH;
    const w = ctx.measureText(word.text).width;
    if (word.underline) {
      ctx.globalAlpha = word.strong ? 0.85 : 0.5;
      ctx.fillStyle = word.color;
      ctx.fillRect(x, y + 2, w, 3);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = word.underline ? INK : MUTED;
    ctx.fillText(word.text, x, y);
  }
  if (more > 0) {
    ctx.fillStyle = MUTED;
    ctx.font = '12px "Sono", monospace';
    ctx.fillText(`+${more} more`, boxX + 16, firstBaseline + layout.lines * lineH);
  }

  // You, and the link.
  const people = firstByPerson.size;
  const otherPeople = Math.max(0, people - 1);
  const youLine = `you + ${otherPeople} ${otherPeople === 1 ? "other" : "others"} · ${all.length} ${all.length === 1 ? "loop" : "loops"}`;
  ctx.font = '12px "Sono", monospace';
  const lineW = ctx.measureText(youLine).width + 22;
  const lx = (CARD_W - lineW) / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(lx + 7, 584, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.fillText(youLine, lx + 22, 588);
  ctx.textAlign = "center";
  ctx.fillStyle = LINK;
  ctx.font = '13px "Vulf Sans", sans-serif';
  ctx.fillText("spencer.place", CARD_W / 2, 616);
  ctx.textAlign = "left";
}

export function KeepsakeCard({ color, pid, hidden }: { color: string; pid: string; hidden: ReadonlySet<string> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [drawn, setDrawn] = useState(false);
  const [saving, setSaving] = useState<"idle" | "saved" | { failed: string }>("idle");

  useEffect(() => {
    let alive = true;
    let paper: HTMLImageElement | null = null;
    let lastLoops: Loops = {};
    let timer: ReturnType<typeof setTimeout> | null = null;
    const render = () => {
      timer = null;
      if (!alive || !canvas.current) return;
      lastLoops = parseLoops(circleLoops().getData(), lastLoops);
      draw(canvas.current, { loops: lastLoops, answers: parseAnswers(answersChannel().getData()), color, pid, hidden, paper });
      setDrawn(true);
    };
    const soon = () => {
      timer ??= setTimeout(render, REDRAW_MS);
    };
    (async () => {
      // The card is drawn in the talk's fonts; wait for them so the saved file has them.
      await Promise.all([
        document.fonts.load('bold 26px "Vulf Sans"'),
        document.fonts.load('16px "Vulf Sans"'),
        document.fonts.load('11px "Sono"'),
      ]).catch((error: unknown) => console.warn("[talk] card fonts did not load; drawing with fallbacks", error));
      paper = await loadImage(PAPER).catch((error: unknown) => {
        console.warn("[talk] card paper did not load; drawing on plain colour", error);
        return null;
      });
      if (alive) render();
    })();
    const offLoops = circleLoops().onUpdate(soon);
    const offAnswers = answersChannel().onUpdate(soon);
    return () => {
      alive = false;
      offLoops();
      offAnswers();
      if (timer) clearTimeout(timer);
    };
  }, [color, pid, hidden]);

  const file = () =>
    new Promise<File>((resolve, reject) => {
      if (!canvas.current) return reject(new Error("[talk] the card is not drawn yet"));
      canvas.current.toBlob((blob) => {
        if (!blob) return reject(new Error("[talk] the card could not be turned into an image"));
        resolve(new File([blob], "play-together.png", { type: "image/png" }));
      }, "image/png");
    });

  // On a phone the share sheet is where "Save Image" puts the card in Photos;
  // where files cannot be shared, the card downloads instead.
  const save = async () => {
    try {
      const image = await file();
      if (navigator.canShare?.({ files: [image] })) {
        await navigator.share({ files: [image], title: "Play Together" });
        return;
      }
      const url = URL.createObjectURL(image);
      const a = document.createElement("a");
      a.href = url;
      a.download = image.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setSaving("saved");
    } catch (error) {
      // Closing the share sheet counts as an error; nothing to tell anyone.
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("[talk] could not save the card", error);
      setSaving({ failed: "Couldn't save. Take a screenshot instead." });
    }
  };

  return (
    <div className="phone__card">
      <canvas ref={canvas} className="phone__card-image" role="img" aria-label="Your Play Together card: the room's loops with yours, and the wishes" />
      <button type="button" className="phone__pill phone__card-save" style={{ background: color }} onClick={save} disabled={!drawn}>
        {saving === "saved" ? "Saved" : "Save"}
      </button>
      {typeof saving === "object" && <p className="phone__meta">{saving.failed}</p>}
      <a href="https://spencer.place" className="phone__card-link">
        spencer.place
      </a>
    </div>
  );
}
