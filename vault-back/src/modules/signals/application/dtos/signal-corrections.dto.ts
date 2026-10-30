import { IsObject } from 'class-validator';

export class SaveSignalCorrectionsDto {
  /** Per signal key: the corrected value, or null to remove the override. */
  @IsObject()
  corrections!: Record<string, number | null>;
}
