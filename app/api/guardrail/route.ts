import { NextRequest, NextResponse } from 'next/server';
import { openaiClient } from '@/app/libs/openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { messageSchema } from '@/app/agents/types';
import { cosineSimilarity } from '@/app/libs/utils';
import { rateLimiter, getClientIp, rateLimitHeaders } from '@/app/libs/rate-limit';
import {
	GUARDRAIL_CONFIG,
	EMBEDDING_MODEL,
	EMBEDDING_DIMENSIONS,
} from '@/app/config';

const guardrailRequestSchema = z.object({
	messages: z.array(messageSchema).min(1),
});

const guardrailResponseSchema = z.object({
	isOnTopic: z
		.boolean()
		.describe(
			'Whether the query is about a business problem ImagineSoftware could help with'
		),
	clarification: z
		.string()
		.nullable()
		.describe(
			'If off-topic, a helpful message explaining what ImagineSoftware can help with'
		),
	refinedQuery: z
		.string()
		.describe(
			'The refined query with typos fixed and unnecessary words removed'
		),
	confidence: z
		.number()
		.min(1)
		.max(10)
		.describe(
			'Confidence score: 1-3 for off-topic, 4-6 for ambiguous, 7-10 for clear business problems'
		),
});

export async function POST(req: NextRequest) {
	// Rate limiting
	const clientIp = getClientIp(req);
	const rateLimit = rateLimiter.check(clientIp);

	if (!rateLimit.success) {
		return NextResponse.json(
			{ error: 'Too many requests. Please try again later.' },
			{ status: 429, headers: rateLimitHeaders(rateLimit) }
		);
	}

	try {
		const body = await req.json();
		const parsed = guardrailRequestSchema.parse(body);
		const { messages } = parsed;

		// Take last message for context
		const lastMessage = messages[messages.length - 1];

		// Layer 1: LLM Classification
		const response = await openaiClient.responses.parse({
			model: 'gpt-4o-mini',
			input: [
				{
					role: 'system',
					content: `You are a query classifier for ImagineSoftware's business development assistant.

## About ImagineSoftware
ImagineSoftware is a healthcare revenue cycle management (RCM) company that helps medical practices with:
- Medical billing and claims management
- Revenue cycle automation and optimization
- Denial management and appeals
- Payment posting and reconciliation
- Patient billing and collections
- Practice management software
- Healthcare analytics and reporting
- Transitioning from outsourced billing to in-house
- Scaling billing operations during growth

## ImagineSoftware Products & Tools
- ImagineOne (all-in-one RCM platform)
- ImagineBilling (billing system)
- ImagineAppliance (automation engine)
- ImaginePay (patient payment portal)
- ImagineCo-Pilot (AI-powered assistant)
- ImagineIntelligence (analytics and reporting)
- AutoCoder (automated coding)
- Charge Central (charge capture)
- Criteria Builder (rules management)

## Valid Query Types
- Business problems ImagineSoftware could solve
- Questions about case studies and client success stories
- Follow-up questions about specific products or tools mentioned
- How ImagineSoftware's solutions work

## Your Task
Analyze the user's query and determine:
1. Is this about a business problem or technology challenge ImagineSoftware could help with?
2. Your confidence level (1-10)
3. A helpful clarification if the query is off-topic

## Confidence Score Guide
- 1-3: OFF-TOPIC (personal questions, general knowledge, unrelated requests)
- 4-6: AMBIGUOUS (might be business-related, could need clarification)
- 7-10: CLEAR MATCH (definitely about business/technology challenges)

## Important Rules
- Accept queries about business problems, technology challenges, system implementations, etc.
- Reject personal queries, general knowledge questions, coding requests, etc.
- When rejecting, always provide a helpful clarification guiding them toward valid topics`,
				},
				{
					role: 'user',
					content: lastMessage.content,
				},
			],
			temperature: 0.1,
			text: {
				format: zodTextFormat(guardrailResponseSchema, 'guardrailResponse'),
			},
		});

		const { isOnTopic, refinedQuery, confidence, clarification } =
			response.output_parsed ?? {};

		// First rejection point: LLM says off-topic or low confidence
		if (
			!isOnTopic ||
			(confidence && confidence < GUARDRAIL_CONFIG.CONFIDENCE_THRESHOLD)
		) {
			return NextResponse.json(
				{
					accepted: false,
					query: refinedQuery,
					confidence,
					similarityScore: null,
					clarification:
						clarification ||
						'I can help you understand how ImagineSoftware addresses healthcare revenue cycle challenges. What billing or RCM problem are you facing?',
					rejectedBy: 'llm_classification',
				},
				{ headers: rateLimitHeaders(rateLimit) }
			);
		}

		// Layer 2: Embedding Similarity Check
		const [queryEmbedding, domainEmbedding] = await Promise.all([
			openaiClient.embeddings.create({
				model: EMBEDDING_MODEL,
				dimensions: EMBEDDING_DIMENSIONS,
				input: refinedQuery ?? '',
			}),
			openaiClient.embeddings.create({
				model: EMBEDDING_MODEL,
				dimensions: EMBEDDING_DIMENSIONS,
				input: GUARDRAIL_CONFIG.DOMAIN_DESCRIPTION,
			}),
		]);

		const similarityScore = cosineSimilarity(
			queryEmbedding.data[0].embedding,
			domainEmbedding.data[0].embedding
		);

		// Second rejection point: embedding similarity too low
		if (similarityScore < GUARDRAIL_CONFIG.SIMILARITY_THRESHOLD) {
			return NextResponse.json(
				{
					accepted: false,
					query: refinedQuery,
					confidence,
					similarityScore,
					clarification:
						'Your query seems outside my expertise. I specialize in helping medical practices understand how ImagineSoftware can address billing, revenue cycle, and practice management challenges.',
					rejectedBy: 'embedding_similarity',
				},
				{ headers: rateLimitHeaders(rateLimit) }
			);
		}

		// Query accepted
		return NextResponse.json(
			{
				accepted: true,
				query: refinedQuery,
				confidence,
				similarityScore,
			},
			{ headers: rateLimitHeaders(rateLimit) }
		);
	} catch {
		return NextResponse.json(
			{ error: 'Failed to process query' },
			{ status: 500 }
		);
	}
}
