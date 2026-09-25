import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getPublicBranding } from "@/lib/auth";

/**
 * The dairy's logo, drawn as a round PNG for the browser tab.
 *
 * A favicon is painted by the browser's own chrome, where the page's CSS does
 * not reach — so a square image stays square however the logo is styled on
 * screen. The only way to get the round mark into the tab is to hand over an
 * image that is already round, which is what this does.
 *
 * The bytes are fetched here rather than left to ImageResponse: a logo URL
 * that 404s or times out would otherwise take the whole icon route down with
 * it, and a missing tab icon is a poor trade for a broken page.
 */
async function sourceImage() {
  const { logo_url } = await getPublicBranding();

  if (logo_url) {
    try {
      const res = await fetch(logo_url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const type = res.headers.get("content-type") ?? "image/png";
        const bytes = Buffer.from(await res.arrayBuffer());
        return `data:${type};base64,${bytes.toString("base64")}`;
      }
      console.warn(`[icon] logo_url returned HTTP ${res.status}`);
    } catch (err) {
      console.warn("[icon] could not fetch logo_url:", err?.message);
    }
  }

  // The copy shipped in /public, read off disk so this needs no origin and
  // cannot fail on the network.
  const file = await readFile(path.join(process.cwd(), "public", "logo.png"));
  return `data:image/png;base64,${file.toString("base64")}`;
}

export async function renderBrandIcon(size) {
  const src = await sourceImage();

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        // White behind it: a transparent logo on a dark tab bar would
        // otherwise show as a smudge.
        background: "#fff",
        borderRadius: "50%",
        overflow: "hidden",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        style={{ objectFit: "cover", borderRadius: "50%" }}
      />
    </div>,
    { width: size, height: size },
  );
}
