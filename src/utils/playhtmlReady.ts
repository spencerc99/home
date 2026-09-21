// ABOUTME: Readiness helper for mounting components that consume playhtml APIs.
// ABOUTME: Prevents consumers from running before provider sync is confirmed.

export function isPlayhtmlReadyForConsumers(
  hasSynced: boolean,
  hasConfirmedSync: boolean,
) {
  return hasSynced && hasConfirmedSync;
}
