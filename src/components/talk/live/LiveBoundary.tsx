import { Component, type ReactNode } from "react";

/**
 * The live layer runs on data anyone in the room can write. If drawing it ever
 * fails, it disappears and the slides carry on; the deck must never go down
 * with it.
 */
export class LiveBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[talk] the live layer failed and was hidden; the deck keeps running", error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
