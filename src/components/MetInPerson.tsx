// ABOUTME: Site-wide frame for people who tapped Spencer's NFC keychain.
// ABOUTME: Shows a dashed frame and, off the /met page, a minimized window bar that links back to /met.

import React, { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  $metRecord,
  MET_PATH,
  initMetInPerson,
  isMetPage,
  saveMetRecord,
} from "../stores/metInPerson";
import "./MetInPerson.scss";

export function MetInPerson() {
  const record = useStore($metRecord);
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    initMetInPerson();
    const onLoad = () => {
      initMetInPerson();
      setPathname(window.location.pathname);
    };
    document.addEventListener("astro:page-load", onLoad);
    return () => document.removeEventListener("astro:page-load", onLoad);
  }, []);

  if (!record) return null;
  const onMetPage = isMetPage(pathname);
  if (!onMetPage && record.dismissed) return null;

  return (
    <>
      <div className="met-frame" aria-hidden="true">
        <span className="met-frame-label">✿ met in person ✿</span>
      </div>

      {!onMetPage && (
        <div className="met-bar">
          <a className="met-bar-open noanchor" href={MET_PATH}>
            hi! we met in person <span aria-hidden="true">□</span>
          </a>
          <button
            className="met-bar-close"
            onClick={() => saveMetRecord({ dismissed: true })}
            aria-label="hide the met-in-person frame"
            title="hide (tap my keychain again to bring it back)"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
