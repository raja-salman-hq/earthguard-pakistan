import type { Metadata } from "next";
import { messages, type Language, type MessageKey } from "@/lib/i18n";

export const siteUrl = new URL(
  process.env.SITE_URL ?? "https://earthguard-pakistan.example",
);

export type PageName = "home" | "explore" | "compare" | "about";

type PageMetadataConfig = {
  path: string;
  title: MessageKey;
  description: MessageKey;
};

const pageMetadata = {
  home: {
    path: "/",
    title: "seoHomeTitle",
    description: "seoHomeDescription",
  },
  explore: {
    path: "/explore",
    title: "seoExploreTitle",
    description: "seoExploreDescription",
  },
  compare: {
    path: "/compare",
    title: "seoCompareTitle",
    description: "seoCompareDescription",
  },
  about: {
    path: "/about",
    title: "seoAboutTitle",
    description: "seoAboutDescription",
  },
} satisfies Record<PageName, PageMetadataConfig>;

export type LocalizedPageCopy = {
  title: string;
  description: string;
};

export function getLocalizedPageCopy(
  page: PageName,
  language: Language,
): LocalizedPageCopy {
  const copy = messages[language];
  const config = pageMetadata[page];
  return {
    title: copy[config.title],
    description: copy[config.description],
  };
}

export function getLocalizedPageCopyForPath(
  pathname: string,
  language: Language,
): LocalizedPageCopy | undefined {
  const page = Object.entries(pageMetadata).find(([, config]) => config.path === pathname);
  return page ? getLocalizedPageCopy(page[0] as PageName, language) : undefined;
}

export function getPageMetadata(page: PageName): Metadata {
  const { title, description } = getLocalizedPageCopy(page, "en");
  const config = pageMetadata[page];
  const canonical = new URL(config.path, siteUrl);
  const socialImage = {
    url: "/opengraph-image",
    width: 1200,
    height: 630,
    alt: title,
  };

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical,
      languages: {
        en: `${canonical}?language=en`,
        ur: `${canonical}?language=ur`,
      },
    },
    openGraph: {
      type: "website",
      siteName: "EarthGuard Pakistan",
      locale: "en_US",
      url: canonical,
      title,
      description,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}
