import { ForbiddenException } from '@nestjs/common';

export class AIConsentRequiredException extends ForbiddenException {
  constructor() {
    super({
      statusCode: 403,
      code: 'AI_CONSENT_REQUIRED',
      message:
        "Pour utiliser l'IA, acceptez d'abord l'envoi de vos données au service d'IA (OpenAI) depuis l'espace IA.",
    });
  }
}
