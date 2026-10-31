import { run } from "../lib/run.js";

// Called every few minutes by the GitHub Actions schedule (Vercel's free cron runs only daily).
// Auth: "Authorization: Bearer <CRON_SECRET>".
// MODE=live sends DMs; anything else is shadow mode (reports what it would send, sends nothing).
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
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
