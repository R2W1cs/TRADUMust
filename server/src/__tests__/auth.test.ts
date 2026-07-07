import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "../lib/jwt.js";

describe("JWT", () => {
  it("signs and verifies tokens", () => {
    const payload = { userId: "test-id", email: "test@test.com", role: "USER" as const };
    const token = signToken(payload);
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
  });
});

describe("Gamification XP", () => {
  it("calculates level from XP", () => {
    const XP_PER_LEVEL = 500;
    expect(Math.floor(0 / XP_PER_LEVEL) + 1).toBe(1);
    expect(Math.floor(500 / XP_PER_LEVEL) + 1).toBe(2);
    expect(Math.floor(1200 / XP_PER_LEVEL) + 1).toBe(3);
  });
});
