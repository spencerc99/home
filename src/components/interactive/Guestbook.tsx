// ABOUTME: Renders the shared guestbook as a pile of letters that spills into a wall.
// ABOUTME: Visitors write directly on a letter, pick its paper, and toss it onto the pile.
import { withSharedState } from "@playhtml/react";
import { Footnote } from "../Footnote";
import { useStickyState } from "../../hooks/useStickyState";
import { useTime } from "../../hooks/useTime";
import "./Guestbook.scss";
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PlayhtmlIslandProvider } from "./PlayhtmlProvider";

interface GuestbookEntry {
  name: string;
  color?: string;
  message: string;
  timestamp: number;
  website?: string;
  // Paper id from PAPERS. Older entries have none and get one from their timestamp.
  paper?: string;
}

const PAPERS = [
  { id: "drawing", label: "drawing paper" },
  { id: "kraft", label: "kraft" },
  { id: "cardboard", label: "cardboard" },
  { id: "crumpled", label: "crumpled" },
  { id: "pink", label: "pink" },
  { id: "yellow", label: "yellow" },
  { id: "grainy", label: "grainy" },
  { id: "grain", label: "grain" },
  { id: "riso", label: "riso" },
] as const;
const PaperIds: string[] = PAPERS.map((p) => p.id);

const httpRegex =
  /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;

// Wall cards get a small resting tilt so the spilled letters don't look gridded.
const WallTilts = [-1, 0.8, -0.4, 1.2, -0.8, 0.4];
// Tilts the letters start at while still on the pile.
const PileTilts = [-1.5, 4, -3, -5, 2, 6, -4, 3, -2];
// Past this many cards the spill stops staggering so big walls open quickly.
const MaxAnimatedSpill = 24;

const FlyMs = 550;
const FlyEasing = "cubic-bezier(.3,.7,.2,1)";
const SpillMs = 350;
const SpillStagger = 45;
const SpillEasing = "cubic-bezier(.2,.8,.25,1.05)";

function getDateString(timestamp: number) {
  const entryDate = new Date(timestamp);
  const time = entryDate.toTimeString().split(" ")[0].slice(0, 5);
  const isToday = entryDate.toDateString() === new Date().toDateString();
  // TODO: this is naive and incorrect but works most of the time lol
  const now = new Date();
  let dateString = "";
  if (
    now.getFullYear() !== entryDate.getFullYear() ||
    now.getMonth() !== entryDate.getMonth()
  ) {
    dateString = "Sometime before";
  } else if (isToday) {
    dateString = "Today";
  } else if (now.getDate() - entryDate.getDate() === 1) {
    dateString = "Yesterday";
  } else if (now.getDate() - entryDate.getDate() < 7) {
    dateString = "This week";
  } else {
    dateString = "Sometime before";
  }

  return `${dateString} at ${time}`;
}

function paperFor(entry: GuestbookEntry) {
  if (entry.paper && PaperIds.includes(entry.paper)) return entry.paper;
  return PaperIds[Math.abs(Math.floor(entry.timestamp / 1000)) % PaperIds.length];
}

function hostOf(website?: string) {
  if (!website) return null;
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function centerDelta(from: DOMRect, to: DOMRect) {
  return {
    dx: to.left + to.width / 2 - (from.left + from.width / 2),
    dy: to.top + to.height / 2 - (from.top + from.height / 2),
  };
}

// Favicons come from Google's favicon service, so entries only ever store the
// website URL. If the icon fails to load we fall back to a letter tile.
function Favicon({ host }: { host: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="gbFav gbFavLetter" aria-hidden="true">
        {host[0]}
      </span>
    );
  }
  return (
    <img
      className="gbFav"
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`}
      alt=""
      width={16}
      height={16}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function Signoff({ entry }: { entry: GuestbookEntry }) {
  const host = hostOf(entry.website);
  const name = (
    <span className="gbName" style={{ color: entry.color }}>
      {host && <Favicon host={host} />}
      <span>{entry.name}</span>
    </span>
  );
  return (
    <span className="gbSignoff">
      <span className="gbWhen">{getDateString(entry.timestamp)}</span>
      {host ? (
        <a
          href={entry.website}
          target="_blank"
          rel="noopener noreferrer"
          className="gbNameLink noanchor"
          title={host}
          onClick={(e) => e.stopPropagation()}
        >
          {name}
        </a>
      ) : (
        name
      )}
    </span>
  );
}

interface LetterDraft {
  message: string;
  setMessage: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  website: string;
  setWebsite: (v: string) => void;
  paper: string;
  setPaper: (v: string) => void;
  color?: string;
  now: number;
}

function PaperPicker({ paper, setPaper }: Pick<LetterDraft, "paper" | "setPaper">) {
  return (
    <div className="gbPapers" role="radiogroup" aria-label="Paper">
      {PAPERS.map((p) => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={paper === p.id}
          aria-label={p.label}
          title={p.label}
          className={`gbSwatch gbPaper-${p.id} ${paper === p.id ? "on" : ""}`}
          onClick={() => setPaper(p.id)}
        />
      ))}
    </div>
  );
}

function BlankLetterFields({ draft, compact }: { draft: LetterDraft; compact?: boolean }) {
  return (
    <>
      <em className="gbDear">Dear spencer,</em>
      <label className="gbGrow">
        <span className="gbSr">your letter</span>
        <textarea
          className={`gbInk gbMessageInput ${compact ? "compact" : ""}`}
          placeholder="your turn. write something..."
          maxLength={500}
          value={draft.message}
          onChange={(e) => draft.setMessage(e.target.value)}
        />
      </label>
      <span className="gbSignoff gbSignoffEdit">
        <span className="gbWhen">{getDateString(draft.now)}</span>
        <span className="gbFromFields">
          <label>
            <span className="gbSr">your name</span>
            <input
              className="gbInk gbNameInput"
              type="text"
              placeholder="your name"
              maxLength={20}
              value={draft.name}
              onChange={(e) => draft.setName(e.target.value)}
              style={{ color: draft.color }}
            />
          </label>
          <label>
            <span className="gbSr">your website, optional</span>
            <input
              className="gbInk gbSiteInput"
              type="text"
              inputMode="url"
              placeholder="your website (optional)"
              maxLength={100}
              value={draft.website}
              onChange={(e) => draft.setWebsite(e.target.value)}
            />
          </label>
        </span>
      </span>
    </>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}

export const GuestbookImpl = withSharedState(
  {
    defaultData: [] as GuestbookEntry[],
  },
  ({ data, setData }) => {
    const [name, setName] = useState<string>(() => window.cursors?.name || "");
    // Sync name changes to the cursor system
    useEffect(() => {
      if (window.cursors && name) {
        window.cursors.name = name;
      }
    }, [name]);
    const [website, setWebsite] = useStickyState<string | null>(
      "userwebsite",
      null,
    );
    const [paper, setPaper] = useStickyState<string>(
      "guestbookPaper",
      "drawing",
    );
    const [message, setMessage] = useState("");
    const [idx, setIdx] = useState(0);
    const [open, setOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [landed, setLanded] = useState(false);

    const pileRef = useRef<HTMLButtonElement>(null);
    const topRef = useRef<HTMLSpanElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const wallRef = useRef<HTMLDivElement>(null);
    const spillFrom = useRef<DOMRect | null>(null);
    const flipDir = useRef(0);
    const flipping = useRef(false);

    const sortedData = useMemo(
      () => [...data].sort((a, b) => b.timestamp - a.timestamp),
      [data],
    );
    const top = Math.min(idx, Math.max(sortedData.length - 1, 0));
    const color = window?.cursors?.color;
    const time = useTime(30 * 1000);

    const draft: LetterDraft = {
      message,
      setMessage,
      name,
      setName,
      website: website || "",
      setWebsite,
      paper: PaperIds.includes(paper) ? paper : "drawing",
      setPaper,
      color,
      now: time,
    };

    function buildEntry(): GuestbookEntry | null {
      const nameTransformed = name.trim();
      const messageTransformed = message.trim();
      let websiteTransformed = website?.trim() || undefined;

      if (!messageTransformed) {
        alert("Write something on your letter first.");
        return null;
      }
      if (!nameTransformed) {
        alert("Sign your letter with a name.");
        return null;
      }
      if (websiteTransformed && !/^https?:\/\//i.test(websiteTransformed)) {
        websiteTransformed = `https://${websiteTransformed}`;
      }
      if (websiteTransformed && !httpRegex.test(websiteTransformed)) {
        alert("Please enter a valid website URL.");
        return null;
      }
      if (websiteTransformed !== (website?.trim() || undefined)) {
        setWebsite(websiteTransformed || null);
      }

      return {
        name: nameTransformed,
        color,
        message: messageTransformed,
        timestamp: Date.now(),
        website: websiteTransformed,
        paper: draft.paper,
      };
    }

    function commit(entry: GuestbookEntry) {
      setData((guestbook) => {
        guestbook.push(entry);
      });
      setMessage("");
      setIdx(0);
    }

    // Tosses the letter in an arc onto the pile, then adds it to the guestbook.
    function addToPile() {
      if (sending) return;
      const entry = buildEntry();
      if (!entry) return;

      const sheet = sheetRef.current;
      const pile = pileRef.current;
      if (!sheet || !pile || !sheet.animate || prefersReducedMotion()) {
        commit(entry);
        return;
      }

      const from = sheet.getBoundingClientRect();
      const to = pile.getBoundingClientRect();
      const { dx, dy } = centerDelta(from, to);
      const scaleTo = to.width / from.width;
      const rnd = (a: number, b: number) => a + Math.random() * (b - a);
      const peak = rnd(110, 190);
      const spin = rnd(-12, -4) * (Math.random() < 0.2 ? -1 : 1);
      const yaw = rnd(8, 22) * (Math.random() < 0.5 ? -1 : 1);
      const pitch = rnd(6, 16);
      const endX = dx + rnd(-10, 10);
      const endY = dy + rnd(-8, 4);
      const endRot = rnd(-3, 1);
      const frames: Keyframe[] = [];
      for (let j = 0; j <= 12; j++) {
        const t = j / 12;
        const bump = Math.sin(Math.PI * t);
        const x = endX * t;
        const y = 2 * (1 - t) * t * -peak + t * t * endY;
        const rot = endRot * t + bump * spin;
        const sc = 1 + (scaleTo - 1) * t + bump * 0.07;
        frames.push({
          transform: `perspective(1000px) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotateX(${(bump * pitch).toFixed(2)}deg) rotateY(${(bump * yaw).toFixed(2)}deg) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`,
          boxShadow: `0 ${(2 + bump * 26).toFixed(0)}px ${(4 + bump * 30).toFixed(0)}px rgba(43,38,32,${(0.18 + bump * 0.12).toFixed(2)})`,
        });
      }

      setSending(true);
      const fly = sheet.animate(frames, {
        duration: FlyMs,
        easing: FlyEasing,
        fill: "forwards",
      });
      fly.onfinish = () => {
        commit(entry);
        fly.cancel();
        setSending(false);
        setLanded(true);
        setTimeout(() => setLanded(false), 400);
        sheet.animate(
          [
            { opacity: 0, transform: "translateY(24px) rotate(4deg)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 450, easing: "ease-out" },
        );
      };
    }

    // Adds a letter written on the open wall; it shows up right after the blank one.
    function addFromWall() {
      const entry = buildEntry();
      if (entry) commit(entry);
    }

    function flip(dir: number) {
      const to = top + dir;
      if (to < 0 || to >= sortedData.length || flipping.current) return;
      const el = topRef.current;
      if (!el || !el.animate || prefersReducedMotion()) {
        setIdx(to);
        return;
      }
      flipping.current = true;
      const out = el.animate(
        [
          { transform: "none" },
          {
            transform: `translate(${dir > 0 ? -380 : 380}px, -30px) rotate(${dir > 0 ? -14 : 14}deg)`,
            opacity: 0,
          },
        ],
        { duration: 260, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards" },
      );
      out.onfinish = () => {
        flipDir.current = dir;
        setIdx(to);
        out.cancel();
      };
    }

    // Brings the next top letter in once a flip has swapped it.
    useLayoutEffect(() => {
      const dir = flipDir.current;
      if (!dir) return;
      flipDir.current = 0;
      flipping.current = false;
      topRef.current?.animate(
        [
          {
            transform: `translate(${dir > 0 ? 18 : -18}px, 6px) rotate(${dir > 0 ? 2 : -2}deg)`,
            opacity: 0.4,
          },
          { transform: "none", opacity: 1 },
        ],
        { duration: 220, easing: "ease-out" },
      );
    }, [idx]);

    function spill() {
      spillFrom.current = pileRef.current?.getBoundingClientRect() ?? null;
      setOpen(true);
    }

    // FLIP: every wall card starts stacked on the pile's old spot and settles
    // into place; the blank letter fades in at the pile as the last one leaves.
    useLayoutEffect(() => {
      const pile = spillFrom.current;
      spillFrom.current = null;
      const wall = wallRef.current;
      if (!open || !pile || !wall || prefersReducedMotion()) return;

      const cards = Array.from(wall.querySelectorAll<HTMLElement>(".gbSpill"));
      const animated = Math.min(cards.length, MaxAnimatedSpill);
      const fromPile = (card: HTMLElement) => {
        const r = card.getBoundingClientRect();
        const { dx, dy } = centerDelta(r, pile);
        const s = Math.min(pile.width / r.width, pile.height / r.height) || 1;
        return { dx, dy, s };
      };

      cards.forEach((card, i) => {
        const { dx, dy, s } = fromPile(card);
        const delay = Math.min(i, animated - 1) * SpillStagger;
        card.style.zIndex = String(200 - i);
        const a = card.animate(
          [
            {
              transform: `translate(${dx}px, ${dy}px) rotate(${PileTilts[i % PileTilts.length]}deg) scale(${s})`,
            },
            { transform: card.style.transform || "none" },
          ],
          { duration: SpillMs, delay, easing: SpillEasing, fill: "backwards" },
        );
        a.onfinish = () => {
          card.style.zIndex = "";
        };
      });

      const mine = wall.querySelector<HTMLElement>(".gbSpillMine");
      if (mine && animated) {
        const { dx, dy, s } = fromPile(mine);
        const atPile = `translate(${dx}px, ${dy}px) rotate(1deg) scale(${s})`;
        const lastLeaves = (animated - 1) * SpillStagger;
        const total = lastLeaves + SpillMs;
        mine.animate(
          [
            { transform: atPile, opacity: 0, offset: 0 },
            {
              transform: atPile,
              opacity: 1,
              offset: lastLeaves / total,
              easing: SpillEasing,
            },
            { transform: "none", opacity: 1, offset: 1 },
          ],
          { duration: total, easing: "linear", fill: "backwards" },
        );
      }
    }, [open]);

    const topEntry = sortedData[top];
    const under = [1, 2, 3].map((n) =>
      sortedData.length > n ? paperFor(sortedData[(top + n) % sortedData.length]) : null,
    );

    return (
      <div id="guestbook">
        {!open ? (
          <div className="gbTable">
            <div className="gbPileCol">
              {topEntry ? (
                <>
                  <button
                    ref={pileRef}
                    className={`gbPile ${landed ? "landed" : ""}`}
                    onClick={spill}
                    aria-label={`Spread out all ${sortedData.length} letters`}
                  >
                    <span className="gbPileInner">
                      {under[2] && <span className={`gbUnder gbSheet gbPaper-${under[2]} u3`} />}
                      {under[1] && <span className={`gbUnder gbSheet gbPaper-${under[1]} u2`} />}
                      {under[0] && <span className={`gbUnder gbSheet gbPaper-${under[0]} u1`} />}
                      <span
                        ref={topRef}
                        className={`gbTop gbSheet gbPaper-${paperFor(topEntry)}`}
                      >
                        <em className="gbDear">Dear spencer,</em>
                        <span className="gbMessage gbTopMessage">{topEntry.message}</span>
                        <Signoff entry={topEntry} />
                      </span>
                    </span>
                  </button>
                  <div className="gbBrowse">
                    <button
                      className="gbArrow"
                      onClick={() => flip(-1)}
                      disabled={top === 0}
                      aria-label="Previous letter"
                    >
                      <Chevron dir="left" />
                    </button>
                    <span className="gbHint">
                      <span className="gbHintWide">click</span>
                      <span className="gbHintNarrow">tap</span> to browse all
                      <Footnote
                        isHtmlCaption
                        caption="a guestbook made with <a href='/creation/playhtml'>playhtml</a>. i'll be reviewing letters :)"
                      ></Footnote>
                    </span>
                    <button
                      className="gbArrow"
                      onClick={() => flip(1)}
                      disabled={top >= sortedData.length - 1}
                      aria-label="Next letter"
                    >
                      <Chevron dir="right" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="gbPile gbPileEmpty">no letters yet. be the first!</div>
              )}
            </div>
            <div className="gbWriteCol">
              <div
                ref={sheetRef}
                className={`gbSheet gbBlank gbPaper-${draft.paper}`}
              >
                <BlankLetterFields draft={draft} />
              </div>
              <PaperPicker paper={draft.paper} setPaper={setPaper} />
              <button className="gbSend" onClick={addToPile} disabled={sending}>
                add to the pile
              </button>
            </div>
          </div>
        ) : (
          <>
            <button className="gbGather" onClick={() => setOpen(false)}>
              gather them back up
            </button>
            <div className="gbWall" ref={wallRef}>
              <div className={`gbSheet gbBlank gbSpillMine gbPaper-${draft.paper}`}>
                <BlankLetterFields draft={draft} compact />
                <PaperPicker paper={draft.paper} setPaper={setPaper} />
                <button className="gbSend gbSendSmall" onClick={addFromWall}>
                  add
                </button>
              </div>
              {sortedData.map((entry, i) => (
                <article
                  key={`${entry.timestamp}-${entry.name}`}
                  className={`gbSheet gbSpill gbPaper-${paperFor(entry)}`}
                  style={{ transform: `rotate(${WallTilts[i % WallTilts.length]}deg)` }}
                >
                  <em className="gbDear">Dear spencer,</em>
                  <p className="gbMessage">{entry.message}</p>
                  <Signoff entry={entry} />
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    );
  },
);

export function Guestbook() {
  return (
    <PlayhtmlIslandProvider>
      <GuestbookImpl />
    </PlayhtmlIslandProvider>
  );
}
