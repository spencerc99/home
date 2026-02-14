/**
 * Now page entries: newest first.
 * Each item is a "- ..." list line; store only the content after the dash (HTML allowed).
 */
export interface NowEntry {
  date: string; // YYYY-MM-DD
  items: string[];
}

export const nowEntries: NowEntry[] = [
  {
    date: "2026-02-14",
    items: [
      'Exploring making art with my <a href="https://x.com/spencerc99/status/2013758318016451065">internet debris</a>',
      'Making a game for the internet filled with <a href="/creation/playhtml">tiny social networks</a>',
      "Collecting boulders to put in a park",
      'Shaping culture through <a href=\"https://www.instagram.com/spence.r.chang/\">social</a> <a href=\"https://x.com/spencerc99\">media</a>.',
      'Open to <a href="/collab">invitations & collaborations</a> for teaching, crafting, and scheming.',
    ],
  },
  {
    date: "2026-02-13",
    items: [
      'Exploring making art with my <a href="https://x.com/spencerc99/status/2013758318016451065">internet debris</a>',
      'Making a game for the internet filled with <a href="/creation/playhtml">tiny social networks</a>',
      'Making an app for your to customize your <a href="https://internetsculptures.com">Internet Sculptures</a>',
      'Shaping culture through <a href="https://www.instagram.com/spence.r.chang/">social</a> <a href="https://x.com/spencerc99">media</a>.',
      'Open to <a href="/collab">invitations & collaborations</a> for teaching, crafting, and scheming.',
    ],
  },
];
