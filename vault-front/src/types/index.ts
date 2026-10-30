export interface UserPreferences {
  reminderEnabled: boolean;
  /** Heure locale du rappel, "HH:MM" par quart d'heure. */
  reminderTime: string;
  timezone: string;
  quickCheckinFieldId?: string;
  aiIncludeNotes: boolean;
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

