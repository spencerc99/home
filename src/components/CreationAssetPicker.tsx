// ABOUTME: Development tool for browsing and selecting creation media assets
// ABOUTME: Provides keyboard navigation and code generation for workshop pages

import { useState, useEffect } from "react";
import type { CollectionEntry } from "astro:content";

interface Props {
  creations: CollectionEntry<"creation">[];
}

export function CreationAssetPicker({ creations }: Props) {
  const [selectedCreationIndex, setSelectedCreationIndex] = useState(0);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [showCode, setShowCode] = useState(false);

  const currentCreation = creations[selectedCreationIndex];

  const media = (currentCreation?.data.media || []).map((src, index) => ({
    src,
    type: currentCreation?.data.mediaMetadata?.[index] || "image",
    alt: currentCreation?.data.imageDescriptions?.[index] || "",
  }));

  const currentMedia = media[selectedMediaIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedMediaIndex((prev) => Math.min(prev + 1, media.length - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedMediaIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedCreationIndex((prev) =>
          Math.min(prev + 1, creations.length - 1)
        );
        setSelectedMediaIndex(0);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedCreationIndex((prev) => Math.max(prev - 1, 0));
        setSelectedMediaIndex(0);
      } else if (e.key === "Enter") {
        e.preventDefault();
        setShowCode(true);
      } else if (e.key === "c" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        copyCode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCreationIndex, selectedMediaIndex, creations.length, media.length]);

  const generateCode = () => {
    if (!currentMedia) return "";

    if (currentMedia.type === "video") {
      return `<video
  style="width:100%; max-width:800px; height:auto"
  controls
  autoPlay
  loop
  muted
  src="${currentMedia.src}"
></video>`;
    } else {
      return `<img src="${currentMedia.src}" alt="${currentMedia.alt || ""}" />`;
    }
  };

  const copyCode = async () => {
    const code = generateCode();
    try {
      await navigator.clipboard.writeText(code);
      alert("Code copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!currentCreation) {
    return <div>No creations found</div>;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "var(--color-neutral-background)",
        border: "2px solid var(--color-text-color)",
        padding: "2rem",
        maxWidth: "90vw",
        maxHeight: "90vh",
        overflow: "auto",
        zIndex: 9999,
        boxShadow: "0 4px 6px var(--color-box-shadow)",
        color: "var(--color-text-color)",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Creation Asset Picker</h2>

      <div style={{ marginBottom: "1rem" }}>
        <strong>Creation:</strong>
        <select
          value={selectedCreationIndex}
          onChange={(e) => {
            setSelectedCreationIndex(Number(e.target.value));
            setSelectedMediaIndex(0);
          }}
          style={{
            marginLeft: "0.5rem",
            padding: "0.25rem 0.5rem",
            fontSize: "1rem",
            background: "var(--color-neutral-background)",
            color: "var(--color-text-color)",
            border: "1px solid var(--border-color)",
          }}
        >
          {creations.map((creation, index) => (
            <option key={creation.id} value={index}>
              {creation.data.title}
            </option>
          ))}
        </select>
        <span style={{ marginLeft: "0.5rem", color: "var(--color-text-muted)" }}>
          ({selectedCreationIndex + 1} / {creations.length})
        </span>
      </div>

      {media.length > 0 ? (
        <>
          <div style={{ marginBottom: "1rem" }}>
            <strong>Media:</strong>
            <select
              value={selectedMediaIndex}
              onChange={(e) => setSelectedMediaIndex(Number(e.target.value))}
              style={{
                marginLeft: "0.5rem",
                padding: "0.25rem 0.5rem",
                fontSize: "1rem",
                background: "var(--color-neutral-background)",
                color: "var(--color-text-color)",
                border: "1px solid var(--border-color)",
              }}
            >
              {media.map((item, index) => (
                <option key={index} value={index}>
                  {item.type === "video" ? "Video" : "Image"} {index + 1}
                  {item.alt ? ` - ${item.alt.substring(0, 50)}` : ""}
                </option>
              ))}
            </select>
            <span style={{ marginLeft: "0.5rem", color: "var(--color-text-muted)" }}>
              ({selectedMediaIndex + 1} / {media.length})
            </span>
          </div>

          <div
            style={{
              marginBottom: "1rem",
              border: "1px solid var(--border-color)",
              padding: "1rem",
              background: "var(--color-background-lavender)",
            }}
          >
            {currentMedia.type === "video" ? (
              <video
                key={currentMedia.src}
                controls
                autoPlay
                loop
                muted
                style={{ width: "100%", maxWidth: "600px" }}
                src={currentMedia.src}
              />
            ) : (
              <img
                src={currentMedia.src}
                alt={currentMedia.alt || ""}
                style={{ width: "100%", maxWidth: "600px" }}
              />
            )}
          </div>

          {currentMedia.alt && (
            <div style={{ marginBottom: "1rem", fontStyle: "italic" }}>
              {currentMedia.alt}
            </div>
          )}

          <div style={{ marginBottom: "1rem" }}>
            <button
              onClick={() => setShowCode(!showCode)}
              style={{
                padding: "0.5rem 1rem",
                marginRight: "0.5rem",
                cursor: "pointer",
                background: "var(--color-neutral-background)",
                color: "var(--color-text-color)",
                border: "1px solid var(--border-color)",
              }}
            >
              {showCode ? "Hide" : "Show"} Code
            </button>
            <button
              onClick={copyCode}
              style={{
                padding: "0.5rem 1rem",
                cursor: "pointer",
                background: "var(--color-neutral-background)",
                color: "var(--color-text-color)",
                border: "1px solid var(--border-color)",
              }}
            >
              Copy Code (⌘C)
            </button>
          </div>

          {showCode && (
            <pre
              style={{
                background: "var(--color-background-lavender)",
                border: "1px solid var(--border-color)",
                padding: "1rem",
                overflow: "auto",
                fontSize: "0.9rem",
                color: "var(--color-text-color)",
              }}
            >
              {generateCode()}
            </pre>
          )}
        </>
      ) : (
        <div>No media assets found for this creation</div>
      )}

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "var(--color-background-blue)",
          border: "1px solid var(--border-color)",
          borderRadius: "4px",
        }}
      >
        <strong>Keyboard Shortcuts:</strong>
        <ul style={{ margin: "0.5rem 0", paddingLeft: "1.5rem" }}>
          <li>← → : Navigate between media</li>
          <li>↑ ↓ : Navigate between creations</li>
          <li>Enter: Show/hide code</li>
          <li>⌘C / Ctrl+C: Copy code</li>
        </ul>
      </div>
    </div>
  );
}
