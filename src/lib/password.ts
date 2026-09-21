const LOWER = "abcdefghijkmnopqrstuvwxyz"; // no "l"
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no "I", "O"
const DIGITS = "23456789"; // no "0", "1"
const SYMBOLS = "!@#$%&*?";

function randomInt(max: number): number {
  // Rejection sampling over a crypto-secure source avoids modulo bias.
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return buf[0] % max;
}

const pick = (set: string) => set[randomInt(set.length)];

/**
 * Generates a temporary password: cryptographically random, at least one
 * character from every class, ambiguous look-alikes (0/O, 1/l/I) excluded,
 * then shuffled so the guaranteed characters are not in predictable spots.
 */
export function generatePassword(length = 14): string {
  const all = LOWER + UPPER + DIGITS + SYMBOLS;
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
