// ABOUTME: The /met page body: a note-to-Spencer window and a keep-in-touch window.
// ABOUTME: Sending opens the visitor's email app with a prefilled message to Spencer.

import React, { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { $metRecord, saveMetRecord } from "../stores/metInPerson";
import "./MetInPerson.scss";

const EMAIL = "hi@spencer.place";

const LINKS: { label: string; href: string }[] = [
  { label: "email", href: `mailto:${EMAIL}` },
  { label: "ig", href: "https://www.instagram.com/spence.r.chang/" },
  { label: "bsky", href: "https://bsky.app/profile/spencer.place" },
  { label: "tiktok", href: "https://www.tiktok.com/@spencer.place" },
  { label: "twitter", href: "https://twitter.com/spencerc99" },
  { label: "newsletter", href: "https://news.spencer.place" },
];

function formatDay(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildMailto(name: string, note: string, reach: string, metOn: number, tag?: string) {
  const who = name.trim();
  const subject = who ? `we met irl! (${who})` : "we met irl!";
  const body = [
    note.trim() || "(how we met)",
    "",
    "—",
    who,
    reach.trim() ? `reach me at: ${reach.trim()}` : "",
    `met on ${formatDay(metOn)}${tag ? ` · ${tag}` : ""}`,
    "sent from spencer.place/met",
  ]
    .filter((line, i) => line !== "" || i === 1)
    .join("\n");
  return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function MetPage() {
  const record = useStore($metRecord);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [reach, setReach] = useState("");
  const [loadedDraft, setLoadedDraft] = useState(false);

  // Restore a saved draft once the record is available.
  useEffect(() => {
    if (!record || loadedDraft) return;
    if (record.draft) {
      setName(record.draft.name);
      setNote(record.draft.note);
      setReach(record.draft.reach ?? "");
    }
    setLoadedDraft(true);
  }, [record, loadedDraft]);

  // Autosave the draft so browsing around doesn't lose it.
  useEffect(() => {
    if (!loadedDraft) return;
    const t = setTimeout(() => saveMetRecord({ draft: { name, note, reach } }), 300);
    return () => clearTimeout(t);
  }, [name, note, reach, loadedDraft]);

  const metOn = record?.firstScan ?? Date.now();

  return (
    <div className="met-page">
      <section className="met-window" aria-label="write spencer a note">
        <header className="met-window-titlebar">hi! we met in person</header>
        <div className="met-window-body">
          <div className="met-stamp-row">
            <img src="/name-stamp.png" alt="Spencer's name stamp, 張正" />
            <span>
              met {formatDay(metOn)}
              {record?.tag ? ` · ${record.tag}` : ""}
            </span>
          </div>
          <p>
            thanks for tapping my keychain! i meet a lot of lovely people, so jot down how we met
            and send it my way, so i can remember you &amp; we can keep in touch.
          </p>
          <label className="met-field">
            <span>your name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name" autoComplete="name" />
          </label>
          <label className="met-field">
            <span>how we met</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="we talked about webstones at the zine fair…"
              rows={3}
            />
          </label>
          <label className="met-field">
            <span>how to reach you (optional)</span>
            <input value={reach} onChange={(e) => setReach(e.target.value)} placeholder="@ or email or number" />
          </label>
          <a className="met-button met-button-dark noanchor" href={buildMailto(name, note, reach, metOn, record?.tag)}>
            send to spencer →
          </a>
        </div>
      </section>

      <section className="met-window" aria-label="keep in touch">
        <header className="met-window-titlebar">keep in touch</header>
        <div className="met-window-body">
          <a className="met-button met-button-accent noanchor" href="/spencer-chang.vcf" download>
            save my contact
          </a>
          <div className="met-chips">
            {LINKS.map((l) => (
              <a key={l.label} className="met-chip noanchor" href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                {l.label}
              </a>
            ))}
          </div>
          <p className="met-hint">save my contact adds my email, site + all my handles to your phone in one tap.</p>
        </div>
      </section>

      <a className="met-browse" href="/">
        look around my internet home →
      </a>
      <p className="met-hint met-browse-hint">this window will shrink to the corner so you can come back.</p>
    </div>
  );
}
