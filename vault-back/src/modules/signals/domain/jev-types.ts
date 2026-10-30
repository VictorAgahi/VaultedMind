export type JevQuestion =
  | { type: 'noul'; instructions: string }
  | { type: 'score'; instructions: string; criteria: string[] }
  | {
      type: 'choice';
      instructions: string;
      /** Option name mapped to its description. */
      criteria: Record<string, string>;
    };

export type JevQuestions = Record<string, JevQuestion>;

export type JevAnswer =
  | { type: 'noul'; noul: number }
  | { type: 'score'; score: number; confidence: number }
  | {
      type: 'choice';
      choice: string;
      confidence: number;
      probabilities: Record<string, number>;
    };

export interface JevResponse {
  model: string;
  answers: Record<string, JevAnswer>;
}
