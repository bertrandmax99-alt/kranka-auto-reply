import { run } from "../lib/run.js";
import { verifyGithubOidc } from "../lib/github-oidc.js";

// Called every few minutes by the GitHub Actions schedule (Vercel's free cron runs only daily).
// Auth: "Authorization: Bearer <token>", where the token is either the GitHub Actions OIDC token
// of this repo's workflow (no shared secret needed) or, optionally, CRON_SECRET.
// MODE=live sends DMs; anything else is shadow mode (reports what it would send, sends nothing).
async function authorized(header) {
  const token = (header || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  // trim: a secret pasted from a file often carries a trailing newline
  const secret = (process.env.CRON_SECRET || "").trim();
  if (secret && token === secret) return true;
  try {
    await verifyGithubOidc(token);
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (!(await authorized(req.headers.authorization))) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const { META_SYSTEM_USER_TOKEN, IG_USER_ID, IG_USERNAME, LIVE_SINCE, MODE } = process.env;
  if (!META_SYSTEM_USER_TOKEN || !IG_USER_ID || !LIVE_SINCE) {
    return res.status(500).json({ error: "META_SYSTEM_USER_TOKEN, IG_USER_ID and LIVE_SINCE must be set" });
  }
  try {
    const out = await run({
      systemToken: META_SYSTEM_USER_TOKEN,
      igUserId: IG_USER_ID,
      igUsername: IG_USERNAME,
      liveSince: LIVE_SINCE,
      live: MODE === "live",
    });
    return res.status(200).json(out);
  } catch (e) {
    console.error(JSON.stringify({ event: "error", message: e.message, code: e.code }));
    return res.status(502).json({ error: e.message, code: e.code ?? null });
  }
}
