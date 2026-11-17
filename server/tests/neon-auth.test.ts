import { beforeAll, describe, expect, it } from "vitest";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from "jose";
import { verifyNeonToken } from "../src/auth/neon";
import { config } from "../src/config";
let pair: Awaited<ReturnType<typeof generateKeyPair>>;
let keys: ReturnType<typeof createLocalJWKSet>;
beforeAll(async () => {
  pair = await generateKeyPair("RS256");
  keys = createLocalJWKSet({ keys: [{ ...await exportJWK(pair.publicKey), kid: "test" }] });
  config.neon.authIssuer = "https://auth.psysim.test";
  config.neon.authAudience = "psysim";
});
async function token(overrides: Record<string, unknown> = {}) {
  return new SignJWT({ sub: "account-a", iss: config.neon.authIssuer, aud: "psysim", iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+60, ...overrides })
    .setProtectedHeader({ alg: "RS256", kid: "test" }).sign(pair.privateKey);
}
describe("Neon JWT trust boundary", () => {
  it("accepts a valid signed identity", async () => {
    expect((await verifyNeonToken(await token(), keys)).sub).toBe("account-a");
  });
  it.each([{ exp: 1 }, { iss: "https://attacker.test" }, { aud: "another-app" }, { sub: "anonymous" }, { exp: undefined }, { sub: undefined }])("rejects invalid required claims %j", async claims => {
    await expect(verifyNeonToken(await token(claims), keys)).rejects.toThrow();
  });
  it("rejects a changed payload and malformed tokens", async () => {
    const signed = await token();
    const parts = signed.split(".");
    parts[1] = Buffer.from(JSON.stringify({ sub: "account-b" })).toString("base64url");
    await expect(verifyNeonToken(parts.join("."), keys)).rejects.toThrow();
    await expect(verifyNeonToken("invalid", keys)).rejects.toThrow();
  });
});
