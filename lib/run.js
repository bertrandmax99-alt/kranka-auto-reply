import { matchRule, renderDm, renderText, PUBLIC_REPLY, RULES } from "./rules.js";
import * as ig from "./instagram.js";

const DAY = 24 * 60 * 60 * 1000;
// Meta allows a private reply only within 7 days of the comment; stay a little inside it.
const WINDOW_MS = 6.5 * DAY;
const MAX_SENDS_PER_RUN = 20;

const ownedBy = (c, me) => c?.from?.id === me.id || (c?.username || c?.from?.username || "").toLowerCase() === me.username;

// Decide what to do with each comment. Pure: no network, so it can be tested.
// `liveSince`: comments before this moment are ignored, so switching on never answers a backlog.
export function plan(mediaList, me, now = Date.now(), rules = RULES, liveSince = 0) {
  const actions = [];
  for (const { media, comments } of mediaList) {
    for (const c of comments) {
      if (ownedBy(c, me)) continue; // never answer our own comments
      const at = Date.parse(c.timestamp);
      if (now - at > WINDOW_MS) continue; // too old for a private reply
      if (at < liveSince) continue; // from before the bot was switched on
      const rule = matchRule(c.text, rules);
      if (!rule) continue;
      const handled = (c.replies?.data || []).some((r) => ownedBy(r, me));
      if (handled) continue; // our public reply under it means the DM already went out
      const username = c.username || c.from?.username || "";
      actions.push({
        commentId: c.id,
        mediaId: media.id,
        permalink: media.permalink,
        username,
        keyword: rule.keyword,
        comment: c.text,
        dm: renderDm(rule, username),
        text: renderText(rule, username),
        buttons: rule.buttons,
      });
    }
  }
  return actions;
}

// liveSince: ISO time the bot was switched on. Only comments made after it are answered, so
// switching on never replies to a backlog. Posts from the last 7 days are watched (plus any
// posts published since liveSince), so recent reels keep working right after switch-on.
export async function run({ systemToken, igUserId, igUsername, liveSince, live = false, log = console.log }) {
  const since = Date.parse(liveSince);
  if (Number.isNaN(since)) throw new Error("LIVE_SINCE must be an ISO date, e.g. 2026-11-01T00:00:00+07:00");
  const now = Date.now();
  const page = await ig.pageTokenFor(systemToken, igUserId);
  const me = { id: igUserId, username: (igUsername || "").toLowerCase() };
  const media = await ig.mediaSince(page.token, igUserId, Math.min(since, now - WINDOW_MS));
  const commentsFrom = Math.max(since, now - WINDOW_MS);
  const mediaList = [];
  for (const m of media) {
    if (!m.comments_count) continue;
    mediaList.push({ media: m, comments: await ig.commentsSince(page.token, m.id, commentsFrom) });
  }
  const actions = plan(mediaList, me, now, RULES, since).slice(0, MAX_SENDS_PER_RUN);
  const results = [];
  for (const a of actions) {
    const r = { ...a, mode: live ? "live" : "shadow" };
    if (live) {
      try {
        await ig.sendPrivateReplyWithButtons(page.token, igUserId, a.commentId, a.text, a.buttons);
        r.dm_status = "sent";
      } catch (e) {
        // Instagram refused the button message: send the same info as plain text with the links.
        r.button_error = e.message;
        try {
          await ig.sendPrivateReply(page.token, igUserId, a.commentId, a.dm);
          r.dm_status = "sent (plain text)";
        } catch (e2) {
          r.dm_status = `error: ${e2.message}`;
          r.error_code = e2.code ?? null;
        }
      }
      // The public reply says "sent to your DM" and marks the comment as handled, so it only
      // goes out once the DM did; a failed DM is retried on the next run.
      if (r.dm_status.startsWith("sent")) {
        try {
          await ig.postPublicReply(page.token, a.commentId, PUBLIC_REPLY);
          r.public_reply = "posted";
        } catch (e) {
          r.public_reply = `error: ${e.message}`;
        }
      }
    }
    log(JSON.stringify({ event: "reply", ...r }));
    results.push(r);
  }
  const comments = mediaList.reduce((n, m) => n + m.comments.length, 0);
  const summary = {
    mode: live ? "live" : "shadow",
    page: page.pageName,
    media: media.length,
    comments,
    matched: results.length,
    ...(live && { sent: results.filter((r) => r.dm_status.startsWith("sent")).length }),
  };
  log(JSON.stringify({ event: "summary", ...summary }));
  return { summary, results };
}
