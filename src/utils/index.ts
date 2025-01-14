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
