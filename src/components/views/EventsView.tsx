import type { CollectionEntry } from "astro:content";
import React, { useMemo } from "react";
import { EventSummary } from "../EventSummary";
import { Carousel } from "../Carousel";

interface Props {
  events: Array<
    CollectionEntry<"creations">["data"] & {
      id: string;
    }
  >;
}

export function EventsView({ events }: Props) {
  const upcomingEvents = useMemo(
    () => events.filter((creation) => creation.data.forthcoming),
    [events]
  );
  const pastEvents = useMemo(
    () => events.filter((creation) => !creation.data.forthcoming),
    [events]
  );

  return (
    <div className="eventsView">
      {upcomingEvents.length > 0 && (
        <div className="upcomingEvents">
          <h3>upcoming</h3>
          {upcomingEvents.map((event) => (
            <EventSummary
              key={event.id}
              event={{ id: event.id, ...event.data }}
            />
          ))}
        </div>
      )}
      {pastEvents.length > 0 && (
        <div className="pastEvents">
          <h3>past</h3>
          {pastEvents.map((event) => (
            <EventSummary
              key={event.id}
              event={{ id: event.id, ...event.data }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function EventsCarousel({ events }: Props) {
  return (
    <Carousel
      items={events}
      renderItem={(event) => (
        <EventSummary key={event.id} event={{ id: event.id, ...event.data }} />
      )}
      middleText="SPEAKING & WORKSHOPS"
    />
  );
}
