import { clearAuthToken } from "@/lib/auth/login";
import type { UserRole } from "@/lib/auth/types";

const ROLE_STORAGE_KEY = "sage_user_role";
const USERNAME_STORAGE_KEY = "sage_username";

export function storeUserRole(role: UserRole) {
  sessionStorage.setItem(ROLE_STORAGE_KEY, role);
}

export function getUserRole(): UserRole | null {
  if (typeof window === "undefined") {
    return null;
  }

  const role = sessionStorage.getItem(ROLE_STORAGE_KEY);
  if (role === "admin" || role === "staff") {
    return role;
  }

  return null;
}

export function clearUserRole() {
  sessionStorage.removeItem(ROLE_STORAGE_KEY);
}

/** Captured from the sign-in form at login — the backend doesn't echo it back in LoginResponse. */
export function storeUsername(username: string) {
  sessionStorage.setItem(USERNAME_STORAGE_KEY, username);
}

export function getCurrentUsername(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return sessionStorage.getItem(USERNAME_STORAGE_KEY);
}

export function clearUsername() {
  sessionStorage.removeItem(USERNAME_STORAGE_KEY);
}

export function signOut() {
  clearAuthToken();
  clearUserRole();
  clearUsername();
}
