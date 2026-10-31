import type { Person } from './person.js';
import type { TrackedSubject } from './tracked-subject.js';

export const SUBJECT_PSEUDONYM_ID = 'subject';
export const OBSERVED_PERSON_ALIAS = 'la personne suivie';

/**
 * The name of another tracked person is replaced before notes leave the server, like the
 * people of the entourage. A pet name is not identifying and is sent as written.
 */
export function subjectPseudonym(subject: TrackedSubject): Person[] {
  if (subject.kind !== 'OTHER_PERSON' || !subject.name) return [];
  return [
    {
      id: SUBJECT_PSEUDONYM_ID,
      alias: OBSERVED_PERSON_ALIAS,
      variants: [subject.name],
    },
  ];
}
