import type { Metadata } from "next";
import localFont from "next/font/local";
import { StalePageGuard } from "@/components/admin/stale-page-guard";
import { ThemedToaster } from "@/components/themed-toaster";
import { buildCampaignMetadata } from "@/lib/campaign-metadata";
import { pgGetAllCampaigns } from "@/lib/db/repository";
import { isPostgresConfigured } from "@/lib/utils";
import "./globals.css";

/** Vazirmatn FD: Latin digit codepoints render as Persian glyphs site-wide. */
const vazirmatn = localFont({
  src: [
    {
      path: "../node_modules/vazirmatn/misc/Farsi-Digits/fonts/webfonts/Vazirmatn-FD-Thin.woff2",
      weight: "100",
      style: "normal",
    },
    {
      path: "../node_modules/vazirmatn/misc/Farsi-Digits/fonts/webfonts/Vazirmatn-FD-ExtraLight.woff2",
      weight: "200",
      style: "normal",
    },
    {
      path: "../node_modules/vazirmatn/misc/Farsi-Digits/fonts/webfonts/Vazirmatn-FD-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../node_modules/vazirmatn/misc/Farsi-Digits/fonts/webfonts/Vazirmatn-FD-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/vazirmatn/misc/Farsi-Digits/fonts/webfonts/Vazirmatn-FD-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../node_modules/vazirmatn/misc/Farsi-Digits/fonts/webfonts/Vazirmatn-FD-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../node_modules/vazirmatn/misc/Farsi-Digits/fonts/webfonts/Vazirmatn-FD-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../node_modules/vazirmatn/misc/Farsi-Digits/fonts/webfonts/Vazirmatn-FD-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../node_modules/vazirmatn/misc/Farsi-Digits/fonts/webfonts/Vazirmatn-FD-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-vazirmatn",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  if (!isPostgresConfigured()) {
    return await buildCampaignMetadata(null, { path: "/" });
  }

  try {
    const campaigns = await pgGetAllCampaigns();
    const primary =
      campaigns.find((campaign) => campaign.published && campaign.status === "live") ??
      campaigns.find((campaign) => campaign.published) ??
      campaigns[0] ??
      null;
    return await buildCampaignMetadata(primary, { path: "/" });
  } catch {
    return await buildCampaignMetadata(null, { path: "/" });
  }
}

const themeInitScript = `
(function () {
  try {
    var theme = localStorage.getItem("theme");
    var root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${vazirmatn.className} min-h-screen bg-background font-sans text-foreground antialiased`}>
        <StalePageGuard />
        {children}
        <ThemedToaster />
      </body>
    </html>
  );
}
