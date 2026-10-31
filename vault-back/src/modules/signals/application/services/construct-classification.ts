import {
  FIELD_CONSTRUCT_QUESTION_KEY,
  buildFieldConstructQuestion,
  parseConstructAnswer,
} from '../../domain/field-construct.js';
import type { Construct } from '../../domain/constructs.js';
import { JevClient } from '../../infrastructure/clients/jev.client.js';

/** Asks Jev which construct a described measure belongs to; anything doubtful is "other". */
export async function classifyConstruct(
  jevClient: JevClient,
  description: string,
): Promise<Construct> {
  const response = await jevClient.analyze(description, {
    [FIELD_CONSTRUCT_QUESTION_KEY]: buildFieldConstructQuestion(),
  });
  return parseConstructAnswer(response.answers[FIELD_CONSTRUCT_QUESTION_KEY]);
}
