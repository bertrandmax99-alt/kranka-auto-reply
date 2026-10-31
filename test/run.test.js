import { test } from "node:test";
import assert from "node:assert/strict";
import { matchRule, renderDm } from "../lib/rules.js";
import { plan } from "../lib/run.js";

test("keyword matches as a whole word, any case", () => {
  assert.equal(matchRule("PRESTO")?.keyword, "PRESTO");
  assert.equal(matchRule("mau presto dong kak")?.keyword, "PRESTO");
  assert.equal(matchRule("Presto!! 🙏")?.keyword, "PRESTO");
  assert.equal(matchRule("#bakso")?.keyword, "BAKSO");
  assert.equal(matchRule("prestoo"), null);
  assert.equal(matchRule("ekspresto"), null);
  assert.equal(matchRule("enak banget"), null);
});

test("ordinary chat that happens to contain a keyword does not trigger", () => {
  assert.equal(matchRule("bakso enak banget, resepnya dong"), null);
  assert.equal(matchRule("lapis legit nya cantik bgt ci"), null);
  assert.equal(matchRule("bakso enak banget"), null);
  assert.equal(matchRule("mau presto dong")?.keyword, "PRESTO");
  assert.equal(matchRule("info bakso ci")?.keyword, "BAKSO");
  assert.equal(matchRule("BAKSO 🙏🙏")?.keyword, "BAKSO");
  assert.equal(matchRule("presto signora")?.keyword, "PRESTO");
});

test("dm greets the commenter and carries the WhatsApp link", () => {
  const dm = renderDm(matchRule("presto"), "budi");
  assert.match(dm, /^Halo kak @budi!/);
  assert.match(dm, /wa\.me\/6281284250718/);
  assert.match(renderDm(matchRule("presto"), ""), /^Halo kak!/);
});

const me = { id: "999", username: "cecelinachang" };
const now = Date.parse("2026-10-31T12:00:00Z");
const media = { id: "m1", permalink: "https://instagram.com/reel/x" };
const c = (id, text, extra = {}) => ({ id, text, timestamp: "2026-10-31T10:00:00+0000", username: "fan" + id, from: { id: "u" + id }, ...extra });

test("plan picks matching, fresh, unhandled comments from other people", () => {
  const actions = plan(
    [{
      media,
      comments: [
        c("1", "PRESTO"), // yes
        c("2", "bagus banget"), // no keyword
        c("3", "presto", { timestamp: "2026-10-20T10:00:00+0000" }), // older than the 7-day window
        c("4", "presto", { replies: { data: [{ id: "r", username: "cecelinachang", from: { id: "999" } }] } }), // already answered
        c("5", "presto", { username: "cecelinachang", from: { id: "999" } }), // our own comment
        c("6", "bakso dong", { replies: { data: [{ id: "r2", username: "someone", from: { id: "u7" } }] } }), // reply by someone else
      ],
    }],
    me,
    now,
  );
  assert.deepEqual(actions.map((a) => [a.commentId, a.keyword]), [["1", "PRESTO"], ["6", "BAKSO"]]);
  assert.match(actions[0].dm, /@fan1/);
});

test("comments from before the bot went live are ignored", () => {
  const liveSince = Date.parse("2026-10-31T11:00:00Z");
  const actions = plan([{ media, comments: [c("1", "presto"), c("2", "presto", { timestamp: "2026-10-31T11:30:00+0000" })] }], me, now, undefined, liveSince);
  assert.deepEqual(actions.map((a) => a.commentId), ["2"]);
});
