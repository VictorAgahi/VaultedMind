export type JevQuestion =
  | { type: 'noul'; instructions: string }
  | { type: 'score'; instructions: string; criteria: string[] };

export type JevQuestions = Record<string, JevQuestion>;

export type JevAnswer =
  | { type: 'noul'; noul: number }
  | { type: 'score'; score: number; confidence: number };

export interface JevResponse {
  model: string;
  answers: Record<string, JevAnswer>;
}
