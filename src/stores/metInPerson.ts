// ABOUTME: State for people who tapped Spencer's NFC keychain (lands on /met, or any page with ?met).
// ABOUTME: Nanostores keep it alive across view transitions; localStorage remembers the visitor.

import { atom } from "nanostores";

export const MET_PATH = "/met";
const LEGACY_PARAM = "met"; // ?met / ?met=<tag> on any page redirects to /met
const TAG_PARAM = "at"; // /met?at=zine-fair tags where we met
const STORAGE_KEY = "sp-met-in-person";

export interface MetRecord {
  firstScan: number; // ms timestamp of the first visit to /met on this device
  tag?: string;
  dismissed?: boolean; // closed the minimized bar; a new scan brings it back
  draft?: { name: string; note: string; reach: string };
}

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

export function isMetPage(pathname = window.location.pathname) {
  return pathname.replace(/\/$/, "") === MET_PATH;
}

let initialized = false;

// Call on every page load. Records a scan when the visitor lands on /met,
// redirects old ?met links there, and loads the remembered record otherwise.
export function initMetInPerson() {
  const url = new URL(window.location.href);

  if (url.searchParams.has(LEGACY_PARAM)) {
    const tag = url.searchParams.get(LEGACY_PARAM);
    const target = new URL(MET_PATH, url.origin);
    if (tag) target.searchParams.set(TAG_PARAM, tag);
    window.location.replace(target.toString());
    return;
  }

  if (isMetPage(url.pathname)) {
    const tag = url.searchParams.get(TAG_PARAM) || undefined;
    const existing = $metRecord.get() ?? read();
    // Landing on /met (re)opens the frame; the first visit is remembered as when we met.
    $metRecord.set(
      existing
        ? { ...existing, dismissed: false, tag: tag ?? existing.tag }
        : { firstScan: Date.now(), tag },
    );
    saveMetRecord({});
    if (tag) {
      url.searchParams.delete(TAG_PARAM);
      history.replaceState(history.state, "", url.toString());
    }
    initialized = true;
    return;
  }

  if (!initialized) {
    $metRecord.set(read());
    initialized = true;
  }
}
