import { AgentRequest, AgentResponse } from './types';
import { openaiClient } from '@/app/libs/openai';
import { openai } from '@ai-sdk/openai';
import { streamText, tool, stepCountIs } from 'ai';
import { qdrantClient } from '../libs/qdrant';
import { cohereClient } from '../libs/cohere';
import { z } from 'zod';

const COLLECTION_NAME = 'imagineSoftware';

const toolInputSchema = z.object({
	query: z.string().describe('The business problem or query to search for'),
});

// Retrieval configuration
const CASE_STUDY_RETRIEVE_LIMIT = 4;
const CASE_STUDY_RERANK_TOP_N = 1;
const WHITE_PAPER_RETRIEVE_LIMIT = 10;
const WHITE_PAPER_RERANK_TOP_N = 5;

const retrieveDocumentsTool = tool({
	description:
		'Retrieve relevant case studies and white papers from the ImagineSoftware knowledge base to help answer business problems',
	inputSchema: toolInputSchema,
	execute: async ({ query }) => {
		console.log('🔍 Tool called with query:', query);
		
		try {
			// Generate embedding for the query
			console.log('📝 Generating embedding...');
			const embedding = await openaiClient.embeddings.create({
				model: 'text-embedding-3-small',
				dimensions: 512,
				input: query,
			});

			const queryVector = embedding.data[0].embedding;
			console.log('✓ Embedding generated');

			// Search without filters, then separate by type
			console.log('🔎 Searching Qdrant...');
			const allResults = await qdrantClient.search(COLLECTION_NAME, {
				vector: queryVector,
				limit: 20,
				with_payload: true,
			});
			console.log('✓ Qdrant search complete, found', allResults.length, 'results');

			// Separate results by document type and limit to max counts
			const caseStudyResults = allResults
				.filter((r) => r.payload?.documentType === 'case_study')
				.slice(0, CASE_STUDY_RETRIEVE_LIMIT); // Max 4
			const whitePaperResults = allResults
				.filter((r) => r.payload?.documentType === 'white_paper_chunk')
				.slice(0, WHITE_PAPER_RETRIEVE_LIMIT); // Max 10

			console.log('📊 Search results:', {
				caseStudies: caseStudyResults.length,
				whitePapers: whitePaperResults.length,
			});

		const results: Array<{
			content: string;
			relevanceScore: number;
			metadata: Record<string, unknown>;
		}> = [];

		// Re-rank case studies and take top 1
		if (caseStudyResults.length > 0) {
			console.log('🔄 Re-ranking case studies...');
			const rerankedCaseStudies = await cohereClient.rerank({
				model: 'rerank-english-v3.0',
				query: query,
				documents: caseStudyResults.map(
					(result) => result.payload?.content as string
				),
				topN: CASE_STUDY_RERANK_TOP_N,
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

		// Re-rank white paper chunks and take top 5
		if (whitePaperResults.length > 0) {
			console.log('🔄 Re-ranking white papers...');
			const rerankedWhitePapers = await cohereClient.rerank({
				model: 'rerank-english-v3.0',
				query: query,
				documents: whitePaperResults.map(
					(result) => result.payload?.content as string
				),
				topN: WHITE_PAPER_RERANK_TOP_N,
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

		console.log('✅ Returning', results.length, 'documents to LLM');
		return results;
		} catch (error) {
			console.error('❌ Tool execution error:', error);
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
		onFinish: ({ text, finishReason, steps }) => {
			console.log('📝 Finish reason:', finishReason);
			console.log('📝 Number of steps:', steps?.length || 0);
			console.log('📝 Generated response length:', text?.length || 0, 'characters');
			if (steps?.length) {
				steps.forEach((step, i) => {
					console.log(`   Step ${i + 1}: toolCalls=${step.toolCalls?.length || 0}, text=${step.text?.length || 0} chars`);
				});
			}
		},
	});
}
