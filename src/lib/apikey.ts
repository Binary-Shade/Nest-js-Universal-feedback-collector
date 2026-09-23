import { randomBytes } from "crypto";

const PREFIX = "fb_";

/**
 * Generates a new API key like `fb_a1b2c3...` (32 hex chars after the prefix).
 */
export function generateApiKey(): string {
  return PREFIX + randomBytes(24).toString("hex");
}

export function last4(apiKey: string): string {
  return apiKey.slice(-4);
}

export function isValidApiKeyFormat(key: string): boolean {
  return typeof key === "string" && key.startsWith(PREFIX) && key.length >= 10;
}
