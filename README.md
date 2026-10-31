# Kranka Auto Reply

Comment-to-DM for @cecelinachang. Someone comments a keyword (PRESTO, BAKSO, LAPIS, OTAK, AIRFRYER) on her post or reel, and the bot sends them one private reply with the info and the WhatsApp link, then replies "Udah Cece kirim ke DM ya kak" under the comment.

## How it runs
- `api/poll.js` (Vercel function) reads every post published since `LIVE_SINCE` and all their comments (paginated), and acts on comments that match a rule in `lib/rules.js`, are under 6.5 days old (Meta allows private replies for 7 days), are not ours, and have no reply from us yet.
- A comment matches only when it is basically the keyword: the keyword plus filler words (mau, dong, kak, ci, info…) and at most one other word. "mau presto dong kak" matches; "bakso enak banget" does not.
- The public reply is the "done" marker, so there is no database.
- `.github/workflows/poll.yml` calls it every 5 minutes (Vercel's free cron only runs daily).
- `MODE=live` sends; anything else is shadow mode: the response lists what it would send, nothing is sent.

## Environment (Vercel)
| Name | What |
|---|---|
| `META_SYSTEM_USER_TOKEN` | KrankaStudio system user token with the app, the @cecelinachang Instagram account and the Cecelinachang Page assigned. Paste it in Vercel yourself; never commit it. |
| `IG_USER_ID` | `17841471547009409` (@cecelinachang) |
| `IG_USERNAME` | `cecelinachang` |
| `LIVE_SINCE` | ISO time the bot was switched on, e.g. `2026-11-01T00:00:00+07:00`. Only posts published after it, and comments made after it, are answered: old reels and old chat are never touched. |
| `CRON_SECRET` | random string; same value as the GitHub secret |
| `MODE` | `shadow` until checked, then `live` |

GitHub secrets: `POLL_URL` (`https://<vercel-domain>/api/poll`) and `CRON_SECRET`.

## Meta app
Kranka Auto Reply, App ID 2573702766475442, KrankaStudio portfolio, Instagram API with Facebook (Unified) login. Comment webhooks need Advanced Access (App Review + Business Verification); until then this polls.

## Change the replies
Edit `lib/rules.js`, run `npm test`, push.
