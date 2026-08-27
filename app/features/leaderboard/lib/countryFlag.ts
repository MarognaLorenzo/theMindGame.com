// Renders an ISO 3166-1 alpha-2 code as its flag emoji by mapping each letter
// to the corresponding Unicode regional indicator symbol (U+1F1E6 = 'A').
// No image assets needed.
export function countryCodeToFlagEmoji(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return "🏳️";
  }

  const codePoints = Array.from(code, (char) => 0x1f1e6 + (char.charCodeAt(0) - 65));
  return String.fromCodePoint(...codePoints);
}
