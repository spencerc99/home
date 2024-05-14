import React, { useEffect } from "react";
import { ClockEmbed } from "../ClockEmbed";

function createTelescopicText(id: string, content: string) {
  const node = createTelescopicTextFromBulletedList(content);
  const container = document.getElementById(id);
  container.appendChild(node);

  return () => {
    container.removeChild(node);
  };
}

export function Intersection() {
  //     - technology is meaningless without people. Liberal arts is everything to do with people. Liberal arts is the study of us and our environments. The intersection is how technology can take forms as tool that are useful for us and the enlivening of our worlds.
  // - technology is a material for connection, creation, and solidarity
  // - technology is something for people to
  useEffect(() => {
    const cleanups: any[] = [];
    cleanups.push(
      createTelescopicText(
        "highlighted",
        `
* click the 
* highlighted words 
    * highlighted words to reveal`
      )
    );
    cleanups.push(
      createTelescopicText(
        "body",
        `
* the intersection of technology and arts is us.
    * the intersection of technology and arts is us.
    * technology is
    * an art
        * a tool
            * a material for expression
    * we invented technology
    * for me technology is a means to an end. its a tool for shaping culture and a material for human agency. 
    * technology is an infrastructure for us to expand our possibilities of flourishing together.
    * ---
    * Our purpose is to study ourselves and our environments. The intersection is how technology can take forms as tool that are useful for us and the enlivening of our worlds.
    * ---
    * technology is a material for connection, creation, and solidarity 
    * technology is something for people to
    * ---`
      )
    );
    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2em 0",
        paddingBottom: "4em",
        position: "relative",
      }}
    >
      <i id="highlighted"></i>
      <div
        style={{
          maxWidth: "800px",
          position: "relative",
          fontSize: "1.5em",
          marginTop: "2em",
        }}
      >
        <div id="body" can-mirror=""></div>
        <div
          style={{
            position: "absolute",
            maxWidth: "220px",
            right: "-330px",
            top: "-120px",
          }}
        >
          <ClockEmbed />
        </div>
      </div>
    </div>
  );
}

function HoverImage({ src, dir }: { src: string; dir: "left" | "right" }) {
  return (
    <div
      style={{
        position: "absolute",
        maxWidth: "200px",
        [dir === "left" ? "left" : "right"]: "-200px",
      }}
    >
      <img src={src} />
    </div>
  );
}
