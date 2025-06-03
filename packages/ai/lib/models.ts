import { createOpenAI } from '@ai-sdk/openai';
import { chaves } from '../chaves';

const openai = createOpenAI({
  apiKey: chaves().OPENAI_API_KEY,
  compatibility: 'strict',
});

export const models = {
  chat: openai('gpt-4o-mini'),
  embeddings: openai('text-embedding-3-small'),
};
