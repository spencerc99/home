import React, { useEffect } from "react";
import SocialMediaLinks from "./SocialMediaLinks";
import { Footnote } from "./Footnote";

const Signature: React.FC = () => {
  const nameStampRef = React.useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (!nameStampRef.current) return;

    window.playhtml?.setupPlayElement?.(nameStampRef.current);
  }, [nameStampRef]);
  return (
    <div className="signature" style={{ float: "none" }}>
      <div className="signatureContent">
        {/* TODO: hover over for photo in lil modal? */}
        <div className="serif">
          Spencer 張正 Chang
          <br />
          spencer@spencer.place
        </div>
        <Footnote
          asChild
          caption="this is my name stamp. my chinese name is 張正, 正 being my given name. 正 has many meanings: just, right, 5 if marking tallies on a food ordering sheet, proper, main, positive (for numbers). this animation was made on winter solstice and inspired by the scene from avatar the last airbender where aang opens the door to visit avatar roku during the winter solstice."
        >
          <img
            ref={nameStampRef}
            can-spin="true"
            id="stamp"
            className="stamp"
            src="/assets/name-stamp.png"
          />
        </Footnote>
        <SocialMediaLinks />
      </div>
    </div>
  );
};

export default Signature;
