/**
 * A person from the user's life. Only the alias ever leaves the server;
 * the variants are the real names or spellings as dictated.
 */
export interface Person {
  id: string;
  alias: string;
  variants: string[];
}

export const PERSON_LIMITS = {
  maxPeople: 15,
  aliasMaxLength: 30,
  maxVariants: 5,
  variantMaxLength: 40,
} as const;

export const PERSON_ID_PATTERN = /^[a-z0-9]{1,24}$/;
