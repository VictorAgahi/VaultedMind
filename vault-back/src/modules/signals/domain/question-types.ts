import type { ConstructKey } from './constructs.js';

export type QuestionCategory =
  | 'event'
  | 'theme'
  | 'state'
  | 'person'
  | 'custom';
export type QuestionType = 'noul' | 'score';

interface QuestionBase {
  key: string;
  category: QuestionCategory;
  /** What the question measures, used to keep duplicated measures apart. */
  construct: ConstructKey;
  /** Instructions sent to Jev, in French. */
  instructions: string;
  /** Short French label shown in the UI. */
  label: string;
}

export interface NoulQuestion extends QuestionBase {
  type: 'noul';
}

export interface ScoreQuestion extends QuestionBase {
  type: 'score';
  /** Level descriptions sent to Jev, ordered from low to high. */
  criteria: string[];
  /** Short level labels for the UI, same order as the criteria. */
  levelLabels: string[];
  /** For these questions the low end is the notable one, so it is the one displayed. */
  lowEndIsNotable?: boolean;
}

export type BankQuestion = NoulQuestion | ScoreQuestion;

export const THEME_LEVEL_LABELS = [
  'Absent',
  'Mentionné en passant',
  'Présent',
  'Important',
  'Dominant',
];

export const INTENSITY_LEVEL_LABELS = [
  'Aucune',
  'Légère',
  'Modérée',
  'Forte',
  'Très forte',
];

export function eventQuestion(
  key: string,
  construct: ConstructKey,
  label: string,
  instructions: string,
): NoulQuestion {
  return {
    key,
    construct,
    category: 'event',
    type: 'noul',
    label,
    instructions,
  };
}

/** How much room a subject takes in the day, on the five theme levels. */
export function themeQuestion(
  key: string,
  construct: ConstructKey,
  label: string,
  subject: string,
  dayPhrase: string,
): ScoreQuestion {
  return {
    key,
    construct,
    category: 'theme',
    type: 'score',
    label,
    instructions: `Quelle place prend ${subject} dans ${dayPhrase} ?`,
    criteria: [
      `Absent : ${subject} n'est pas évoqué`,
      `Mentionné en passant : ${subject} est évoqué brièvement, sans importance particulière`,
      `Présent : ${subject} fait partie de la journée et occupe une place normale`,
      `Important : ${subject} occupe une place importante dans la journée`,
      `Dominant : ${subject} domine la journée et la note`,
    ],
    levelLabels: THEME_LEVEL_LABELS,
  };
}
