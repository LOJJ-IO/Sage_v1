import {
  LoginError,
  type LoginRequest,
  type LoginResponse,
} from "@/lib/auth/types";

/** Local demo credentials when NEXT_PUBLIC_API_URL is unset. */
const DEMO_USERNAME = "sage";
const DEMO_PIN = "1234";

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
}

async function loginWithDemoStub(
  request: LoginRequest
): Promise<LoginResponse> {
  await new Promise((resolve) => setTimeout(resolve, 250));

  if (
    request.username.toLowerCase() === DEMO_USERNAME &&
    request.pin === DEMO_PIN
  ) {
    return {
      access_token: "demo-access-token",
      token_type: "bearer",
      role: "admin",
      must_change_pin: false,
    };
  }

  throw new LoginError(
    "invalid_credentials",
    "Incorrect username or passcode."
  );
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    return loginWithDemoStub(request);
  }

  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (response.status === 401) {
    throw new LoginError(
      "invalid_credentials",
      "Incorrect username or passcode."
    );
  }

  if (response.status === 423) {
    throw new LoginError(
      "account_locked",
      "This account is temporarily locked after too many failed attempts. Try again in 15 minutes or ask your manager to reset your PIN."
    );
  }

  if (response.status === 403) {
    throw new LoginError(
      "account_inactive",
      "This account has been deactivated. Ask your manager to reactivate it."
    );
  }

  if (!response.ok) {
    throw new LoginError(
      "service_unavailable",
      "Unable to sign in right now. Check your connection and try again."
    );
  }

  return response.json() as Promise<LoginResponse>;
}

const ACCESS_TOKEN_KEY = "sage_access_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function storeAuthToken(token: string) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAuthToken() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}
