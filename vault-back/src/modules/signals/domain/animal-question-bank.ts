import {
  INTENSITY_LEVEL_LABELS,
  eventQuestion,
  type BankQuestion,
  type ScoreQuestion,
} from './question-types.js';
import type { ConstructKey } from './constructs.js';
import { describeSubject, type TrackedSubject } from './tracked-subject.js';

type AnimalEventDefinition = [
  key: string,
  construct: ConstructKey,
  label: string,
  /** Receives the subject noun phrase, e.g. "Mochi (le chat)". */
  instructions: (animal: string) => string,
];

const ANIMAL_EVENTS: AnimalEventDefinition[] = [
  [
    'aggression',
    'aggression',
    'Agressivité',
    (animal) =>
      `La note décrit-elle un comportement agressif de ${animal} (griffer, mordre, feuler, attaquer) ?`,
  ],
  [
    'house_soiling',
    'elimination',
    'Malpropreté',
    (animal) =>
      `La note décrit-elle ${animal} qui urine ou fait ses selles hors de sa litière ou de l'endroit habituel ?`,
  ],
  [
    'excessive_vocalisation',
    'stress',
    'Vocalises excessives',
    (animal) =>
      `La note décrit-elle des vocalises excessives de ${animal} (miaulements, aboiements, cris, gémissements) ?`,
  ],
  [
    'hiding',
    'stress',
    'Se cache',
    (animal) => `La note décrit-elle ${animal} qui se cache ou s'isole ?`,
  ],
  [
    'destructive_behaviour',
    'other',
    'Destructions',
    (animal) =>
      `La note décrit-elle un comportement destructeur de ${animal} (objets, meubles, griffades sur les surfaces) ?`,
  ],
  [
    'play',
    'play',
    'Jeu',
    (animal) => `La note décrit-elle un moment de jeu de ${animal} ?`,
  ],
  [
    'appetite_problem',
    'appetite',
    'Mange peu',
    (animal) => `La note décrit-elle ${animal} qui mange peu ou pas du tout ?`,
  ],
  [
    'vomiting',
    'physical_health',
    'Vomissements',
    (animal) => `La note décrit-elle des vomissements de ${animal} ?`,
  ],
  [
    'grooming_excess',
    'stress',
    'Toilettage excessif',
    (animal) =>
      `La note décrit-elle ${animal} qui se lèche, se gratte ou se toilette de façon excessive ?`,
  ],
  [
    'strangers_visit',
    'environment_change',
    'Visite',
    () =>
      `La note décrit-elle la visite de personnes que l'animal ne connaît pas ?`,
  ],
  [
    'loud_noise',
    'environment_change',
    'Bruit ou agitation',
    () =>
      `La note décrit-elle du bruit fort ou une activité inhabituelle à la maison (travaux, fête, orage, feux d'artifice) ?`,
  ],
  [
    'owner_absence',
    'solitude',
    'Absence',
    (animal) =>
      `La note décrit-elle une absence de son humain ou un long moment passé seul pour ${animal} ?`,
  ],
  [
    'routine_change',
    'environment_change',
    'Changement de routine',
    (animal) =>
      `La note décrit-elle un changement de routine ou d'environnement pour ${animal} (horaires, déménagement, nouveau meuble, nouvelle nourriture) ?`,
  ],
  [
    'other_animal_tension',
    'conflict',
    'Tension avec un animal',
    (animal) =>
      `La note décrit-elle une interaction tendue entre ${animal} et un autre animal ?`,
  ],
  [
    'vet_or_medication',
    'vet',
    'Vétérinaire ou traitement',
    (animal) =>
      `La note décrit-elle une visite chez le vétérinaire ou un traitement donné à ${animal} ?`,
  ],
  [
    'outdoor_access',
    'outdoors',
    'Sorties',
    (animal) =>
      `La note décrit-elle une sortie ou un accès à l'extérieur pour ${animal} ?`,
  ],
];

interface AnimalScoreDefinition {
  key: string;
  construct: ConstructKey;
  label: string;
  instructions: (animal: string) => string;
  criteria: string[];
  levelLabels: string[];
  lowEndIsNotable?: boolean;
}

const ANIMAL_STATES: AnimalScoreDefinition[] = [
  {
    key: 'stress_level',
    construct: 'stress',
    label: 'Stress',
    instructions: (animal) =>
      `Quel est le niveau de stress ou d'anxiété de ${animal} d'après la note ?`,
    criteria: [
      'Aucun signe de stress ou d’anxiété',
      'Un léger signe de stress passager',
      'Des signes nets de stress à certains moments',
      'Un stress marqué qui pèse sur la journée',
      'Un stress très fort qui domine la journée',
    ],
    levelLabels: INTENSITY_LEVEL_LABELS,
  },
  {
    key: 'energy_level',
    construct: 'fatigue',
    label: 'Énergie',
    instructions: (animal) =>
      `Quel est le niveau d'énergie et d'activité de ${animal} d'après la note ?`,
    criteria: [
      'Très peu actif, abattu ou léthargique',
      'Peu actif, plus calme que d’habitude',
      'Niveau d’activité normal',
      'Actif, plein d’énergie',
      'Très actif, surexcité',
    ],
    levelLabels: ['Abattu', 'Faible', 'Normale', 'Élevée', 'Très élevée'],
    lowEndIsNotable: true,
  },
  {
    key: 'seeks_contact',
    construct: 'social',
    label: 'Contact',
    instructions: (animal) =>
      `Quel est le niveau de recherche de contact et de compagnie de ${animal} d'après la note ?`,
    criteria: [
      'Évite tout contact',
      'Cherche peu le contact',
      'Cherche le contact comme d’habitude',
      'Cherche souvent le contact',
      'Cherche le contact en permanence',
    ],
    levelLabels: ['Évite', 'Peu', 'Habituel', 'Souvent', 'En permanence'],
    lowEndIsNotable: true,
  },
  {
    key: 'calm',
    construct: 'mood',
    label: 'Calme',
    instructions: (animal) =>
      `Quel est le niveau de calme et de détente de ${animal} d'après la note ?`,
    criteria: [
      'Jamais calme, agité toute la journée',
      'Rarement calme',
      'Calme par moments',
      'Plutôt calme et détendu',
      'Très calme et détendu toute la journée',
    ],
    levelLabels: [
      'Agité',
      'Rarement',
      'Par moments',
      'Plutôt calme',
      'Très calme',
    ],
    lowEndIsNotable: true,
  },
];

/** The bank for a tracked animal: events and states about its behaviour, written for its observer. */
export function buildAnimalQuestionBank(
  subject: TrackedSubject,
): BankQuestion[] {
  const animal = describeSubject(subject);
  return [
    ...ANIMAL_EVENTS.map(([key, construct, label, instructions]) =>
      eventQuestion(key, construct, label, instructions(animal)),
    ),
    ...ANIMAL_STATES.map(
      (definition): ScoreQuestion => ({
        key: definition.key,
        category: 'state',
        construct: definition.construct,
        type: 'score',
        label: definition.label,
        instructions: definition.instructions(animal),
        criteria: definition.criteria,
        levelLabels: definition.levelLabels,
        ...(definition.lowEndIsNotable && { lowEndIsNotable: true }),
      }),
    ),
  ];
}
