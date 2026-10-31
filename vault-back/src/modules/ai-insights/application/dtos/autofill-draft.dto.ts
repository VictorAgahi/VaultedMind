import { IsDateString, IsString, Matches, MaxLength } from 'class-validator';

export const AUTOFILL_TEXT_MAX_LENGTH = 20000;

export class AutofillDraftDto {
  @IsString()
  @Matches(/\S/, { message: 'text must not be blank' })
  @MaxLength(AUTOFILL_TEXT_MAX_LENGTH)
  text!: string;

  @IsDateString()
  logDate!: string;
}

export class AutofillProposalResponseDto {
  fieldId!: string;
  value!: string;
  quote!: string;
}

export class AutofillDraftResponseDto {
  proposals!: AutofillProposalResponseDto[];
  skippedFieldIds!: string[];
}

export class VoiceTranscriptionResponseDto {
  text!: string;
}
