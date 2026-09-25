import { renderBrandIcon } from "@/lib/brand-icon";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/**
 * Regenerated at most every five minutes, matching how long the branding row
 * is cached. Without this the icon would be baked at build time and a new
 * logo would never reach the tab.
 */
export const revalidate = 300;

export default function Icon() {
  return renderBrandIcon(size.width);
}
