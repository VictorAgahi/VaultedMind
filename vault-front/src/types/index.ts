export interface UserPreferences {
  reminderEnabled: boolean;
  /** Heure locale du rappel, "HH:MM" par quart d'heure. */
  reminderTime: string;
  timezone: string;
  quickCheckinFieldId?: string;
  aiIncludeNotes: boolean;
  insightsV2Enabled?: boolean;
  people?: Person[];
  insightTargets?: InsightTarget[];
}

export type TargetDirection = "HIGHER_IS_BETTER" | "LOWER_IS_BETTER";

/** Ce que l'utilisateur veut comprendre : un champ et le sens qui est le bon. */
export interface InsightTarget {
  fieldId: string;
  direction: TargetDirection;
}

/** Personne de l'entourage : seul l'alias quitte le serveur, les variantes sont remplacées avant l'envoi. */
export interface Person {
  id: string;
  alias: string;
  variants: string[];
}

export interface SignalView {
  key: string;
  category: "event" | "theme" | "state" | "person";
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
  /** Objectif hebdomadaire : nombre de jours (oui/non) ou moyenne (nombre). */
  goalTarget?: number;
  goalDirection?: "AT_LEAST" | "AT_MOST";
  createdAt: string;
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
  appleWatchMetric?: AppleWatchMetric;
  goalTarget?: number | null;
  goalDirection?: "AT_LEAST" | "AT_MOST" | null;
}

export interface FieldValue {
  id: string;
  dailyLogId: string;
  customFieldId: string;
  value: string;
  subValues?: Record<string, string>;
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
export type PatternReportStatus = "ok" | "insufficient_data" | "no_targets";

export interface PatternEffect {
  kind: "binary" | "continuous";
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
