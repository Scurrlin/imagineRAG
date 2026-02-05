/**
 * Cohere Client Configuration
 *
 * Used for re-ranking search results to improve retrieval quality.
 *
 * Models:
 *   - rerank-english-v3.0: Best for English content, up to 4096 tokens
 *   - rerank-multilingual-v3.0: Supports 100+ languages
 *
 * Learn more: https://docs.cohere.com/docs/reranking
 */

import { CohereClient } from 'cohere-ai';
import { env } from '@/app/config';

export const cohereClient = new CohereClient({
	token: env.COHERE_RERANK_API,
});
