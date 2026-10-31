export const TRACKED_SUBJECT_KINDS = [
  'SELF',
  'ANIMAL',
  'OTHER_PERSON',
] as const;
export type TrackedSubjectKind = (typeof TRACKED_SUBJECT_KINDS)[number];

/**
 * Who the journal is about. The author is always the one writing the notes; for an animal or
 * another person the author is an observer of the tracked subject.
 */
export interface TrackedSubject {
  kind: TrackedSubjectKind;
  /** First name of the tracked animal or person, e.g. "Mochi". */
  name?: string;
  /** Animals only, e.g. "chat". */
  species?: string;
}

export const TRACKED_SUBJECT_LIMITS = {
  nameMaxLength: 40,
  speciesMaxLength: 40,
} as const;

export const DEFAULT_TRACKED_SUBJECT: TrackedSubject = { kind: 'SELF' };

export function isTrackedSubjectKind(
  value: string,
): value is TrackedSubjectKind {
  return (TRACKED_SUBJECT_KINDS as readonly string[]).includes(value);
}

function cleaned(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Trims the free texts and drops what does not apply to the kind (a name for SELF, a species for a person). */
export function normalizeTrackedSubject(
  subject: Partial<TrackedSubject> | null | undefined,
): TrackedSubject {
  const kind: TrackedSubjectKind =
    subject?.kind && isTrackedSubjectKind(subject.kind) ? subject.kind : 'SELF';
  if (kind === 'SELF') return { kind };
  const name = cleaned(subject?.name);
  const species = kind === 'ANIMAL' ? cleaned(subject?.species) : undefined;
  return {
    kind,
    ...(name && { name }),
    ...(species && { species }),
  };
}

export function isSelfSubject(subject: TrackedSubject): boolean {
  return subject.kind === 'SELF';
}

function withDefiniteArticle(species: string): string {
  const text = species.trim().toLowerCase();
  return /^[aeiouyàâäéèêëîïôöùûüh]/.test(text) ? `l'${text}` : `le ${text}`;
}

/** The subject as a noun phrase usable mid-sentence: "Mochi (le chat)", "le chat", "la personne suivie". */
export function describeSubject(subject: TrackedSubject): string {
  if (subject.kind === 'ANIMAL') {
    if (subject.name && subject.species) {
      return `${subject.name} (${withDefiniteArticle(subject.species)})`;
    }
    if (subject.name) return subject.name;
    if (subject.species) return withDefiniteArticle(subject.species);
    return "l'animal suivi";
  }
  return subject.name ?? 'la personne suivie';
}

/** "de Mochi", "du chat", "de l'animal suivi", "de la personne suivie". */
export function ofSubject(subject: TrackedSubject): string {
  if (subject.name) return `de ${subject.name}`;
  if (subject.kind === 'ANIMAL') {
    if (subject.species) {
      const phrase = withDefiniteArticle(subject.species);
      return phrase.startsWith('le ')
        ? `du ${phrase.slice(3)}`
        : `de ${phrase}`;
    }
    return "de l'animal suivi";
  }
  return 'de la personne suivie';
}

/** Sentence-initial form of a noun phrase. */
export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
