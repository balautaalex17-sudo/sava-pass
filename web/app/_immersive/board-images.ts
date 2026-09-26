import { getImageProps } from "next/image";
import { escapeHtml } from "@/lib/escape-html";

/** Next's responsive image URLs, adapted to the existing server-rendered HTML. */
export function clubImage(
  photo: { src: string; width: number; height: number; alt: string },
  sizes: string,
  { deferred = false, position = "50% 50%" } = {},
) {
  const { src, width, height, alt } = photo;
  const { props } = getImageProps({ src, width, height, alt, sizes });
  const prefix = deferred ? "data-" : "";
  return `<img ${prefix}src="${escapeHtml(props.src)}" ${prefix}srcset="${escapeHtml(props.srcSet ?? "")}" sizes="${escapeHtml(sizes)}"
    alt="${escapeHtml(photo.alt)}" width="${photo.width}" height="${photo.height}"
    style="object-position:${escapeHtml(position)}" loading="lazy" decoding="async" draggable="false"/>`;
}
