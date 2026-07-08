import type { UserRole } from "@/lib/auth/types";

const ROLE_STORAGE_KEY = "sage_user_role";

export function storeUserRole(role: UserRole) {
  sessionStorage.setItem(ROLE_STORAGE_KEY, role);
}

export function getUserRole(): UserRole | null {
  const role = sessionStorage.getItem(ROLE_STORAGE_KEY);
  if (role === "admin" || role === "staff") {
    return role;
  }

  return null;
}

export function clearUserRole() {
  sessionStorage.removeItem(ROLE_STORAGE_KEY);
}
