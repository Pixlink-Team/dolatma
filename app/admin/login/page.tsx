import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { getLoginPageSettingsAction } from "@/lib/actions/login-page-settings-actions";
import {
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_TITLE,
  resolveSiteBaseUrl,
} from "@/lib/campaign-metadata";
import {
  buildPublicPageMetadata,
  buildWebApplicationJsonLd,
  buildWebsiteJsonLd,
} from "@/lib/site-seo";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, baseUrl] = await Promise.all([
    getLoginPageSettingsAction(),
    resolveSiteBaseUrl(),
  ]);

  const title = settings.title?.trim() || DEFAULT_SITE_TITLE;
  const description =
    settings.subtitle?.trim() ||
    settings.footer?.trim() ||
    DEFAULT_SITE_DESCRIPTION;

  return {
    ...buildPublicPageMetadata({
      title,
      description,
      path: "/admin/login",
      baseUrl,
    }),
    openGraph: {
      type: "website",
      locale: "fa_IR",
      url: `${baseUrl}/admin/login`,
      title,
      description,
      siteName: DEFAULT_SITE_TITLE,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function AdminLoginPage() {
  const [settings, baseUrl] = await Promise.all([
    getLoginPageSettingsAction(),
    resolveSiteBaseUrl(),
  ]);

  const title = settings.title?.trim() || DEFAULT_SITE_TITLE;
  const description =
    settings.subtitle?.trim() ||
    settings.footer?.trim() ||
    DEFAULT_SITE_DESCRIPTION;

  return (
    <>
      <JsonLdScript
        data={[
          buildWebsiteJsonLd({
            baseUrl,
            title: DEFAULT_SITE_TITLE,
            description: DEFAULT_SITE_DESCRIPTION,
            path: "/",
          }),
          buildWebApplicationJsonLd({
            baseUrl,
            title,
            description,
            path: "/admin/login",
          }),
        ]}
      />
      <Suspense fallback={null}>
        <AdminLoginForm settings={settings} />
      </Suspense>
    </>
  );
}
