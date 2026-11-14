"use client";

import { NoDataError } from "@/lib/api/static-data";
import { useMessages } from "@/hooks/use-messages";
import { getRegionLabel, getVariableLabel } from "@/lib/i18n";
import { useUiStore } from "@/store/ui-store";
import { regionIdSchema, variableIdSchema } from "@/types/api";

type NoDataNoticeProps = {
  error: unknown;
};

function getRequestedLabel(
  requestedLabel: string,
  language: "en" | "ur",
): string {
  const region = regionIdSchema.safeParse(requestedLabel);
  if (region.success) {
    return getRegionLabel(region.data, language);
  }
  const variable = variableIdSchema.safeParse(requestedLabel);
  if (variable.success) {
    return getVariableLabel(variable.data, language);
  }
  return requestedLabel;
}

export function NoDataNotice({ error }: NoDataNoticeProps) {
  const messages = useMessages();
  const language = useUiStore((state) => state.language);
  const setArea = useUiStore((state) => state.setArea);

  if (!(error instanceof NoDataError)) {
    return null;
  }

  return (
    <div className="no-data-notice" role="status">
      <p>
        {messages.noDataYet.replace(
          "{area}",
          getRequestedLabel(error.requestedLabel, language),
        )}
      </p>
      <button type="button" onClick={() => setArea("faisalabad")}>
        {messages.selectFaisalabad}
      </button>
    </div>
  );
}
