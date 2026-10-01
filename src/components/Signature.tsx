import React, { useEffect } from "react";
import SocialMediaLinks from "./SocialMediaLinks";
import { Footnote } from "./Footnote";

// The home page shows its own signature in the body, so the footer copy skips
// it there. A second copy would also duplicate the shared #stamp element.
function isHomePage() {
  return window.location.pathname === "/";
}

const Signature: React.FC<{ hideOnHome?: boolean }> = ({ hideOnHome }) => {
  const nameStampRef = React.useRef<HTMLImageElement>(null);
  const isHidden = hideOnHome && isHomePage();
  useEffect(() => {
    if (!nameStampRef.current) return;

    window.playhtml?.setupPlayElement?.(nameStampRef.current);
  }, [nameStampRef, isHidden]);
  if (isHidden) return null;
  return (
    <div className="signature" style={{ float: "none" }}>
      <div className="signatureContent">
        <div className="serif">
          Spencer 張正 Chang
          <br />
          hi@spencer.place
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
            alt="Spencer Chang name stamp"
          />
        </Footnote>
        <SocialMediaLinks />
      </div>
    </div>
  );
};

export default Signature;
