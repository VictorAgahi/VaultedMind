import { foldText } from './pseudonymize.js';

export interface LinguisticMarkers {
  wordCount: number;
  absolutistRatio: number;
  firstPersonRatio: number;
}

const ABSOLUTIST_WORDS = new Set([
  'toujours',
  'jamais',
  'rien',
  'tout',
  'totalement',
  'completement',
  'personne',
  'aucun',
  'aucune',
  'chaque',
  'constamment',
  'entierement',
  'absolument',
  'definitivement',
  'forcement',
]);

const FIRST_PERSON_WORDS = new Set([
  'je',
  'j',
  'me',
  'm',
  'moi',
  'mon',
  'ma',
  'mes',
]);

function tokenize(text: string): string[] {
  return foldText(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 0);
}

/**
 * Cheap local markers of how the note is written, computed on the raw note without any network call.
 */
export function computeLinguisticMarkers(text: string): LinguisticMarkers {
  const tokens = tokenize(text);
  const wordCount = tokens.length;
  if (wordCount === 0) {
    return { wordCount: 0, absolutistRatio: 0, firstPersonRatio: 0 };
  }
  const absolutistCount = tokens.filter((t) => ABSOLUTIST_WORDS.has(t)).length;
  const firstPersonCount = tokens.filter((t) =>
    FIRST_PERSON_WORDS.has(t),
  ).length;
  return {
    wordCount,
    absolutistRatio: absolutistCount / wordCount,
    firstPersonRatio: firstPersonCount / wordCount,
  };
}
