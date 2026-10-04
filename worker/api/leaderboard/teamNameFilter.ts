import {
  englishDataset,
  englishRecommendedTransformers,
  RegExpMatcher,
} from "obscenity";

// Automatic first pass over submitted team names. A hit is rejected before the
// submission token is consumed, so the team can retry with a nicer name; a
// miss still goes to human review (or auto-approval, for a known name).

// obscenity's matcher handles leetspeak, repeated letters, spacing tricks and
// Unicode look-alikes on top of a plain word list.
const profanityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

// Things no team name needs, regardless of language.
const STRUCTURAL_RULES: RegExp[] = [
  // URLs and bare domains (self-promotion / spam).
  /https?:\/\/|www\./i,
  /\w\.(com|net|org|io|gg|app|xyz|ru|ly|me|tv|co|info|biz|link|site|online|shop)\b/i,
  // Social handles.
  /@\w/,
  // Control and invisible formatting characters (zero-width spaces, bidi
  // overrides) used to dodge filters or spoof other names.
  /[\p{Cc}\p{Cf}]/u,
  // Zalgo text: stacks of combining marks on a single character.
  /\p{M}{3,}/u,
];

// Phone numbers, however they're punctuated. Counted rather than matched so a
// year range like "2024-2025" doesn't trip it.
const MAX_DIGITS = 8;

export function isTeamNameAllowed(teamName: string): boolean {
  if (STRUCTURAL_RULES.some((rule) => rule.test(teamName))) {
    return false;
  }
  if (teamName.replace(/\D/g, "").length > MAX_DIGITS) {
    return false;
  }
  return !profanityMatcher.hasMatch(teamName);
}
