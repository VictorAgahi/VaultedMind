export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
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
}

export enum FieldType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
}

export interface CustomField {
  id: string;
  name: string;
  fieldType: FieldType;
  isActive: boolean;
  optionsOrder?: string[];
  createdAt: string;
}

export interface CreateCustomFieldDto {
  name: string;
  fieldType: FieldType;
  optionsOrder?: string[];
}

export interface UpdateCustomFieldDto {
  name?: string;
  isActive?: boolean;
  optionsOrder?: string[];
}

export interface FieldValue {
  id: string;
  dailyLogId: string;
  customFieldId: string;
  value: string;
  createdAt: string;
}

export interface DailyLog {
  id: string;
  logDate: string;
  notes?: string;
  createdAt: string;
  fieldValues?: FieldValue[];
}

export interface CreateDailyLogDto {
  logDate: string;
  notes?: string;
}

export interface UpdateDailyLogDto {
  logDate?: string;
  notes?: string;
}

export interface SaveFieldValueDto {
  customFieldId: string;
  value: string;
}

export interface BulkRowDto {
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
