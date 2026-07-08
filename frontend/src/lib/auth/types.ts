export type UserRole = "admin" | "staff";

export type LoginRequest = {
  username: string;
  pin: string;
};

export type LoginSuccessResponse = {
  access_token: string;
  token_type: "bearer";
  role: UserRole;
  must_change_pin: false;
};

export type LoginMustChangePinResponse = {
  access_token: string;
  token_type: "bearer";
  role: UserRole;
  must_change_pin: true;
};

export type LoginResponse = LoginSuccessResponse | LoginMustChangePinResponse;

export type LoginErrorCode =
  | "invalid_credentials"
  | "account_locked"
  | "account_inactive"
  | "service_unavailable";

export class LoginError extends Error {
  code: LoginErrorCode;

  constructor(code: LoginErrorCode, message: string) {
    super(message);
    this.name = "LoginError";
    this.code = code;
  }
}

export const PIN_LENGTH = 4;
