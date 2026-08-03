import { getAuthToken } from "@/lib/auth/login";

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
}

export { getAuthToken };

type ApiFetchOptions = RequestInit & {
  auth?: boolean;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  { auth = true, headers, ...init }: ApiFetchOptions = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    throw new ApiError(
      0,
      "API is not configured. Set NEXT_PUBLIC_API_URL to connect to the backend."
    );
  }

  const requestHeaders = new Headers(headers);

  // FormData sets its own multipart boundary in the Content-Type header —
  // letting fetch do it. Only JSON bodies need an explicit Content-Type.
  if (
    !requestHeaders.has("Content-Type") &&
    init.body &&
    !(init.body instanceof FormData)
  ) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getAuthToken();

    if (!token) {
      throw new ApiError(401, "You must be signed in to perform this action.");
    }

    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: requestHeaders,
  });

  if (!response.ok) {
    let message = "Something went wrong. Try again.";

    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) {
        message = payload.detail;
      }
    } catch {
      // Ignore malformed error bodies.
    }

    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
