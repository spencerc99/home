import type { CollectionEntry } from "astro:content";
import React, { useMemo } from "react";
import { EventSummary } from "../EventSummary";

interface Props {
  events: Array<
    CollectionEntry<"creations">["data"] & {
      id: string;
      forthcoming: boolean;
    }
  >;
}

export function EventsView({ events }: Props) {
  const upcomingEvents = useMemo(
    () => events.filter((creation) => creation.forthcoming),
    [events]
  );
  const pastEvents = useMemo(
    () => events.filter((creation) => !creation.forthcoming),
    [events]
  );

  return (
    <div className="eventsView">
      {upcomingEvents.length > 0 && (
        <div className="upcomingEvents">
          <h3>upcoming</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1em" }}>
            {upcomingEvents.map((event) => (
              <EventSummary
                key={event.id}
                event={{ id: event.id, ...event.data }}
              />
            ))}
          </div>
        </div>
      )}
      {pastEvents.length > 0 && (
        <div className="pastEvents">
          <h3>past</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1em" }}>
            {pastEvents.map((event) => (
              <EventSummary
                key={event.id}
                event={{ id: event.id, ...event.data }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
