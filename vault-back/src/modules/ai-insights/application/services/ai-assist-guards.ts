import { HttpException, HttpStatus } from '@nestjs/common';
import type { User } from '../../../user/domain/entities/user.entity.js';
import {
  AIChatUsageRepository,
  type AIUsageKind,
} from '../../../../database/repositories/ai-chat-usage.repository.js';
import { AIConsentRequiredException } from '../../domain/exceptions/ai-consent-required.exception.js';

/** Voice entry sends the journal's own words to the AI provider: consent with notes is required. */
export function assertNotesConsent(user: User): void {
  if (!user.aiInsightsEnabled || !user.allowsNotesInAI()) {
    throw new AIConsentRequiredException();
  }
}

function formatCooldown(cooldownRemainingMs: number): string {
  const hours = Math.floor(cooldownRemainingMs / (60 * 60 * 1000));
  const minutes = Math.ceil(
    (cooldownRemainingMs % (60 * 60 * 1000)) / (60 * 1000),
  );
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

/**
 * Reserves one usage before the paid call and returns its id; throws a 429 when the daily
 * budget is spent. The caller releases the reservation if the call fails.
 */
export async function reserveDailyUsage(
  usageRepository: AIChatUsageRepository,
  userId: string,
  kind: AIUsageKind,
  label: string,
): Promise<string> {
  const { status, usageId } = await usageRepository.tryReserve(userId, kind);
  if (usageId) return usageId;
  throw new HttpException(
    {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      code: 'AI_RATE_LIMITED',
      message: `Limite atteinte : ${status.maxAllowed} ${label} par jour. Disponible de nouveau dans ${formatCooldown(status.cooldownRemainingMs)}.`,
      nextAvailableAt: status.nextAvailableAt,
    },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}
