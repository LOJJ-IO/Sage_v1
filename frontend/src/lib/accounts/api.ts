import { apiFetch, ApiError, getApiBaseUrl } from "@/lib/api/client";
import type {
  Account,
  AdminPrivilegesRequest,
  CreateAccountRequest,
  CreateAccountResponse,
  ResetPinRequest,
  ResetPinResponse,
} from "@/lib/accounts/types";

export const DEMO_ACCOUNTS: Account[] = [
  {
    id: "demo-1",
    name: "Alex Chen",
    username: "alex",
    role: "admin",
    is_primary_admin: true,
    is_active: true,
    created_at: "2026-06-01T10:00:00.000Z",
  },
  {
    id: "demo-2",
    name: "Maria Lopez",
    username: "maria",
    role: "staff",
    is_primary_admin: false,
    is_active: true,
    created_at: "2026-06-15T14:30:00.000Z",
  },
  {
    id: "demo-3",
    name: "Jordan Kim",
    username: "jordan",
    role: "admin",
    is_primary_admin: false,
    is_active: true,
    created_at: "2026-07-01T09:00:00.000Z",
  },
  {
    id: "demo-4",
    name: "Sam Rivera",
    username: "sam",
    role: "staff",
    is_primary_admin: false,
    is_active: false,
    created_at: "2026-05-20T11:00:00.000Z",
  },
];

export function isDemoMode() {
  return !getApiBaseUrl();
}

export async function listAccounts(): Promise<Account[]> {
  if (isDemoMode()) {
    return structuredClone(DEMO_ACCOUNTS);
  }

  return apiFetch<Account[]>("/accounts");
}

export async function createAccount(
  request: CreateAccountRequest
): Promise<CreateAccountResponse> {
  if (isDemoMode()) {
    const usernameTaken = DEMO_ACCOUNTS.some(
      (account) => account.username === request.username
    );

    if (usernameTaken) {
      throw new ApiError(409, "That username is already in use.");
    }

    const account: Account = {
      id: `demo-${crypto.randomUUID()}`,
      name: request.name,
      username: request.username,
      role: request.grant_admin ? "admin" : "staff",
      is_primary_admin: false,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    DEMO_ACCOUNTS.unshift(account);
    return structuredClone(account);
  }

  return apiFetch<CreateAccountResponse>("/accounts", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function resetAccountPin(
  accountId: string,
  request: ResetPinRequest
): Promise<ResetPinResponse> {
  if (isDemoMode()) {
    const account = DEMO_ACCOUNTS.find((item) => item.id === accountId);

    if (!account) {
      throw new ApiError(404, "Account not found.");
    }

    return { id: account.id, must_change_pin: true };
  }

  return apiFetch<ResetPinResponse>(`/accounts/${accountId}/reset-pin`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function deactivateAccount(accountId: string): Promise<void> {
  if (isDemoMode()) {
    const account = DEMO_ACCOUNTS.find((item) => item.id === accountId);

    if (!account) {
      throw new ApiError(404, "Account not found.");
    }

    if (account.is_primary_admin) {
      throw new ApiError(403, "The primary admin account cannot be deactivated.");
    }

    account.is_active = false;
    return;
  }

  await apiFetch<void>(`/accounts/${accountId}/deactivate`, {
    method: "POST",
  });
}

export async function reactivateAccount(accountId: string): Promise<void> {
  if (isDemoMode()) {
    const account = DEMO_ACCOUNTS.find((item) => item.id === accountId);

    if (!account) {
      throw new ApiError(404, "Account not found.");
    }

    account.is_active = true;
    return;
  }

  await apiFetch<void>(`/accounts/${accountId}/reactivate`, {
    method: "POST",
  });
}

export async function grantAdminPrivileges(
  accountId: string,
  request: AdminPrivilegesRequest
): Promise<Account> {
  if (isDemoMode()) {
    const account = DEMO_ACCOUNTS.find((item) => item.id === accountId);

    if (!account) {
      throw new ApiError(404, "Account not found.");
    }

    if (!account.is_active) {
      throw new ApiError(403, "Reactivate this account before granting admin access.");
    }

    if (account.role === "admin") {
      throw new ApiError(409, "This account already has admin privileges.");
    }

    account.role = "admin";
    return structuredClone(account);
  }

  return apiFetch<Account>(`/accounts/${accountId}/grant-admin`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function revokeAdminPrivileges(
  accountId: string,
  request: AdminPrivilegesRequest
): Promise<Account> {
  if (isDemoMode()) {
    const account = DEMO_ACCOUNTS.find((item) => item.id === accountId);

    if (!account) {
      throw new ApiError(404, "Account not found.");
    }

    if (account.is_primary_admin) {
      throw new ApiError(
        403,
        "The primary admin account cannot have admin privileges removed."
      );
    }

    if (account.role !== "admin") {
      throw new ApiError(409, "This account is not an admin.");
    }

    account.role = "staff";
    return structuredClone(account);
  }

  return apiFetch<Account>(`/accounts/${accountId}/revoke-admin`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export { ApiError };
