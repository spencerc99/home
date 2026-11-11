// ABOUTME: State for the "met in person" frame shown to people who scan Spencer's NFC keychain.
// ABOUTME: Nanostores keep it alive across view transitions; localStorage remembers the visitor.

import { atom } from "nanostores";

export const MET_PARAM = "met";
const STORAGE_KEY = "sp-met-in-person";

export interface MetRecord {
  firstScan: number; // ms timestamp of the first scan on this device
  lastScan: number;
  scans: number;
  tag?: string; // optional value of ?met=<tag>, e.g. an event name
  dismissed?: boolean;
  sent?: boolean; // visitor opened the email draft
  draft?: { name: string; note: string };
}

// Whether the frame is mounted at all this session.
export const $metActive = atom(false);
export const $metCollapsed = atom(false);
export const $metRecord = atom<MetRecord | null>(null);

function read(): MetRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MetRecord) : null;
  } catch {
    return null;
  }
}

export function saveMetRecord(update: Partial<MetRecord>) {
  const current = $metRecord.get();
  if (!current) return;
  const next = { ...current, ...update };
  $metRecord.set(next);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

// Reads ?met from the URL (and strips it so shared links don't carry it),
// then decides whether to show the frame. Safe to call on every page load.
export function initMetInPerson() {
  if ($metRecord.get()) return; // already initialized this session

  const url = new URL(window.location.href);
  const scanned = url.searchParams.has(MET_PARAM);
  const tag = url.searchParams.get(MET_PARAM) || undefined;
  const existing = read();

  if (scanned) {
    url.searchParams.delete(MET_PARAM);
    history.replaceState(history.state, "", url.toString());

    const now = Date.now();
    const record: MetRecord = existing
      ? { ...existing, lastScan: now, scans: existing.scans + 1, dismissed: false, tag: tag ?? existing.tag }
      : { firstScan: now, lastScan: now, scans: 1, tag };
    $metRecord.set(record);
    saveMetRecord({});
    $metActive.set(true);
    $metCollapsed.set(false);
    return;
  }

  // Returning visitor who scanned before: show a collapsed tab unless they closed it.
  if (existing && !existing.dismissed) {
    $metRecord.set(existing);
    $metActive.set(true);
    $metCollapsed.set(true);
  }
}
