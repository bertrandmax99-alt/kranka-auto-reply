// Verify a GitHub Actions OIDC token, so the scheduler needs no shared secret:
// GitHub signs a short-lived JWT for each workflow run, and we only accept runs of our own
// workflow, on our own repo, on main.
import crypto from "node:crypto";

const ISSUER = "https://token.actions.githubusercontent.com";
export const AUDIENCE = "kranka-auto-reply";
export const REPO = "bertrandmax99-alt/kranka-auto-reply";

let jwksCache = { at: 0, keys: [] };

async function jwks() {
  if (Date.now() - jwksCache.at < 60 * 60 * 1000 && jwksCache.keys.length) return jwksCache.keys;
  const res = await fetch(`${ISSUER}/.well-known/jwks`);
  const { keys = [] } = await res.json();
  jwksCache = { at: Date.now(), keys };
  return keys;
}

const b64url = (s) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

// Returns the claims if the token is valid for our workflow, otherwise throws.
export async function verifyGithubOidc(token, now = Date.now()) {
  const [h, p, s] = (token || "").split(".");
  if (!h || !p || !s) throw new Error("not a JWT");
  const header = JSON.parse(b64url(h).toString());
  const claims = JSON.parse(b64url(p).toString());
  if (header.alg !== "RS256") throw new Error("unexpected alg");
  const jwk = (await jwks()).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("unknown signing key");
  const key = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const ok = crypto.verify("RSA-SHA256", Buffer.from(`${h}.${p}`), key, b64url(s));
  if (!ok) throw new Error("bad signature");
  const sec = Math.floor(now / 1000);
  if (claims.iss !== ISSUER) throw new Error("wrong issuer");
  if (claims.aud !== AUDIENCE) throw new Error("wrong audience");
  if (claims.repository !== REPO) throw new Error("wrong repository");
  if (claims.ref !== "refs/heads/main") throw new Error("wrong ref");
  if (!(claims.exp > sec) || claims.nbf > sec + 60) throw new Error("expired");
  return claims;
}
