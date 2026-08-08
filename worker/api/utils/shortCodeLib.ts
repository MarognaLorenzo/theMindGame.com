
const SHORT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SHORT_CODE_LENGTH = 6;

export function generateShortCode(): string {
  const random = crypto.getRandomValues(new Uint8Array(SHORT_CODE_LENGTH));
  return Array.from(random, (byte) => {
    return SHORT_CODE_ALPHABET[byte % SHORT_CODE_ALPHABET.length];
  }).join("").trim().toUpperCase();
}