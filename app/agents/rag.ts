import { AgentRequest, AgentResponse } from './types';
import { openaiClient } from '@/app/libs/openai';
import { openai } from '@ai-sdk/openai';
import { streamText, tool, stepCountIs } from 'ai';
import { qdrantClient } from '../libs/qdrant';
import { cohereClient } from '../libs/cohere';
import { z } from 'zod';
import {
	QDRANT_COLLECTION,
	EMBEDDING_MODEL,
	EMBEDDING_DIMENSIONS,
	RETRIEVAL_CONFIG,
} from '@/app/config';

const toolInputSchema = z.object({
	query: z.string().describe('The business problem or query to search for'),
});

const retrieveDocumentsTool = tool({
	description:
		'Retrieve relevant case studies and white papers from the ImagineSoftware knowledge base to help answer business problems',
	inputSchema: toolInputSchema,
	execute: async ({ query }) => {
		try {
			// Generate embedding for query
			const embedding = await openaiClient.embeddings.create({
				model: EMBEDDING_MODEL,
				dimensions: EMBEDDING_DIMENSIONS,
				input: query,
			});

			const queryVector = embedding.data[0].embedding;

			// Search without filters, then separate by type
			const allResults = await qdrantClient.search(QDRANT_COLLECTION, {
				vector: queryVector,
				limit: RETRIEVAL_CONFIG.TOTAL_RETRIEVE_LIMIT,
				with_payload: true,
			});

			// Separate results by doc type and limit to max counts
			const caseStudyResults = allResults
				.filter((r) => r.payload?.documentType === 'case_study')
				.slice(0, RETRIEVAL_CONFIG.CASE_STUDY_RETRIEVE_LIMIT);
			const whitePaperResults = allResults
				.filter((r) => r.payload?.documentType === 'white_paper_chunk')
				.slice(0, RETRIEVAL_CONFIG.WHITE_PAPER_RETRIEVE_LIMIT);

			const results: Array<{
				content: string;
				relevanceScore: number;
				metadata: Record<string, unknown>;
			}> = [];

			// Re-rank case studies and take top N
			if (caseStudyResults.length > 0) {
				const rerankedCaseStudies = await cohereClient.rerank({
					model: 'rerank-english-v3.0',
					query: query,
					documents: caseStudyResults.map(
						(result) => result.payload?.content as string
					),
					topN: RETRIEVAL_CONFIG.CASE_STUDY_RERANK_TOP_N,
					returnDocuments: true,
				});

				for (const result of rerankedCaseStudies.results) {
					const originalDoc = caseStudyResults[result.index];
					results.push({
						content: result.document?.text || '',
						relevanceScore: result.relevanceScore,
						metadata: {
							documentType: 'case_study',
							client: originalDoc.payload?.client,
							title: originalDoc.payload?.title,
							challenge: originalDoc.payload?.challenge,
							solution: originalDoc.payload?.solution,
							result: originalDoc.payload?.result,
						},
					});
				}
			}

			// Re-rank white paper chunks and take top N
			if (whitePaperResults.length > 0) {
				const rerankedWhitePapers = await cohereClient.rerank({
					model: 'rerank-english-v3.0',
					query: query,
					documents: whitePaperResults.map(
						(result) => result.payload?.content as string
					),
					topN: RETRIEVAL_CONFIG.WHITE_PAPER_RERANK_TOP_N,
					returnDocuments: true,
				});

				for (const result of rerankedWhitePapers.results) {
					const originalDoc = whitePaperResults[result.index];
					results.push({
						content: result.document?.text || '',
						relevanceScore: result.relevanceScore,
						metadata: {
							documentType: 'white_paper_chunk',
							parentTitle: originalDoc.payload?.parentTitle,
							subtitle: originalDoc.payload?.subtitle,
							theme: originalDoc.payload?.theme,
							chunkType: originalDoc.payload?.chunkType,
							sectionTitle: originalDoc.payload?.sectionTitle,
							sectionType: originalDoc.payload?.sectionType,
							keyPoints: originalDoc.payload?.keyPoints,
						},
					});
				}
			}

			return results;
		} catch {
			return [];
		}
	},
});

export async function ragAgent(request: AgentRequest): Promise<AgentResponse> {
	const { query } = request;

	return streamText({
		model: openai('gpt-4o'),
		tools: {
			retrieve_relevant_documents: retrieveDocumentsTool,
		},
		stopWhen: stepCountIs(3), // Allow up to 3 steps: tool call → result → response
		messages: [
			{
				role: 'system',
				content: `You are a business development assistant for ImagineSoftware. Your role is to help potential clients understand how ImagineSoftware's services could address their business challenges.

## Your Process
**IMPORTANT: You MUST use the retrieve_relevant_documents tool BEFORE responding to any query.**
1. ALWAYS call the retrieve_relevant_documents tool first to find relevant case studies and white papers
2. Only after receiving the tool results should you craft your response

## Response Guidelines
When responding to a potential client:
1. **Acknowledge their specific challenge** - Show you understand their problem
2. **Reference relevant case studies and white papers** - Use the retrieved documents to support your response
3. **Frame solutions around THEIR problem** - Don't just describe what ImagineSoftware does; explain how it applies to their situation
4. **Be specific** - Reference actual client outcomes, challenges solved, and approaches taken from the retrieved documents
5. **Provide detailed explanations** - Give comprehensive information that helps the client understand the potential solution

## Tone
- Professional and consultative
- Helpful and informative, not salesy
- Confident but not overpromising

## Important Rules
- NEVER make up case studies or capabilities not supported by the retrieved documents
- If no relevant documents are found, be honest about the limitation
- Always ground your response in the actual retrieved content`,
			},
			{
				role: 'user',
				content: query,
			},
		],
		temperature: 0.7,
	});
}
