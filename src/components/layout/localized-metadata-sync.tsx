"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useMessages } from "@/hooks/use-messages";
import { getLocalizedPageCopyForPath } from "@/lib/site-metadata";
import { useUiStore } from "@/store/ui-store";

export function LocalizedMetadataSync() {
  const pathname = usePathname();
  const language = useUiStore((state) => state.language);
  const messages = useMessages();
  const pageCopy = getLocalizedPageCopyForPath(pathname, language);
  const title = pageCopy?.title ?? messages.notFoundTitle;
  const description = pageCopy?.description ?? messages.notFoundDescription;

  useEffect(() => {
    if (document.title !== title) {
      document.title = title;
    }

    const metadata = [
      ['meta[name="description"]', description],
      ['meta[property="og:title"]', title],
      ['meta[property="og:description"]', description],
      ['meta[property="og:locale"]', language === "ur" ? "ur_PK" : "en_US"],
      ['meta[name="twitter:title"]', title],
      ['meta[name="twitter:description"]', description],
    ] as const;

    for (const [selector, content] of metadata) {
      const element = document.head.querySelector<HTMLMetaElement>(selector);
      if (element && element.content !== content) {
        element.content = content;
      }
    }
  }, [description, language, messages.notFoundDescription, messages.notFoundTitle, pathname, title]);

  return null;
}
