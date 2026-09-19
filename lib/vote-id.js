import crypto from "crypto";

export function getMoscowDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function hashValue(value) {
  const secret = process.env.VOTE_HASH_SECRET;
  if (!secret) throw new Error("VOTE_HASH_SECRET is missing");

  return crypto
    .createHmac("sha256", secret)
    .update(value)
    .digest("hex");
}

export function getClientIp(headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return headers.get("x-real-ip") || "unknown";
}
