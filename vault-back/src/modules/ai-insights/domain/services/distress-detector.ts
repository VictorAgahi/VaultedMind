export type DistressLevel = 'none' | 'concern' | 'crisis';

export interface DistressAssessment {
  level: DistressLevel;
  matchedPhrases: string[];
}

/**
 * Deterministic, framework-free screen for signs of distress in French free text.
 * It runs before any LLM call so a person in crisis is always pointed to human help,
 * even if the model or the network fails. It favours recall over precision on purpose.
 */
const CRISIS_PHRASES: readonly string[] = [
  'suicide',
  'suicidaire',
  'me suicider',
  'se suicider',
  'me tuer',
  'en finir',
  'mettre fin a mes jours',
  'mettre fin a ma vie',
  'plus envie de vivre',
  'pas envie de vivre',
  'envie de mourir',
  'veux mourir',
  'voudrais mourir',
  'me faire du mal',
  'automutilation',
  'm automutiler',
  'me scarifier',
  'scarification',
  'disparaitre pour toujours',
  'personne ne me regretterait',
  'tout le monde serait mieux sans moi',
  'overdose',
];

const CONCERN_PHRASES: readonly string[] = [
  'desespere',
  'desesperee',
  'sans espoir',
  'plus la force',
  'je n en peux plus',
  'je craque',
  'crise d angoisse',
  'attaque de panique',
  'seul au monde',
  'seule au monde',
  'je me sens vide',
  'je ne vaux rien',
];

export function normalizeForScreening(text: string): string {
  return ` ${text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;
}

function findPhrases(normalized: string, phrases: readonly string[]): string[] {
  return phrases.filter((phrase) => normalized.includes(` ${phrase} `));
}

export function assessDistress(texts: readonly string[]): DistressAssessment {
  const normalized = normalizeForScreening(texts.join(' \n '));
  const crisis = findPhrases(normalized, CRISIS_PHRASES);
  if (crisis.length > 0) {
    return { level: 'crisis', matchedPhrases: crisis };
  }
  const concern = findPhrases(normalized, CONCERN_PHRASES);
  if (concern.length > 0) {
    return { level: 'concern', matchedPhrases: concern };
  }
  return { level: 'none', matchedPhrases: [] };
}
