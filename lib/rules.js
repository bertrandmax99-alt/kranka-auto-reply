// Keyword → reply rules for @cecelinachang.
// A comment matches when it contains the keyword as a whole word (case-insensitive),
// e.g. "PRESTO", "presto!", "mau presto dong". Order matters: the first matching rule wins.

const WA = "https://wa.me/6281284250718";
const wa = (text) => `${WA}?text=${encodeURIComponent(text)}`;

// Each rule has the DM `text` and tappable link `buttons` (Instagram allows up to 3, titles up to
// 20 characters). If Instagram refuses the button message, the bot falls back to plain text
// with the same links written out (see renderDm).
export const RULES = [
  {
    keyword: "PRESTO",
    text: "Halo kak {username}! Makasih udah komen 🙏\n\nInfo & cara order Presto Signora langsung chat Cece di WhatsApp ya. Cece balas secepatnya 😊",
    buttons: [{ title: "Order via WhatsApp", url: wa("Halo Cece, mau info Presto Signora") }],
  },
  {
    keyword: "BAKSO",
    text: "Halo kak {username}! Makasih udah komen 🙏\n\nInfo Kelas Online Bakso Cece Lina Chang ada di sini. Mau tanya dulu? Chat Cece di WhatsApp.",
    buttons: [
      { title: "Info Kelas Bakso", url: "https://cecelinachang.com" },
      { title: "Chat Cece di WA", url: wa("Halo Cece, mau info kelas bakso") },
    ],
  },
  {
    keyword: "LAPIS",
    text: "Halo kak {username}! Makasih udah komen 🙏\n\nInfo Kelas Lapis Legit Cece Lina Chang ada di sini. Mau tanya dulu? Chat Cece di WhatsApp.",
    buttons: [
      { title: "Info Kelas Lapis", url: "https://cecelinachang.com" },
      { title: "Chat Cece di WA", url: wa("Halo Cece, mau info kelas lapis legit") },
    ],
  },
  {
    keyword: "OTAK",
    text: "Halo kak {username}! Makasih udah komen 🙏\n\nInfo Kelas Otak-Otak Cece Lina Chang ada di sini. Mau tanya dulu? Chat Cece di WhatsApp.",
    buttons: [
      { title: "Info Kelas Otak", url: "https://cecelinachang.com" },
      { title: "Chat Cece di WA", url: wa("Halo Cece, mau info kelas otak-otak") },
    ],
  },
  {
    keyword: "AIRFRYER",
    text: "Halo kak {username}! Makasih udah komen 🙏\n\nInfo & cara order air fryer Idealife langsung chat Cece di WhatsApp ya. Cece balas secepatnya 😊",
    buttons: [{ title: "Order via WhatsApp", url: wa("Halo Cece, mau info air fryer Idealife") }],
  },
];

// Public reply under the comment. It also marks the comment as handled, so the bot
// never DMs the same person twice (the bot keeps no database).
export const PUBLIC_REPLY = "Udah Cece kirim ke DM ya kak 🙏 Cek inbox atau permintaan pesan ya";

const norm = (s) => (s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toUpperCase();

// Only deliberate keyword comments count ("PRESTO", "mau presto dong kak", "info bakso ci"),
// so normal chat like "bakso enak banget, resepnya dong" never triggers a DM:
// besides the keyword and filler words, at most one other word is allowed.
const FILLER = new Set(["MAU", "DONG", "DNG", "KAK", "KA", "KK", "CI", "CICI", "CE", "CECE", "INFO", "MIN", "PLS", "PLEASE", "YA", "YAA", "AKU", "SAYA", "AJA", "BOLEH", "NIH", "SIS"]);
export const MAX_OTHER_WORDS = 1;

export function matchRule(text, rules = RULES) {
  const t = norm(text);
  const words = t.replace(/[^A-Z0-9]+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return null;
  for (const r of rules) {
    const others = words.filter((w) => w !== r.keyword && !FILLER.has(w));
    if (others.length > MAX_OTHER_WORDS) continue;
    // whole word: not glued to other letters/digits ("PRESTOO" or "XPRESTO" do not match)
    const re = new RegExp(`(^|[^A-Z0-9])${r.keyword}([^A-Z0-9]|$)`);
    if (re.test(t)) return r;
  }
  return null;
}

const greet = (text, username) => text.replace("{username}", username ? `@${username}` : "").replace("kak  ", "kak ").replace(/kak !/, "kak!");

// The message shown above the buttons.
export const renderText = (rule, username) => greet(rule.text, username);

// Plain-text version with the links written out: the fallback when buttons are refused.
export function renderDm(rule, username) {
  return `${renderText(rule, username)}\n\n${rule.buttons.map((b) => `${b.title}:\n${b.url}`).join("\n\n")}`;
}
