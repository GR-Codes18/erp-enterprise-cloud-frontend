import { describe, expect, it } from "vitest";
import { loginSchema } from "./schema";

describe("loginSchema", () => {
  it("acepta un correo y contraseña válidos", () => {
    const result = loginSchema.safeParse({
      email: "admin@enterprise.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza un correo con formato inválido", () => {
    const result = loginSchema.safeParse({
      email: "correo-invalido",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza campos vacíos", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});