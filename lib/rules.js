// Keyword → reply rules for @cecelinachang.
// A comment matches when it contains the keyword as a whole word (case-insensitive),
// e.g. "PRESTO", "presto!", "mau presto dong". Order matters: the first matching rule wins.

const WA = "https://wa.me/6281284250718";
const wa = (text) => `${WA}?text=${encodeURIComponent(text)}`;

export const RULES = [
  {
    keyword: "PRESTO",
    dm:
      "Halo kak {username}! Makasih udah komen 🙏\n\n" +
      "Info & cara order Presto Signora langsung chat Cece di WhatsApp ya:\n" +
      wa("Halo Cece, mau info Presto Signora") +
      "\n\nCece balas secepatnya 😊",
  },
  {
    keyword: "BAKSO",
    dm:
      "Halo kak {username}! Makasih udah komen 🙏\n\n" +
      "Info Kelas Online Bakso Cece Lina Chang ada di sini:\nhttps://cecelinachang.com\n\n" +
      "Mau tanya dulu? Chat Cece di WhatsApp:\n" +
      wa("Halo Cece, mau info kelas bakso"),
  },
  {
    keyword: "LAPIS",
    dm:
      "Halo kak {username}! Makasih udah komen 🙏\n\n" +
      "Info Kelas Lapis Legit Cece Lina Chang ada di sini:\nhttps://cecelinachang.com\n\n" +
      "Mau tanya dulu? Chat Cece di WhatsApp:\n" +
      wa("Halo Cece, mau info kelas lapis legit"),
  },
  {
    keyword: "OTAK",
    dm:
      "Halo kak {username}! Makasih udah komen 🙏\n\n" +
      "Info Kelas Otak-Otak Cece Lina Chang ada di sini:\nhttps://cecelinachang.com\n\n" +
      "Mau tanya dulu? Chat Cece di WhatsApp:\n" +
      wa("Halo Cece, mau info kelas otak-otak"),
  },
  {
    keyword: "AIRFRYER",
    dm:
      "Halo kak {username}! Makasih udah komen 🙏\n\n" +
      "Info & cara order air fryer Idealife langsung chat Cece di WhatsApp ya:\n" +
      wa("Halo Cece, mau info air fryer Idealife") +
      "\n\nCece balas secepatnya 😊",
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

export function renderDm(rule, username) {
  const name = username ? `@${username}` : "";
  return rule.dm.replace("{username}", name).replace("kak  ", "kak ").replace(/kak !/, "kak!");
}
