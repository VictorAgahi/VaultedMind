import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';
import type { HealthMetricRelevance } from '../../domain/services/health-metric-catalog.js';
import {
  HEALTH_FIELD_UNITS,
  type HealthFieldUnit,
} from '../../domain/services/health-metric-units.js';
import type { AutoLinkedMetric } from '../services/health-linking-assistant.service.js';

export class CreateProposedFieldDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}

/** Without a body, the proposal is accepted as made. */
export class AcceptHealthProposalDto {
  /** Links another field than the proposed one. */
  @IsOptional()
  @IsUUID()
  fieldId?: string;

  @IsOptional()
  @IsIn(HEALTH_FIELD_UNITS)
  unit?: HealthFieldUnit;

  /** Creates a new field instead of linking an existing one. */
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateProposedFieldDto)
  create?: CreateProposedFieldDto;
}

export interface HealthProposalView {
  metric: AppleWatchMetric;
  /** French name of the metric. */
  label: string;
  unitLabel: string;
  exampleValue: number | null;
  exampleDate: string | null;
  status: 'PENDING_LINK' | 'PENDING_NEW';
  relevance: HealthMetricRelevance;
  fieldId: string | null;
  fieldName: string | null;
  unit: HealthFieldUnit | null;
  suggestedName: string | null;
  confidence: number | null;
  reason: string | null;
}

export interface HealthMetricSummaryView {
  metric: AppleWatchMetric;
  label: string;
}

export interface HealthAutoLinkView {
  metric: AppleWatchMetric;
  label: string;
  fieldId: string;
  fieldName: string;
  decidedAt: string;
}

export interface LegacyHealthFieldView {
  id: string;
  name: string;
  metric: AppleWatchMetric;
}

export interface HealthProposalsView {
  proposals: HealthProposalView[];
  ignored: HealthMetricSummaryView[];
  /** Links the assistant applied on its own, for the confirmation after a sync. */
  autoLinked: HealthAutoLinkView[];
  /** Fields created automatically by earlier versions of the sync, that the user may clean. */
  legacyFields: LegacyHealthFieldView[];
}

export interface HealthProposalAcceptResult {
  metric: AppleWatchMetric;
  fieldId: string;
  fieldName: string;
  unit: HealthFieldUnit | null;
  created: boolean;
  filledDays: number;
}

export interface HealthProposalsRunResult {
  autoLinked: AutoLinkedMetric[];
  pendingCount: number;
}
