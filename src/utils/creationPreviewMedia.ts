// ABOUTME: Chooses still images used while creation summary video previews load.
// ABOUTME: Keeps media fallback rules shared by summary preview renderers.
type MediaType = "image" | "video";

interface ProgressivePreviewImageOptions {
  media?: readonly string[];
  mediaMetadata?: readonly MediaType[];
  assetPreviewIdx?: number;
}

function isVideoMedia(mediaUrl: string, mediaType?: MediaType): boolean {
  return mediaType === "video" || /\.(mp4|mov|webm)(?:[?#].*)?$/i.test(mediaUrl);
}

export function getProgressivePreviewImage({
  media,
  mediaMetadata,
  assetPreviewIdx = 0,
}: ProgressivePreviewImageOptions): string | null {
  const selectedMedia = media?.[assetPreviewIdx];
  const selectedMediaType = mediaMetadata?.[assetPreviewIdx];

  if (selectedMedia && !isVideoMedia(selectedMedia, selectedMediaType)) {
    return selectedMedia;
  }

  return (
    media?.find(
      (mediaUrl, index) => !isVideoMedia(mediaUrl, mediaMetadata?.[index]),
    ) ?? null
  );
}
