// ABOUTME: Shared text helpers for the live chat component.
// ABOUTME: Keeps chat input draft behavior testable outside React.

function mentionName(name?: string): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed.replace(/\s+/g, "-") : "someone";
}

export function startReplyDraft(currentDraft: string, name?: string): string {
  const mention = `@${mentionName(name)}`;
  const trimmedDraft = currentDraft.trimStart();
  if (trimmedDraft.startsWith(`${mention} `)) return currentDraft;
  return trimmedDraft ? `${mention} ${trimmedDraft}` : `${mention} `;
}
