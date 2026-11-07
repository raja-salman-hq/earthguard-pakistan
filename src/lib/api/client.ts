import { z } from "zod";

const mockFlag = process.env.NEXT_PUBLIC_USE_MOCK;
const REQUEST_TIMEOUT_MS = 20_000;
const COLD_START_DELAY_MS = 4_000;
const RETRY_DELAYS_MS = [300, 700];
let nextRequestId = 0;

export const API_REQUEST_SLOW_EVENT = "earthguard:api-request-slow";
export const API_REQUEST_FINISHED_EVENT = "earthguard:api-request-finished";

if (mockFlag !== undefined && mockFlag !== "true" && mockFlag !== "false") {
  throw new Error('NEXT_PUBLIC_USE_MOCK must be either "true" or "false".');
}

export const isDemoMode = mockFlag !== "false";

export class ApiError extends Error {
  readonly status: number | null;
  readonly path: string;

  constructor(status: number | null, path: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
  }
}

type RequestOptions<T> = {
  path: string;
  schema: z.ZodType<T>;
  query?: Record<string, string | number>;
  mock: () => unknown;
};

function validateResponse<T>(
  payload: unknown,
  schema: z.ZodType<T>,
  path: string,
  status: number | null,
): T {
  const result = schema.safeParse(payload);
  if (result.success) {
    return result.data;
  }

  if (process.env.NODE_ENV === "development") {
    console.error(`API response validation failed for ${path}.`, result.error.issues);
  }

  throw new ApiError(
    status,
    path,
    "The data server returned an unexpected response. Please try again later.",
  );
}

function isRetryableStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function notifyRequestEvent(name: string, requestId: number): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(name, { detail: { requestId } }));
  }
}

export async function requestValidated<T>({
  path,
  schema,
  query,
  mock,
}: RequestOptions<T>): Promise<T> {
  if (isDemoMode) {
    return validateResponse(mock(), schema, path, null);
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new ApiError(
      null,
      path,
      "NEXT_PUBLIC_API_URL is required when demo mode is disabled.",
    );
  }

  let url: URL;
  try {
    url = new URL(path.replace(/^\//, ""), `${baseUrl.replace(/\/+$/, "")}/`);
    for (const [key, value] of Object.entries(query ?? {})) {
      url.searchParams.set(key, String(value));
    }
  } catch {
    throw new ApiError(null, path, "The configured data server URL is invalid.");
  }

  const requestId = ++nextRequestId;
  let wakeupTimer: ReturnType<typeof setTimeout> | undefined;
  if (typeof window !== "undefined") {
    wakeupTimer = setTimeout(
      () => notifyRequestEvent(API_REQUEST_SLOW_EVENT, requestId),
      COLD_START_DELAY_MS,
    );
  }

  try {
    for (let attempt = 0; ; attempt += 1) {
      const controller = new AbortController();
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          if (isRetryableStatus(response.status) && attempt < RETRY_DELAYS_MS.length) {
            await wait(RETRY_DELAYS_MS[attempt]);
            continue;
          }
          throw new ApiError(
            response.status,
            path,
            `The data server request failed (${response.status}). Please try again.`,
          );
        }

        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          throw new ApiError(
            response.status,
            path,
            "The data server returned invalid JSON. Please try again later.",
          );
        }

        return validateResponse(payload, schema, path, response.status);
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }

        if (timedOut && attempt < RETRY_DELAYS_MS.length) {
          await wait(RETRY_DELAYS_MS[attempt]);
          continue;
        }
        if (timedOut) {
          throw new ApiError(
            null,
            path,
            "The data server took too long to respond. Please try again.",
          );
        }

        if (attempt < RETRY_DELAYS_MS.length) {
          await wait(RETRY_DELAYS_MS[attempt]);
          continue;
        }
        throw new ApiError(
          null,
          path,
          "The data server could not be reached. Check your connection and try again.",
        );
      } finally {
        clearTimeout(timeout);
      }
    }
  } finally {
    if (wakeupTimer !== undefined) {
      clearTimeout(wakeupTimer);
    }
    notifyRequestEvent(API_REQUEST_FINISHED_EVENT, requestId);
  }
}
