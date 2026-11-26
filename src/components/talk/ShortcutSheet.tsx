// Every key the stage answers to, shown over the deck with / (or ?).

const GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: "Moving",
    keys: [
      ["→  space  enter", "next (reveals the slide's next step first)"],
      ["←  shift+space", "back"],
      ["12 then enter", "jump to slide 12"],
      ["r  home / end", "first slide / last slide"],
      ["g", "all slides"],
    ],
  },
  {
    title: "The room",
    keys: [
      ["l", "go live: phones follow this screen (first time: every phone flashes)"],
      ["j", "join card over any slide, for latecomers"],
      ["m", "start or stop the phones' turn on this slide; on the join screen, flash the room once"],
      ["h", "hide the newest wish"],
    ],
  },
  {
    title: "The phones' turns (press m)",
    keys: [
      ["slide 2, next", "join card (no m needed)"],
      ["slide 6", "draw loops"],
      ["slide 8", "send wishes"],
      ["slide 12", "take a seat"],
      ["slide 34", "everyone's marks, and each phone its card"],
    ],
  },
  {
    title: "Showing",
    keys: [
      ["k  p", "play or pause the slide's videos"],
      ["f", "full screen"],
      ["z", "fit or fill the screen"],
      ["n", "speaker notes window"],
      ["o", "open the slide's link"],
      ["e", "edit mode (local dev server only)"],
      ["/  ?", "this sheet"],
    ],
  },
];

export function ShortcutSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="talk-help" role="dialog" aria-label="Keyboard shortcuts" onClick={onClose}>
      <div className="talk-help__card" onClick={(event) => event.stopPropagation()}>
        <header>
          <strong>Keys</strong>
          <button type="button" onClick={onClose} aria-label="Close">
            esc
          </button>
        </header>
        <div className="talk-help__groups">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h3>{group.title}</h3>
              <dl>
                {group.keys.map(([key, what]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{what}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
