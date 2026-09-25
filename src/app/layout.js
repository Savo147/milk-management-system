import { Geist, Geist_Mono } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "@/theme";
import { getPublicBranding } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * The browser tab's name. The icon is not set here — app/icon.js draws the
 * logo as a round PNG and Next links it automatically; listing it here as
 * well would put two competing icons in the head.
 *
 * Read from business_settings rather than hard-coded, so renaming the dairy
 * in Settings renames every tab. getPublicBranding is cached under the
 * "branding" tag, which Settings clears on save.
 */
export async function generateMetadata() {
  const { dairy_name } = await getPublicBranding();

  return {
    title: {
      default: `${dairy_name} — Milk Management`,
      // Pages give their own short title; the dairy's name is appended here
      // so it is written down in one place.
      template: `%s — ${dairy_name}`,
    },
    description: "Dairy milk delivery and monthly billing management",
  };
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
