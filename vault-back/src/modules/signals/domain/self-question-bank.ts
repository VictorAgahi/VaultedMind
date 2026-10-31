import type { ConstructKey } from './constructs.js';
import {
  INTENSITY_LEVEL_LABELS,
  eventQuestion,
  themeQuestion,
  type BankQuestion,
  type NoulQuestion,
  type ScoreQuestion,
} from './question-types.js';

export const EVENT_QUESTIONS: NoulQuestion[] = [
  eventQuestion(
    'conflict',
    'conflict',
    'Tension',
    "La personne décrit-elle une tension ou un conflit avec quelqu'un ?",
  ),
  eventQuestion(
    'physical_activity',
    'physical_activity',
    'Sport',
    'La personne décrit-elle une activité physique ou sportive ?',
  ),
  eventQuestion(
    'social_time',
    'social',
    'Moment avec des proches',
    'La personne décrit-elle un moment passé avec des proches ou des amis ?',
  ),
  eventQuestion(
    'busy_work',
    'work',
    'Journée chargée',
    "La personne décrit-elle une journée de travail ou d'études chargée ou stressante ?",
  ),
  eventQuestion(
    'poor_sleep',
    'sleep',
    'Mauvaise nuit',
    'La personne décrit-elle une mauvaise nuit ou un manque de sommeil ?',
  ),
  eventQuestion(
    'alcohol',
    'substances',
    'Alcool',
    "La personne décrit-elle une consommation d'alcool ?",
  ),
  eventQuestion(
    'other_substance',
    'substances',
    'Autre substance',
    "La personne décrit-elle une consommation de cannabis ou d'une autre substance ?",
  ),
  eventQuestion(
    'late_screens',
    'screens',
    'Écrans tardifs',
    'La personne décrit-elle des écrans ou des réseaux sociaux tard le soir ou en excès ?',
  ),
  eventQuestion(
    'outdoors',
    'outdoors',
    'Dehors',
    'La personne décrit-elle du temps passé dehors ou dans la nature ?',
  ),
  eventQuestion(
    'accomplishment',
    'achievement',
    'Accomplissement',
    'La personne décrit-elle un accomplissement ou un sentiment de fierté ?',
  ),
  eventQuestion(
    'bad_news',
    'other',
    'Imprévu',
    'La note mentionne-t-elle un imprévu ou une mauvaise nouvelle ?',
  ),
  eventQuestion(
    'pleasure',
    'pleasure',
    'Détente',
    'La personne décrit-elle un moment de détente ou de plaisir choisi ?',
  ),
  eventQuestion(
    'physical_pain',
    'pain',
    'Douleur',
    'La personne décrit-elle une douleur ou un symptôme physique ?',
  ),
  eventQuestion(
    'avoidance',
    'avoidance',
    'Évitement',
    "La personne décrit-elle de la procrastination ou l'évitement de quelque chose ?",
  ),
];

const SELF_DAY_PHRASE = 'cette journée';

const theme = (
  key: string,
  construct: ConstructKey,
  label: string,
  subject: string,
): ScoreQuestion =>
  themeQuestion(key, construct, label, subject, SELF_DAY_PHRASE);

export const THEME_QUESTIONS: ScoreQuestion[] = [
  theme('work_studies', 'work', 'Travail', 'le travail ou les études'),
  theme('romance', 'romance', 'Couple', 'le couple ou la vie amoureuse'),
  theme('family', 'family', 'Famille', 'la famille'),
  theme('friends', 'social', 'Amis', 'les amis et la vie sociale'),
  theme(
    'physical_health',
    'physical_health',
    'Santé physique',
    'la santé physique',
  ),
  theme('money', 'money', 'Argent', "l'argent"),
  theme('future', 'future', 'Avenir', "l'avenir, les projets ou l'incertitude"),
];

export const STATE_QUESTIONS: ScoreQuestion[] = [
  {
    key: 'rumination',
    category: 'state',
    construct: 'rumination',
    type: 'score',
    label: 'Rumination',
    instructions:
      'Dans quelle mesure la personne exprime-t-elle des pensées négatives qui tournent en boucle sur un même sujet ?',
    criteria: [
      'Aucune pensée négative répétitive',
      'Une pensée négative évoquée une fois, sans insistance',
      'Une pensée négative revient plusieurs fois dans la note',
      'Des pensées négatives sur un même sujet reviennent souvent et semblent difficiles à lâcher',
      'La note tourne en boucle autour de pensées négatives sur un même sujet',
    ],
    levelLabels: INTENSITY_LEVEL_LABELS,
  },
  {
    key: 'expressed_anxiety',
    category: 'state',
    construct: 'anxiety',
    type: 'score',
    label: 'Anxiété',
    instructions:
      "Dans quelle mesure la personne exprime-t-elle de l'anxiété ou de l'inquiétude ?",
    criteria: [
      'Aucune anxiété ni inquiétude exprimée',
      'Une légère inquiétude passagère',
      'Une inquiétude nette sur un ou deux sujets',
      'Une anxiété marquée qui pèse sur la journée',
      'Une anxiété très forte qui envahit la journée',
    ],
    levelLabels: INTENSITY_LEVEL_LABELS,
  },
  {
    key: 'low_mood',
    category: 'state',
    construct: 'mood',
    type: 'score',
    label: 'Humeur basse',
    instructions:
      'Dans quelle mesure la personne exprime-t-elle de la tristesse ou une humeur basse ?',
    criteria: [
      'Aucune tristesse exprimée',
      'Une légère tristesse passagère',
      'Une tristesse nette à certains moments',
      'Une tristesse marquée qui pèse sur la journée',
      'Une tristesse très forte qui domine la journée',
    ],
    levelLabels: INTENSITY_LEVEL_LABELS,
  },
  {
    key: 'fatigue',
    category: 'state',
    construct: 'fatigue',
    type: 'score',
    label: 'Fatigue',
    instructions:
      'Dans quelle mesure la personne exprime-t-elle de la fatigue ?',
    criteria: [
      'Aucune fatigue exprimée',
      'Une légère fatigue passagère',
      'Une fatigue nette mais gérable',
      'Une fatigue marquée qui limite la journée',
      'Un épuisement qui domine la journée',
    ],
    levelLabels: ['Aucune', 'Légère', 'Modérée', 'Forte', 'Épuisement'],
  },
  {
    key: 'sense_of_control',
    category: 'state',
    construct: 'control',
    type: 'score',
    label: 'Contrôle',
    instructions:
      'Dans quelle mesure la personne a-t-elle le sentiment de maîtriser sa journée ?',
    criteria: [
      'Sentiment de subir la journée, aucune maîtrise',
      'Peu de maîtrise, la journée échappe souvent',
      'Maîtrise partielle de la journée',
      'Bonne maîtrise de la journée',
      'Sentiment de plein contrôle de la journée',
    ],
    levelLabels: ['Aucun', 'Faible', 'Partiel', 'Bon', 'Fort'],
    lowEndIsNotable: true,
  },
  {
    key: 'overall_tone',
    category: 'state',
    construct: 'mood',
    type: 'score',
    label: 'Tonalité',
    instructions: 'Quelle est la tonalité générale de la note ?',
    criteria: [
      'Très négative',
      'Plutôt négative',
      'Neutre ou mitigée',
      'Plutôt positive',
      'Très positive',
    ],
    levelLabels: [
      'très négative',
      'plutôt négative',
      'neutre',
      'plutôt positive',
      'très positive',
    ],
    lowEndIsNotable: true,
  },
  {
    key: 'loneliness',
    category: 'state',
    construct: 'loneliness',
    type: 'score',
    label: 'Solitude',
    instructions:
      'Dans quelle mesure la personne exprime-t-elle un sentiment de solitude ?',
    criteria: [
      'Aucun sentiment de solitude exprimé',
      'Un léger sentiment de solitude passager',
      'Un sentiment de solitude net à certains moments',
      'Un sentiment de solitude marqué qui pèse sur la journée',
      'Un sentiment de solitude très fort qui domine la journée',
    ],
    levelLabels: INTENSITY_LEVEL_LABELS,
  },
  {
    key: 'self_criticism',
    category: 'state',
    construct: 'self_view',
    type: 'score',
    label: 'Autocritique',
    instructions:
      "Comment la personne parle-t-elle d'elle-même dans cette note ?",
    criteria: [
      'Bienveillance envers soi',
      'Regard neutre ou nuancé sur soi',
      'Quelques reproches envers soi',
      'Autocritique marquée et fréquente',
      'Autocritique très dure, dévalorisation',
    ],
    levelLabels: ['bienveillante', 'neutre', 'légère', 'forte', 'très dure'],
  },
];

export const STATIC_QUESTION_BANK: BankQuestion[] = [
  ...EVENT_QUESTIONS,
  ...THEME_QUESTIONS,
  ...STATE_QUESTIONS,
];
