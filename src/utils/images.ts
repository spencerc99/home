import { withQueryParams } from "./url";

const imgixUrl = "https://codaio.imgix.net";
// This is done in the importCreations script
export function transformImageUrl(url: string) {
  return url.replace("https://codahosted.io", imgixUrl);
}

// This is used in our components
export function maybeTransformImgixUrl(
  url: string,
  params: Record<string, string>
) {
  if (url.includes(imgixUrl)) {
    return withQueryParams(url, params);
  }
  return url;
}
