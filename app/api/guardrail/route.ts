import { NextRequest, NextResponse } from 'next/server';
import { openaiClient } from '@/app/libs/openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { messageSchema } from '@/app/agents/types';
import { cosineSimilarity } from '@/app/libs/utils';

const CONFIDENCE_THRESHOLD = 4;
const SIMILARITY_THRESHOLD = 0.4;

const guardrailRequestSchema = z.object({
	messages: z.array(messageSchema).min(1),
});

const guardrailResponseSchema = z.object({
	isOnTopic: z
		.boolean()
		.describe('Whether the query is about a business problem ImagineSoftware could help with'),
	clarification: z
		.string()
		.nullable()
		.describe(
			'If off-topic, a helpful message explaining what ImagineSoftware can help with'
		),
	refinedQuery: z
		.string()
		.describe('The refined query with typos fixed and unnecessary words removed'),
	confidence: z
		.number()
		.min(1)
		.max(10)
		.describe(
			'Confidence score: 1-3 for off-topic, 4-6 for ambiguous, 7-10 for clear business problems'
		),
});

// Few-shot examples commented out - system prompt + schema should be sufficient
// Uncomment if you notice quality issues with classification
/*
const fewShotExamples = [
	// High Confidence - RCM business problems
	{
		isOnTopic: true,
		refinedQuery: 'Radiology practice struggling with high denial rates and slow collections',
		confidence: 9,
		clarification: null,
	},
	{
		isOnTopic: true,
		refinedQuery: 'Oncology practice losing money due to drug underpayments from payers',
		confidence: 9,
		clarification: null,
	},
	{
		isOnTopic: true,
		refinedQuery: 'Looking to bring billing in-house from problematic third-party vendor',
		confidence: 9,
		clarification: null,
	},
	{
		isOnTopic: true,
		refinedQuery: 'Need help with billing automation during rapid practice growth',
		confidence: 8,
		clarification: null,
	},
	{
		isOnTopic: true,
		refinedQuery: 'Urgent care center with outsourced billing issues and revenue loss',
		confidence: 9,
		clarification: null,
	},

	// Medium Confidence
	{
		isOnTopic: true,
		refinedQuery: 'Having billing problems at my medical practice',
		confidence: 6,
		clarification: null,
	},

	// Off-topic queries
	{
		isOnTopic: false,
		refinedQuery: 'What is the weather in Tokyo?',
		confidence: 1,
		clarification:
			'I can help you understand how ImagineSoftware addresses healthcare revenue cycle challenges like billing automation, denial management, and practice growth. What billing or RCM challenge are you facing?',
	},
	{
		isOnTopic: false,
		refinedQuery: 'Tell me a joke',
		confidence: 1,
		clarification:
			'I specialize in helping medical practices understand how ImagineSoftware can solve their billing and revenue cycle challenges. Do you have an RCM problem I can help with?',
	},
	{
		isOnTopic: false,
		refinedQuery: 'Write code for a sorting algorithm',
		confidence: 2,
		clarification:
			'I focus on healthcare revenue cycle management questions. If you have questions about medical billing, claims management, or practice financial performance, I am happy to help.',
	},
];
*/

export async function POST(req: NextRequest) {
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

		console.log('Layer 1 (LLM) Result:', {
			isOnTopic,
			confidence,
			hasClarification: !!clarification,
		});

		// First rejection point: LLM says off-topic or low confidence
		if (!isOnTopic || (confidence && confidence < CONFIDENCE_THRESHOLD)) {
			console.log('Rejected by Layer 1 (LLM classification)');

			return NextResponse.json({
				accepted: false,
				query: refinedQuery,
				confidence,
				similarityScore: null,
			clarification:
				clarification ||
				'I can help you understand how ImagineSoftware addresses healthcare revenue cycle challenges. What billing or RCM problem are you facing?',
				rejectedBy: 'llm_classification',
			});
		}

		// Layer 2: Embedding Similarity Check
		const [queryEmbedding, domainEmbedding] = await Promise.all([
			openaiClient.embeddings.create({
				model: 'text-embedding-3-small',
				dimensions: 512,
				input: refinedQuery ?? '',
			}),
		openaiClient.embeddings.create({
			model: 'text-embedding-3-small',
			dimensions: 512,
			input: `Healthcare revenue cycle management. Medical billing challenges. Claims denials and appeals. Payment posting automation. Patient collections. Accounts receivable optimization. Third-party billing problems. In-house billing transition. Practice management software. Healthcare analytics. Radiology billing. Oncology billing. Anesthesiology billing. Pathology billing. Urgent care billing. Outsourced billing vendor issues. Revenue leakage. Days in AR. Clean claim rate. Case study. Client success story. How did you help. Tell me more about. Implementation results. Customer outcomes. Practice management company. Billing company. Medical group. ImagineSoftware products and tools. ImagineOne platform. ImagineBilling system. ImagineAppliance automation. ImaginePay patient payments. ImagineCo-Pilot AI assistant. ImagineIntelligence analytics. AutoCoder coding automation. Charge Central. Criteria Builder. What is ImagineOne. How does ImagineBilling work. Tell me about the tools.`,
		}),
		]);

		const similarityScore = cosineSimilarity(
			queryEmbedding.data[0].embedding,
			domainEmbedding.data[0].embedding
		);

		console.log('Layer 2 (Embedding) Result:', {
			similarityScore: similarityScore.toFixed(4),
			threshold: SIMILARITY_THRESHOLD,
			passed: similarityScore >= SIMILARITY_THRESHOLD,
		});

		// Second rejection point: embedding similarity too low
		if (similarityScore < SIMILARITY_THRESHOLD) {
			console.log('Rejected by Layer 2 (embedding similarity)');

			return NextResponse.json({
				accepted: false,
				query: refinedQuery,
				confidence,
				similarityScore,
		clarification:
				'Your query seems outside my expertise. I specialize in helping medical practices understand how ImagineSoftware can address billing, revenue cycle, and practice management challenges.',
				rejectedBy: 'embedding_similarity',
			});
		}

		// Query accepted
		console.log('Query accepted:', { confidence, similarityScore });

		return NextResponse.json({
			accepted: true,
			query: refinedQuery,
			confidence,
			similarityScore,
		});
	} catch (error) {
		console.error('Error in guardrail:', error);
		return NextResponse.json(
			{ error: 'Failed to process query' },
			{ status: 500 }
		);
	}
}
