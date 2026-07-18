import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import { ThemedToaster } from "@/components/themed-toaster";
import { buildCampaignMetadata } from "@/lib/campaign-metadata";
import { pgGetAllCampaigns } from "@/lib/db/repository";
import { isPostgresConfigured } from "@/lib/utils";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-sans",
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
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${vazirmatn.className} min-h-screen bg-background text-foreground antialiased`}>
        {children}
        <ThemedToaster />
      </body>
    </html>
  );
}
