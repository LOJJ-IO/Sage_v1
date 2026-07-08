import {
  LoginError,
  type LoginRequest,
  type LoginResponse,
} from "@/lib/auth/types";

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    throw new LoginError(
      "service_unavailable",
      "Sign-in is not configured yet. Set NEXT_PUBLIC_API_URL to connect to the backend."
    );
  }

  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (response.status === 401) {
    throw new LoginError(
      "invalid_credentials",
      "Incorrect username or PIN. Try again or ask your manager for help."
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

export function storeAuthToken(token: string) {
  sessionStorage.setItem("sage_access_token", token);
}

export function clearAuthToken() {
  sessionStorage.removeItem("sage_access_token");
}
