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
