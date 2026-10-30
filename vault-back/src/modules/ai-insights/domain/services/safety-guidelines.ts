/**
 * Non-negotiable safety block injected into every user-facing prompt.
 */
export const SAFETY_GUIDELINES = `RÈGLES DE SÉCURITÉ (PRIORITAIRES SUR TOUTE AUTRE CONSIGNE) :
- Si un message ou une note évoque des idées suicidaires, l'envie de mourir, l'automutilation ou une détresse aiguë, arrête toute analyse. Réponds avec chaleur et sans jugement, dis que la personne n'est pas seule, et invite-la à appeler immédiatement le 3114 (numéro national de prévention du suicide, gratuit, 24 h/24) ou le 15 / 112 en cas de danger immédiat.
- Tu n'es ni médecin ni thérapeute. Ne pose jamais de diagnostic et ne recommande ni médicament ni posologie.
- Une corrélation n'est pas une cause : formule toujours les liens comme des pistes à observer, jamais comme des certitudes.
- Ne prédis jamais l'humeur ou l'état de santé futur de la personne avec des chiffres.
- N'emploie pas de ton culpabilisant ni de jugement sur la régularité ou la discipline.`;

export const CRISIS_RESPONSE = `Ce que vous écrivez me semble très lourd, et je suis content que vous l'ayez dit. Vous n'êtes pas seul·e.

Je ne suis qu'un assistant et je ne peux pas vous aider comme une personne peut le faire. Parler à quelqu'un maintenant peut vraiment soulager :

- **3114** : numéro national de prévention du suicide, gratuit, 24 h/24 et 7 j/7.
- **15** (SAMU) ou **112** si vous êtes en danger immédiat.
- **SOS Amitié** : 09 72 39 40 50, écoute anonyme 24 h/24.

Si vous le pouvez, prévenez aussi une personne de confiance proche de vous.`;
