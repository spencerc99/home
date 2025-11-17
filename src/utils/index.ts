export const shuffleArray = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
};

export function stringToColor(
  str: string,
  {
    saturation = 100,
    lightness = 50,
    alpha = 1,
  }: { saturation?: number; lightness?: number; alpha?: number } = {}
) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return `hsla(${hash % 360}, ${saturation}%, ${lightness}%, ${alpha})`;
}

export function formatDateRange(startDate: Date, endDate: Date) {
  const startMonth = startDate.getMonth();
  const endMonth = endDate.getMonth();
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  // Same year cases
  if (startYear === endYear) {
    // Same month
    if (startMonth === endMonth) {
      return `${startDate.toLocaleDateString("en-us", {
        month: "long",
      })} ${startDate.getDate()}-${endDate.getDate()}, ${startYear}`;
    }
    // Different months, same year
    return `${startDate.toLocaleDateString("en-us", {
      month: "long",
    })} ${startDate.getDate()}-${endDate.toLocaleDateString("en-us", {
      month: "long",
    })} ${endDate.getDate()}, ${startYear}`;
  }

  // Different years
  return `${startDate.toLocaleDateString("en-us", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })} - ${endDate.toLocaleDateString("en-us", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;
}

/**
 * Formats a date or date range in a compact numeric format (MM/DD or MM/DD-MM/DD)
 * Uses 2-digit years (25/26) and includes year when needed
 * Format examples: "12/10-12/12" or "12/10/25-01/10/26"
 */
export function formatCompactDateRange(
  startDate: Date,
  endDate?: Date | null
): string {
  const currentYear = new Date().getFullYear();
  const startYear = startDate.getFullYear();
  const startYearShort = startYear % 100; // Get last 2 digits
  const startMonth = startDate.getMonth() + 1; // getMonth() returns 0-11
  const startDay = startDate.getDate();

  if (!endDate) {
    // Single date - include year if not current year
    const yearSuffix =
      startYear !== currentYear ? `/${startYearShort}` : "";
    return `${startMonth}/${startDay}${yearSuffix}`;
  }

  const endYear = endDate.getFullYear();
  const endYearShort = endYear % 100;
  const endMonth = endDate.getMonth() + 1;
  const endDay = endDate.getDate();

  // Same year
  if (startYear === endYear) {
    const yearSuffix =
      startYear !== currentYear ? `/${startYearShort}` : "";
    
    // Same month
    if (startMonth === endMonth) {
      return `${startMonth}/${startDay}-${endDay}${yearSuffix}`;
    }
    // Different months, same year
    return `${startMonth}/${startDay}-${endMonth}/${endDay}${yearSuffix}`;
  }

  // Different years - include 2-digit year for both
  return `${startMonth}/${startDay}/${startYearShort}-${endMonth}/${endDay}/${endYearShort}`;
}
