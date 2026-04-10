// ABOUTME: Renders upcoming and past events in a scannable list format.
// ABOUTME: Splits events by forthcoming status, grouped by year with headers.
import type { CollectionEntry } from "astro:content";
import React, { useMemo } from "react";
import { isEventForthcoming, formatCompactDateRange } from "../../utils";
import "./EventsView.scss";

interface Props {
  events: Array<CollectionEntry<"creation">>;
}

function groupByYear(
  events: Props["events"]
): Array<{ year: string; events: Props["events"] }> {
  const groups: Map<string, Props["events"]> = new Map();
  for (const event of events) {
    const year = event.data.date
      ? String(new Date(event.data.date).getFullYear())
      : "TBD";
    if (!groups.has(year)) {
      groups.set(year, []);
    }
    groups.get(year)!.push(event);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === "TBD") return -1;
      if (b === "TBD") return 1;
      return Number(b) - Number(a);
    })
    .map(([year, events]) => ({ year, events }));
}

function EventList({ events }: { events: Props["events"] }) {
  const yearGroups = useMemo(() => groupByYear(events), [events]);

  return (
    <div className="event-list">
      {yearGroups.map(({ year, events }) => (
        <div key={year} className="event-year-group">
          <h4 className="year-header">{year}</h4>
          <ul>
            {events.map((event) => (
              <li key={event.id}>
                {event.data.date && (
                  <span className="event-meta">
                    <b>
                      {event.data.location && `[${event.data.location}] `}
                    </b>
                    {formatCompactDateRange(
                      new Date(event.data.date),
                      event.data.endDate
                        ? new Date(event.data.endDate)
                        : null
                    )}
                    {event.data.institution && (
                      <> ({event.data.institution[0]})</>
                    )}
                  </span>
                )}
                <p>
                  {event.data.link ? (
                    <a href={event.data.link}>{event.data.title}</a>
                  ) : (
                    event.data.title
                  )}
                  {event.data.subtext && (
                    <span className="descriptionText">
                      {" "}
                      {event.data.subtext}
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function hasEnoughInfo(event: Props["events"][number]): boolean {
  return Boolean(event.data.date || event.data.link || event.data.location);
}

export function EventsView({ events }: Props) {
  const visibleEvents = useMemo(
    () => events.filter(hasEnoughInfo),
    [events]
  );
  const upcomingEvents = useMemo(
    () =>
      visibleEvents.filter((event) =>
        isEventForthcoming(event.data.date, event.data.endDate, event.data.forthcoming)
      ),
    [visibleEvents]
  );
  const pastEvents = useMemo(
    () =>
      visibleEvents.filter(
        (event) =>
          !isEventForthcoming(event.data.date, event.data.endDate, event.data.forthcoming)
      ),
    [visibleEvents]
  );

  return (
    <div className="eventsView">
      {upcomingEvents.length > 0 && (
        <section className="events-section upcoming">
          <h3>upcoming</h3>
          <EventList events={upcomingEvents} />
        </section>
      )}
      {pastEvents.length > 0 && (
        <section className="events-section past">
          <h3>past</h3>
          <EventList events={pastEvents} />
        </section>
      )}
    </div>
  );
}
