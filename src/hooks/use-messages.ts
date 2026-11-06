"use client";

import { messages } from "@/lib/i18n";
import { useUiStore } from "@/store/ui-store";

export function useMessages() {
  const language = useUiStore((state) => state.language);
  return messages[language];
}
