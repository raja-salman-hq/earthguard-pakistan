"use client";

import { useEffect, useState } from "react";
import { useMessages } from "@/hooks/use-messages";
import {
  API_REQUEST_FINISHED_EVENT,
  API_REQUEST_SLOW_EVENT,
  isDemoMode,
} from "@/lib/api/client";

function getRequestId(event: Event): number | undefined {
  if (!(event instanceof CustomEvent)) {
    return undefined;
  }

  const detail: unknown = event.detail;
  if (
    typeof detail !== "object" ||
    detail === null ||
    !("requestId" in detail) ||
    typeof detail.requestId !== "number"
  ) {
    return undefined;
  }

  return detail.requestId;
}

export function ApiWakeupNotice() {
  const messages = useMessages();
  const [isWaking, setIsWaking] = useState(false);

  useEffect(() => {
    if (isDemoMode) {
      return;
    }

    const activeSlowRequests = new Set<number>();
    const onSlowRequest = (event: Event) => {
      const requestId = getRequestId(event);
      if (requestId === undefined) {
        return;
      }
      activeSlowRequests.add(requestId);
      setIsWaking(true);
    };
    const onFinishedRequest = (event: Event) => {
      const requestId = getRequestId(event);
      if (requestId === undefined) {
        return;
      }
      activeSlowRequests.delete(requestId);
      setIsWaking(activeSlowRequests.size > 0);
    };

    window.addEventListener(API_REQUEST_SLOW_EVENT, onSlowRequest);
    window.addEventListener(API_REQUEST_FINISHED_EVENT, onFinishedRequest);

    return () => {
      window.removeEventListener(API_REQUEST_SLOW_EVENT, onSlowRequest);
      window.removeEventListener(API_REQUEST_FINISHED_EVENT, onFinishedRequest);
    };
  }, []);

  if (isDemoMode || !isWaking) {
    return null;
  }

  return (
    <div className="api-wakeup-notice" role="status" aria-live="polite">
      {messages.apiWakingUp}
    </div>
  );
}
