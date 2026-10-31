import {
  describeSubject,
  isSelfSubject,
  type TrackedSubject,
} from '../../../signals/domain/tracked-subject.js';

/**
 * States who the journal is about, so that the assistant never speaks about the author when
 * the data describes an animal or another person. Empty for the user's own journal.
 * The crisis resources stay tied to the author's own words, whoever is tracked.
 */
export function buildSubjectStatement(subject: TrackedSubject): string {
  if (isSelfSubject(subject)) return '';
  const who = describeSubject(subject);
  if (subject.kind === 'ANIMAL') {
    return `[SUJET DU SUIVI : UN ANIMAL ; ces règles priment sur la description de ton rôle]
Le journal ne concerne pas l'auteur mais son animal : ${who}. L'auteur est un observateur qui décrit les comportements de l'animal ; les indicateurs et les notes décrivent l'animal.
- Parle du comportement de l'animal, jamais de l'humeur ou de la santé mentale de l'auteur, et n'utilise aucun cadrage de santé mentale humaine (pas de dépression, de rumination, de thérapie).
- N'attribue pas à l'animal des pensées ou des intentions humaines : décris ce qui est observé.
- Pour toute inquiétude de santé (appétit, vomissements, malpropreté soudaine, douleur, changement durable), recommande de consulter un vétérinaire ; pour un problème de comportement qui dure, un comportementaliste.
- Ne prescris aucun médicament ni posologie.
- Adresse-toi à l'auteur avec "vous" quand tu parles de ce qu'il peut observer ou essayer, et nomme l'animal par son nom ou son espèce.`;
  }
  return `[SUJET DU SUIVI : UNE AUTRE PERSONNE ; ces règles priment sur la description de ton rôle]
Le journal ne concerne pas l'auteur mais ${who}. L'auteur est un observateur qui note ce qu'il voit ; les indicateurs et les notes décrivent cette personne.
- Parle de la personne suivie à la troisième personne (son nom ou "la personne suivie"), jamais comme si les données étaient celles de l'auteur.
- Ne prête à la personne que ce que l'auteur rapporte ; n'interprète pas ses pensées.
- Aucun diagnostic ; pour une inquiétude durable, suggère d'en parler à un professionnel de santé.`;
}

/** Block inserted in a prompt, or an empty string for the user's own journal. */
export function subjectBlock(subject: TrackedSubject | undefined): string {
  const statement = subject ? buildSubjectStatement(subject) : '';
  return statement ? `\n${statement}\n` : '';
}
