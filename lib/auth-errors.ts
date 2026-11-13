export type AuthConfigurationCategory =
  "profile_missing" | "role_missing" | "role_invalid" | "account_inactive" | "team_membership_missing";

export class AuthConfigurationError extends Error {
  constructor(
    public readonly category: AuthConfigurationCategory,
    message: string,
  ) {
    super(message);
    this.name = "AuthConfigurationError";
  }
}

/** Required backend configuration is absent or invalid, rather than an account denial. */
export class AuthBackendConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthBackendConfigurationError";
  }
}
