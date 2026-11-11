// ABOUTME: Design board for comparing gallery lightbox variants side by side on /design.
// ABOUTME: Each variant gets its own live gallery; a toggle flips the site's dark mode.
import React, { useEffect, useState } from "react";
import * as Lightbox from "@ramka/react/lightbox";
import {
  GALLERY_VARIANTS,
  GalleryViewer,
  type GalleryItem,
} from "./GalleryLightbox";

const SAMPLE: GalleryItem[] = [
  {
    src: "/collab/field-companions-staged-1.jpg",
    caption: "Field companions, staged on a windowsill.",
  },
  {
    src: "/collab/shrine-to-voice-06.jpg",
    caption:
      "Shrine to Voice: visitors leave a recording and hear one left before them.",
  },
  { src: "/collab/html-garden-culturehub.png", caption: "HTML garden at CultureHub." },
  { src: "/collab/fortune-webstone.jpeg", caption: "A fortune webstone." },
  {
    src: "/collab/communal-computing-workshop-dweb.png",
    caption: "Communal computing workshop at DWeb camp.",
  },
  { src: "/assets/noguchi-akari-1at.png" },
];

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark-mode"));
  }, []);
  const set = (next: boolean) => {
    document.documentElement.classList.toggle("dark-mode", next);
    try {
      sessionStorage.setItem("darkMode", next ? "dark" : "light");
    } catch {}
    setDark(next);
  };
  return (
    <div className="ldb-toggle" role="group" aria-label="Color theme">
      <button aria-pressed={!dark} onClick={() => set(false)}>
        light
      </button>
      <button aria-pressed={dark} onClick={() => set(true)}>
        dark
      </button>
    </div>
  );
}

export function LightboxDesignBoard() {
  return (
    <div className="ldb">
      <div className="ldb-intro">
        <p>
          Four takes on the creation-page lightbox, all built from the site's
          tokens. Tap any image to open that variant. Flip the theme to see each
          one in dark mode.
        </p>
        <ThemeToggle />
      </div>

      {GALLERY_VARIANTS.map((v, n) => (
        <section key={v.id} className="ldb-variant" id={`lightbox-${v.id}`}>
          <h2>
            <span className="ldb-letter">{String.fromCharCode(65 + n)}</span>{" "}
            {v.name}
          </h2>
          <p className="ldb-blurb">{v.blurb}</p>
          <Lightbox.Root count={SAMPLE.length}>
            <div className="ldb-thumbs">
              {SAMPLE.map((item, i) => (
                <Lightbox.Trigger
                  key={item.src}
                  index={i}
                  className="ldb-thumb"
                  aria-label={`Open ${v.name} variant at image ${i + 1}`}
                >
                  {({ imageRef }) => (
                    <img ref={imageRef} src={item.src} alt="" loading="lazy" />
                  )}
                </Lightbox.Trigger>
              ))}
            </div>
            <GalleryViewer items={SAMPLE} variant={v.id} />
          </Lightbox.Root>
        </section>
      ))}
    </div>
  );
}
