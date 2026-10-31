export interface UserPreferences {
  reminderEnabled: boolean;
  /** Heure locale du rappel, "HH:MM" par quart d'heure. */
  reminderTime: string;
  timezone: string;
  quickCheckinFieldId?: string;
  aiIncludeNotes: boolean;
  insightsV2Enabled?: boolean;
  people?: Person[];
  trackedSubject?: TrackedSubject;
  customSignals?: CustomSignal[];
  insightTargets?: InsightTarget[];
}

export type TrackedSubjectKind = "SELF" | "ANIMAL" | "OTHER_PERSON";

/** Qui est suivi : l'utilisateur, son animal ou une autre personne dont il note les journées. */
export interface TrackedSubject {
  kind: TrackedSubjectKind;
  name?: string;
  /** Animaux seulement, par exemple « chat ». */
  species?: string;
}

/** Question oui/non écrite par l'utilisateur, posée sur chaque note. */
export interface CustomSignal {
  id: string;
  label: string;
  question: string;
  kind: "yes_no";
}

/** NEUTRAL : comprendre ce qui fait varier le repère, sans sens souhaité. */
export type TargetDirection = "HIGHER_IS_BETTER" | "LOWER_IS_BETTER" | "NEUTRAL";

/** Ce que l'utilisateur veut comprendre : un champ (ou une valeur d'un champ texte) et le sens qui est le bon. */
export interface InsightTarget {
  fieldId: string;
  direction: TargetDirection;
  /** Champ texte seulement : le repère est alors "le champ vaut cette valeur". */
  value?: string;
}

/** Personne de l'entourage : seul l'alias quitte le serveur, les variantes sont remplacées avant l'envoi. */
export interface Person {
  id: string;
  alias: string;
  variants: string[];
}

export interface SignalView {
  key: string;
  category: "event" | "theme" | "state" | "person" | "custom";
  label: string;
  type: "noul" | "score";
  value: number;
  confidence?: number;
  levelLabel?: string;
  levelLabels?: string[];
  toneLabel?: string | null;
  corrected: boolean;
  displayed: boolean;
  dismissValue: number;
}

export interface UserConsents {
  healthDataConsentAt?: string;
  aiConsentAt?: string;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  createdAt?: string;
  preferences?: UserPreferences;
  consents?: UserConsents;
  aiInsightsEnabled?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CreateApiKeyDto {
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface AppError extends Error {
  statusCode?: number;
  errors?: Record<string, string[]>;
}

export interface ApiError {
  message: string;
  statusCode: number;
  code?: string;
  errors?: Record<string, string[]>;
}

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface RegisterData {
  email: string;
  password?: string;
  firstName?: string;
  /** Consentement explicite et distinct au traitement des données de santé (RGPD art. 9). */
  healthDataConsent: boolean;
}

export enum FieldType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
}

export enum AppleWatchMetric {
  SLEEP = 'SLEEP',
  STEPS = 'STEPS',
  ACTIVE_CALORIES = 'ACTIVE_CALORIES',
  RESTING_HEART_RATE = 'RESTING_HEART_RATE',
  WATER_CONSUMPTION = 'WATER_CONSUMPTION',
  MINDFULNESS_MINUTES = 'MINDFULNESS_MINUTES',
  HEART_RATE_VARIABILITY = 'HEART_RATE_VARIABILITY',
  EXERCISE_MINUTES = 'EXERCISE_MINUTES',
  DAYLIGHT_MINUTES = 'DAYLIGHT_MINUTES',
  RESPIRATORY_RATE = 'RESPIRATORY_RATE',
  BEDTIME = 'BEDTIME',
  SLEEP_DEEP = 'SLEEP_DEEP',
  SLEEP_REM = 'SLEEP_REM',
  SLEEP_CORE = 'SLEEP_CORE',
  SLEEP_AWAKE = 'SLEEP_AWAKE',
}

export interface SubFieldDefinition {
  id: string;
  triggerValue: string;
  name: string;
  fieldType: FieldType;
  optionsOrder?: string[];
  placeholder?: string;
  required?: boolean;
}

export interface CustomField {
  id: string;
  name: string;
  fieldType: FieldType;
  isActive: boolean;
  optionsOrder?: string[];
  subFields?: SubFieldDefinition[];
  category?: string;
  rememberLastValue: boolean;
  min?: number;
  max?: number;
  appleWatchMetric?: AppleWatchMetric;
  /** Unité dans laquelle le champ reçoit une durée Santé ; absente : l'unité propre à la donnée. */
  appleWatchUnit?: HealthFieldUnit;
  /** Réponse à une modification : jours passés remplis depuis les données Santé lors d'un nouveau lien. */
  healthFilledDays?: number;
  /** Objectif hebdomadaire : nombre de jours (oui/non) ou moyenne (nombre). */
  goalTarget?: number;
  goalDirection?: "AT_LEAST" | "AT_MOST";
  /** Ce que mesure le champ, classé automatiquement. */
  construct?: string;
  /** Choix de la personne, prioritaire sur le classement automatique. */
  constructOverride?: string;
  /** Remplissage depuis le récit de la journée : automatique (champs factuels), toujours ou jamais. */
  autofillMode?: AutofillMode;
  createdAt: string;
}

export type AutofillMode = "AUTO" | "ON" | "OFF";

/** Unité d'une durée Santé dans un champ (sommeil, phases, exercice). */
export type HealthFieldUnit = "hours" | "minutes";

export interface HealthProposal {
  metric: AppleWatchMetric;
  label: string;
  unitLabel: string;
  exampleValue: number | null;
  exampleDate: string | null;
  status: "PENDING_LINK" | "PENDING_NEW";
  relevance: "high" | "low";
  fieldId: string | null;
  fieldName: string | null;
  unit: HealthFieldUnit | null;
  suggestedName: string | null;
  confidence: number | null;
  reason: string | null;
}

export interface HealthProposals {
  proposals: HealthProposal[];
  ignored: { metric: AppleWatchMetric; label: string }[];
  autoLinked: { metric: AppleWatchMetric; label: string; fieldId: string; fieldName: string; decidedAt: string }[];
  legacyFields: { id: string; name: string; metric: AppleWatchMetric }[];
}

export interface AcceptHealthProposalDto {
  fieldId?: string;
  unit?: HealthFieldUnit;
  create?: { name: string; category?: string };
}

export interface HealthProposalAcceptResult {
  metric: AppleWatchMetric;
  fieldId: string;
  fieldName: string;
  unit: HealthFieldUnit | null;
  created: boolean;
  filledDays: number;
}

export interface CreateCustomFieldDto {
  name: string;
  fieldType: FieldType;
  optionsOrder?: string[];
  subFields?: SubFieldDefinition[];
  category?: string;
  rememberLastValue?: boolean;
  min?: number;
  max?: number;
  appleWatchMetric?: AppleWatchMetric;
  goalTarget?: number | null;
  goalDirection?: "AT_LEAST" | "AT_MOST" | null;
  constructOverride?: string | null;
  autofillMode?: AutofillMode;
}

export interface UpdateCustomFieldDto {
  name?: string;
  isActive?: boolean;
  optionsOrder?: string[];
  subFields?: SubFieldDefinition[];
  category?: string;
  rememberLastValue?: boolean;
  min?: number;
  max?: number;
  /** null retire le lien avec Apple Santé. */
  appleWatchMetric?: AppleWatchMetric | null;
  /** Absente avec une donnée : déduite du champ par le serveur. */
  appleWatchUnit?: HealthFieldUnit | null;
  goalTarget?: number | null;
  goalDirection?: "AT_LEAST" | "AT_MOST" | null;
  constructOverride?: string | null;
  autofillMode?: AutofillMode;
}

export interface FieldValue {
  id: string;
  dailyLogId: string;
  customFieldId: string;
  value: string;
  subValues?: Record<string, string>;
  /** « agent » : proposition acceptée ; « health » : écrite par la synchronisation Santé ; null : saisie à la main. */
  source?: "agent" | "health" | null;
  createdAt: string;
}

export interface DailyLog {
  id: string;
  logDate: string;
  notes?: string;
  /** Version reformulée des notes dictées ; null si absente ou périmée. */
  notesClean?: string | null;
  /** Ce qui a été retenu de la note ; null si absent ou périmé. */
  signals?: SignalView[] | null;
  createdAt: string;
  fieldValues?: FieldValue[];
  _ts?: number;
  _day?: number;
}



export interface BulkRowDto {
  tempId?: string;
  date: string;
  fields: Record<string, string>;
}

export interface BulkImportDto {
  rows: BulkRowDto[];
}

export interface BulkImportResponseDto {
  logsCreated: number;
  fieldsCreated: number;
  valuesCreated: number;
}

export interface AIInsightResponseDto {
  id: string;
  type: 'DAILY_SUMMARY' | 'WEEKLY_TREND' | 'MONTHLY_TREND' | 'ANOMALY' | 'RECOMMENDATION';
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AIInsightStatusResponseDto {
  enabled: boolean;
  isGenerating: boolean;
  canGenerate: boolean;
  nextAvailableAt: string | null;
  cooldownRemainingMs: number;
  lastGeneratedAt: string | null;
}

export interface AIChatStatusResponseDto {
  count: number;
  maxAllowed: number;
  remaining: number;
  nextAvailableAt: string | null;
  cooldownRemainingMs: number;
}


// ─── Mes leviers (moteur de motifs déterministe) ─────────────────────────────

export type PatternStrength = "solide" | "piste";
export type PatternObviousSource = "user" | "jev";
export type PatternReportStatus = "ok" | "insufficient_data" | "no_targets";

export interface PatternEffect {
  kind: "binary" | "continuous";
  /** Repère oui/non (valeur d'un champ texte) : les moyennes sont alors des fréquences entre 0 et 1. */
  targetBinary?: boolean;
  meanWhenHigh: number;
  meanWhenLow: number;
  countHigh: number;
  countLow: number;
  difference: number;
}

export interface PatternFinding {
  key: string;
  label: string;
  category: string;
  lag: 0 | 1;
  rho: number;
  partial: boolean;
  n: number;
  p: number;
  q: number;
  strength: PatternStrength;
  effect: PatternEffect | null;
  /** Vrai si l'effet va dans le sens voulu par la personne, null si on ne peut pas le dire. */
  favourable: boolean | null;
  /** Jours du prédicteur qui illustrent le mieux le lien ("AAAA-MM-JJ"). */
  exampleDates: string[];
  summary: string;
  /** Identité stable du lien, renvoyée pour enregistrer l'avis de la personne. Absent des anciens rapports. */
  findingKey?: string;
  /** Lien connu de tous. Absent des anciens rapports : traité comme non évident. */
  obvious?: boolean;
  obviousSource?: PatternObviousSource | null;
}

export interface PatternBeforeItem {
  key: string;
  label: string;
  countBefore: number;
  daysBefore: number;
  lift: number | null;
  q: number;
  moreFrequentBefore: boolean;
  summary: string;
}

export interface PatternChangePoint {
  key: string;
  label: string;
  date: string;
  meanBefore: number;
  meanAfter: number;
  favourable: boolean | null;
  summary: string;
}

export interface PatternScoreTextGap {
  date: string;
  summary: string;
}

export interface PatternTargetReport {
  fieldId: string;
  key: string;
  label: string;
  direction: TargetDirection;
  /** Repère "le champ vaut cette valeur" (champ texte). */
  value?: string | null;
  binary?: boolean;
  /** Faux si le champ a été désactivé depuis le calcul. */
  targetStillValid: boolean;
  findings: PatternFinding[];
  beforeDifficultDays: { difficultDayCount: number; items: PatternBeforeItem[] } | null;
  changePoints: PatternChangePoint[];
  scoreTextGaps: PatternScoreTextGap[];
}

export interface PatternReport {
  status: PatternReportStatus;
  computedAt: string;
  daysCovered: number;
  daysLogged: number;
  requiredLoggedDays: number;
  targets: PatternTargetReport[];
  stateChangePoints: PatternChangePoint[];
}

export interface PatternNotComputed {
  status: "not_computed";
}

export type PatternResponse = PatternReport | PatternNotComputed;
