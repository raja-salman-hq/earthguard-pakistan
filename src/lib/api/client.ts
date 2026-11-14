import { z } from "zod";

const mockFlag = process.env.NEXT_PUBLIC_USE_MOCK;

if (mockFlag !== undefined && mockFlag !== "true" && mockFlag !== "false") {
  throw new Error('NEXT_PUBLIC_USE_MOCK must be either "true" or "false".');
}

export const isDemoMode = mockFlag === "true";

export const API_REQUEST_SLOW_EVENT = "earthguard:api-request-slow";
export const API_REQUEST_FINISHED_EVENT = "earthguard:api-request-finished";

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
  mock: () => unknown;
  real: () => Promise<unknown>;
};

function validateResponse<T>(
  payload: unknown,
  schema: z.ZodType<T>,
  path: string,
): T {
  const result = schema.safeParse(payload);
  if (result.success) {
    return result.data;
  }

  if (process.env.NODE_ENV === "development") {
    console.error(`Data response validation failed for ${path}.`, result.error.issues);
  }

  throw new ApiError(
    null,
    path,
    "The data file contains an unexpected response. Please check the published data.",
  );
}

export async function readStaticJson(path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { headers: { Accept: "application/json" }, cache: "force-cache" });
  } catch {
    throw new ApiError(
      null,
      path,
      "The static data file could not be reached. Please try again.",
    );
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      path,
      `The static data file request failed (${response.status}).`,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new ApiError(response.status, path, "The static data file contains invalid JSON.");
  }
}

export async function requestValidated<T>({
  path,
  schema,
  mock,
  real,
}: RequestOptions<T>): Promise<T> {
  const payload = isDemoMode ? mock() : await real();
  return validateResponse(payload, schema, path);
}
