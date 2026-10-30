import type { Person } from './person.js';

interface NormalizedText {
  text: string;
  /** For each character of `text`, the [start, end) range it covers in the original string. */
  ranges: Array<[number, number]>;
}

interface VariantTarget {
  normalized: string;
  alias: string;
}

const WORD_CHARACTER = /[\p{L}\p{N}]/u;
const COMBINING_MARK = /^\p{M}$/u;

function foldCharacter(character: string): string {
  return character.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Lowercases and strips accents while remembering where each folded character came from,
 * so a match on the folded text can be replaced in the original text.
 */
function normalizeWithRanges(text: string): NormalizedText {
  let folded = '';
  const ranges: Array<[number, number]> = [];
  let offset = 0;
  for (const character of text) {
    const end = offset + character.length;
    for (const foldedCharacter of foldCharacter(character)) {
      folded += foldedCharacter;
      for (let unit = 0; unit < foldedCharacter.length; unit++) {
        ranges.push([offset, end]);
      }
    }
    offset = end;
  }
  return { text: folded, ranges };
}

export function foldText(text: string): string {
  return normalizeWithRanges(text).text;
}

function isWordCharacterAt(text: string, index: number): boolean {
  if (index < 0 || index >= text.length) return false;
  return WORD_CHARACTER.test(text[index]);
}

function buildTargets(people: Person[]): VariantTarget[] {
  const targets: VariantTarget[] = [];
  for (const person of people) {
    for (const variant of person.variants) {
      const normalized = foldText(variant.trim());
      if (normalized) targets.push({ normalized, alias: person.alias });
    }
  }
  // Longest first so "Marie-Claire" wins over "Marie"; the sort is stable for equal lengths
  return targets.sort((a, b) => b.normalized.length - a.normalized.length);
}

function extendOverCombiningMarks(text: string, end: number): number {
  let extended = end;
  while (extended < text.length) {
    const next = String.fromCodePoint(text.codePointAt(extended) ?? 0);
    if (!COMBINING_MARK.test(next)) break;
    extended += next.length;
  }
  return extended;
}

/**
 * Replaces every configured name variant by `[alias]`.
 * Matching ignores case and accents and only applies to whole words.
 */
export function pseudonymize(text: string, people: Person[]): string {
  const targets = buildTargets(people);
  if (targets.length === 0 || !text) return text;

  const { text: folded, ranges } = normalizeWithRanges(text);
  let result = '';
  let copiedUntil = 0;
  let index = 0;

  while (index < folded.length) {
    const atWordStart = !isWordCharacterAt(folded, index - 1);
    const target = atWordStart
      ? targets.find(
          (candidate) =>
            folded.startsWith(candidate.normalized, index) &&
            !isWordCharacterAt(folded, index + candidate.normalized.length),
        )
      : undefined;

    if (!target) {
      index++;
      continue;
    }

    const matchEnd = index + target.normalized.length;
    const originalStart = ranges[index][0];
    const originalEnd = extendOverCombiningMarks(text, ranges[matchEnd - 1][1]);
    result += text.slice(copiedUntil, originalStart) + `[${target.alias}]`;
    copiedUntil = originalEnd;
    while (index < folded.length && ranges[index][0] < originalEnd) index++;
  }

  return result + text.slice(copiedUntil);
}
