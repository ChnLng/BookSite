import { describe, expect, it } from "vitest";
import { authErrorMessage } from "../src/lib/auth-messages";

describe("authentication feedback", () => {
  it("distinguishes an unconfirmed email from wrong credentials", () => {
    expect(authErrorMessage({ code: "email_not_confirmed" })).toContain("Confirmez d’abord");
    expect(authErrorMessage({ code: "invalid_credentials" })).toContain("e-mail ou le mot de passe");
  });
  it("does not expose raw provider or infrastructure details", () => {
    expect(authErrorMessage({ message: "internal SMTP secret detail" })).not.toContain("secret");
    expect(authErrorMessage({ message: "database host example.internal unavailable" })).not.toContain("example.internal");
  });
});
