import type { UserRole } from "@/lib/auth/types";

export type Account = {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  is_primary_admin: boolean;
  is_active: boolean;
  created_at: string;
};

export type CreateAccountRequest = {
  name: string;
  username: string;
  temporary_pin: string;
  grant_admin: boolean;
  admin_pin?: string;
};

export type ResetPinRequest = {
  temporary_pin: string;
};

export type AdminPrivilegesRequest = {
  admin_pin: string;
};

export type AdminPrivilegesMode = "grant" | "revoke";

export type CreateAccountResponse = Account;

export type ResetPinResponse = {
  id: string;
  must_change_pin: true;
};
