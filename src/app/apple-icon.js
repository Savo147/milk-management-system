import { renderBrandIcon } from "@/lib/brand-icon";

/** The size iOS wants when the app is added to a home screen. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const revalidate = 300;

export default function AppleIcon() {
  return renderBrandIcon(size.width);
}
