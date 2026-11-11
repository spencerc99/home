// ABOUTME: A hideable frame for people who tapped Spencer's NFC keychain (?met in the URL).
// ABOUTME: Lets them jot down how they met and send it to Spencer as a prefilled email.

import React, { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  $metActive,
  $metCollapsed,
  $metRecord,
  initMetInPerson,
  saveMetRecord,
} from "../stores/metInPerson";
import "./MetInPerson.scss";

const EMAIL = "hi@spencer.place";

function formatDay(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildMailto(name: string, note: string, metOn: number, tag?: string) {
  const subject = name.trim() ? `we met irl! (${name.trim()})` : "we met irl!";
  const lines = [
    note.trim() || "(how we met)",
    "",
    "—",
    name.trim() || "",
    `met on ${formatDay(metOn)}${tag ? ` · ${tag}` : ""}`,
    "sent from spencer.place",
  ].filter((line, i, all) => !(line === "" && all[i - 1] === ""));
  return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}

export function MetInPerson() {
  const active = useStore($metActive);
  const collapsed = useStore($metCollapsed);
  const record = useStore($metRecord);
  const [name, setName] = useState(record?.draft?.name ?? "");
  const [note, setNote] = useState(record?.draft?.note ?? "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    initMetInPerson();
  }, []);

  // Pick up a saved draft once the record loads.
  useEffect(() => {
    if (record?.draft && !name && !note) {
      setName(record.draft.name);
      setNote(record.draft.note);
    }
  }, [record?.firstScan]);

  // Save the draft so it survives navigation and returning later.
  useEffect(() => {
    if (!record) return;
    const t = setTimeout(() => saveMetRecord({ draft: { name, note } }), 300);
    return () => clearTimeout(t);
  }, [name, note]);

  if (!active || !record) return null;

  const returning = record.scans > 1 || Date.now() - record.firstScan > 1000 * 60 * 60 * 12;
  const greeting = record.sent
    ? "thanks for writing!"
    : returning
      ? "hi again :)"
      : "hi! we met in person";

  const dismiss = () => {
    saveMetRecord({ dismissed: true });
    $metActive.set(false);
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <>
      <div className="met-frame" aria-hidden="true">
        <span className="met-frame-label">✿ met in person ✿</span>
      </div>

      {collapsed ? (
        <button
          className="met-tab"
          onClick={() => $metCollapsed.set(false)}
          aria-label="open the met-in-person note"
        >
          ✿ we met!
        </button>
      ) : (
        <section className="met-card" aria-label="we met in person">
          <header className="met-card-titlebar">
            <span>{greeting}</span>
            <span className="met-card-actions">
              <button onClick={() => $metCollapsed.set(true)} aria-label="minimize" title="minimize">
                _
              </button>
              <button onClick={dismiss} aria-label="close" title="close (scan again to reopen)">
                ×
              </button>
            </span>
          </header>

          <div className="met-card-body">
            <p className="met-card-intro">
              thanks for tapping my keychain! i meet a lot of lovely people, so jot down how we met
              and send it my way, so i can remember you & we can keep in touch.
            </p>

            <label className="met-field">
              <span>your name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="name"
                autoComplete="name"
              />
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

            <a
              className="met-send noanchor"
              href={buildMailto(name, note, record.firstScan, record.tag)}
              onClick={() => saveMetRecord({ sent: true })}
            >
              send to spencer →
            </a>

            <p className="met-card-meta">
              met {formatDay(record.firstScan)}
              {record.tag ? ` · ${record.tag}` : ""} · or email{" "}
              <button className="met-copy" onClick={copyEmail}>
                {copied ? "copied!" : EMAIL}
              </button>{" "}
              · <a href="/contact">other ways</a>
            </p>
          </div>
        </section>
      )}
    </>
  );
}
