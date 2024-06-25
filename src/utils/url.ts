export function withQueryParams(url: string, params: Record<string, any>) {
  const urlObj = new URL(url);
  Object.entries(params).forEach(([key, value]) =>
    urlObj.searchParams.set(key, value)
  );
  return urlObj.toString();
}
