import { z } from "zod";

const mockFlag = process.env.NEXT_PUBLIC_USE_MOCK;

if (mockFlag !== undefined && mockFlag !== "true" && mockFlag !== "false") {
  throw new Error('NEXT_PUBLIC_USE_MOCK must be either "true" or "false".');
}

export const isDemoMode = mockFlag !== "false";

type RequestOptions<T> = {
  path: string;
  schema: z.ZodType<T>;
  query?: Record<string, string | number>;
  mock: () => unknown;
};

export async function requestValidated<T>({
  path,
  schema,
  query,
  mock,
}: RequestOptions<T>): Promise<T> {
  if (isDemoMode) {
    return schema.parse(mock());
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is required when demo mode is disabled.");
  }

  const url = new URL(path.replace(/^\//, ""), `${baseUrl.replace(/\/+$/, "")}/`);
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed for ${path} (${response.status} ${response.statusText}).`);
  }

  const payload: unknown = await response.json();
  return schema.parse(payload);
}
