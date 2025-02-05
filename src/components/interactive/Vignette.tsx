import React, { useEffect, useState } from "react";

interface Vignette {
  url: string;
  date: Date;
  title: string;
  description: string;
}

export function Vignette() {
  const [lastVignette, setLastVignette] = useState<Vignette | null>(null);

  useEffect(() => {
    fetch(
      "https://spencer-lastarenablock.web.val.run?channel=vignettes-wjzlrh_sp3q"
    )
      .then((res) => res.json())
      .then((data) =>
        setLastVignette({
          ...data,
          date: new Date(data.connected_at),
        })
      );
  }, []);

  return (
    <>
      <div
        id="window"
        title=""
        style={{
          background: "rgb(96 126 183 / 65%)",
          display: "flex",
          flexDirection: "column",
          borderRadius: "8px",
          boxShadow: "rgba(0, 0, 0, 0.133) 0px 0px 8px 0px",
          width: "100%",
          margin: "0px",
          padding: "10px",
          position: "relative",
          justifyContent: "center",
          transform: "rotate(-7deg)",
          maxWidth: "180px",
        }}
      >
        <div style={{ position: "relative", width: "inherit" }}>
          <img
            width="200"
            loading="lazy"
            src={lastVignette?.image?.display?.url}
            style={{
              width: "inherit",
              objectFit: "cover",
              aspectRatio: "5/7",
            }}
          />
          <div
            style={{
              position: "absolute",
              zIndex: 1,
              top: "1px",
              right: "0",
              fontSize: "10px",
              fontFamily: "'Press Start 2P', monospace",
              color: "rgb(249, 184, 91)",
              backdropFilter: "blur(2px)",
              lineHeight: "16px",
              padding: "0px 3px",
              borderRadius: "0px 0px 0px 4px",
              background:
                "rgba(0, 0, 0, 0.4) none repeat scroll 0% 0% / auto padding-box border-box",
            }}
          >
            {lastVignette?.date.toLocaleDateString()}{" "}
            {lastVignette?.date.toLocaleTimeString()}
          </div>
        </div>
        {lastVignette?.title && (
          <div
            style={{
              background: "rgb(96 126 183 / 100%)",
              position: "absolute",
              fontFamily: "Orbitron",
              borderRadius: "4px",
              bottom: "-12px",
              width: "110%",
              left: "-12px",
              zIndex: 2,
              display: "flex",
              justifyContent: "center",
              padding: "0px .5em",
              fontSize: "16px",
              textAlign: "center",
            }}
          >
            {lastVignette?.title}
          </div>
        )}
      </div>
      <em style={{ marginTop: "1em" }}>
        the last{" "}
        <a href="https://www.are.na/spencer-chang/vignettes-wjzlrh_sp3q">
          vignette
        </a>{" "}
        I took
      </em>
    </>
  );
}
