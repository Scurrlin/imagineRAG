/**
 * Tests for the RAG agent retrieval tool and orchestration.
 *
 * All external services (OpenAI, Qdrant, Cohere, Vercel AI SDK)
 * are fully mocked — no real API calls.
 */

const mockEmbeddingsCreate = jest.fn();
const mockQdrantSearch = jest.fn();
const mockCohereRerank = jest.fn();
const mockStreamText = jest.fn();

jest.mock('@/app/libs/openai', () => ({
	openaiClient: {
		embeddings: { create: mockEmbeddingsCreate },
	},
}));

jest.mock('../libs/qdrant', () => ({
	qdrantClient: { search: mockQdrantSearch },
}));

jest.mock('../libs/cohere', () => ({
	cohereClient: { rerank: mockCohereRerank },
}));

jest.mock('@ai-sdk/openai', () => ({
	openai: jest.fn(() => 'mock-gpt-4o'),
}));

jest.mock('ai', () => ({
	streamText: mockStreamText,
	tool: jest.fn((config: unknown) => config),
	stepCountIs: jest.fn((n: number) => `stepCountIs(${n})`),
	smoothStream: jest.fn(() => 'mock-smooth-stream'),
}));

import { ragAgent } from '../agents/rag';
import { RETRIEVAL_CONFIG } from '../config';

type ToolExecuteFn = (args: { query: string }) => Promise<unknown>;

function getToolExecute(): ToolExecuteFn {
	const call = mockStreamText.mock.calls[0][0];
	return call.tools.retrieve_relevant_documents.execute;
}

function mockEmbedding(vector: number[]) {
	mockEmbeddingsCreate.mockResolvedValue({
		data: [{ embedding: vector }],
	});
}

const CASE_STUDY_HIT = {
	id: 'cs-1',
	score: 0.95,
	payload: {
		documentType: 'case_study',
		content: 'Acme reduced denials by 40%.',
		client: 'Acme Health',
		title: 'Acme Denial Reduction',
		challenge: 'High denial rate',
		solution: 'ImagineBilling automation',
		result: '40% fewer denials',
	},
};

const WHITE_PAPER_HIT = {
	id: 'wp-1',
	score: 0.88,
	payload: {
		documentType: 'white_paper_chunk',
		content: 'AI-powered coding reduces errors by 60%.',
		parentTitle: 'Future of RCM',
		subtitle: 'AI in Revenue Cycle',
		theme: 'automation',
		chunkType: 'section',
		sectionTitle: 'Coding Automation',
		sectionType: 'body',
		keyPoints: ['reduces errors', 'saves time'],
	},
};

beforeEach(() => {
	jest.clearAllMocks();
	mockStreamText.mockReturnValue({ toTextStreamResponse: jest.fn() });
});

describe('ragAgent', () => {
	it('calls streamText with the correct model and tool', async () => {
		await ragAgent({ query: 'How can I reduce denials?' });

		expect(mockStreamText).toHaveBeenCalledTimes(1);

		const args = mockStreamText.mock.calls[0][0];
		expect(args.model).toBe('mock-gpt-4o');
		expect(args.tools).toHaveProperty('retrieve_relevant_documents');
		expect(args.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ role: 'user', content: 'How can I reduce denials?' }),
			])
		);
	});

	it('includes a system prompt in messages', async () => {
		await ragAgent({ query: 'test' });

		const args = mockStreamText.mock.calls[0][0];
		const systemMsg = args.messages.find(
			(m: { role: string }) => m.role === 'system'
		);
		expect(systemMsg).toBeDefined();
		expect(systemMsg.content).toContain('ImagineSoftware');
	});
});

describe('retrieve_relevant_documents tool', () => {
	it('returns reranked results for mixed doc types', async () => {
		await ragAgent({ query: 'trigger' });
		const execute = getToolExecute();

		mockEmbedding([0.1, 0.2, 0.3]);
		mockQdrantSearch.mockResolvedValue([CASE_STUDY_HIT, WHITE_PAPER_HIT]);
		mockCohereRerank
			.mockResolvedValueOnce({
				results: [
					{ index: 0, relevanceScore: 0.97, document: { text: CASE_STUDY_HIT.payload.content } },
				],
			})
			.mockResolvedValueOnce({
				results: [
					{ index: 0, relevanceScore: 0.91, document: { text: WHITE_PAPER_HIT.payload.content } },
				],
			});

		const results = (await execute({ query: 'How can I reduce denials?' })) as Array<{
			content: string;
			relevanceScore: number;
			metadata: Record<string, unknown>;
		}>;

		expect(results).toHaveLength(2);
		expect(results[0].metadata.documentType).toBe('case_study');
		expect(results[0].content).toContain('Acme');
		expect(results[1].metadata.documentType).toBe('white_paper_chunk');
	});

	it('calls Qdrant with correct collection and limit', async () => {
		await ragAgent({ query: 'trigger' });
		const execute = getToolExecute();

		mockEmbedding([0.1, 0.2]);
		mockQdrantSearch.mockResolvedValue([]);

		await execute({ query: 'test query' });

		expect(mockQdrantSearch).toHaveBeenCalledWith(
			'imagineSoftware',
			expect.objectContaining({
				limit: RETRIEVAL_CONFIG.TOTAL_RETRIEVE_LIMIT,
				with_payload: true,
			})
		);
	});

	it('returns empty array when Qdrant returns no results', async () => {
		await ragAgent({ query: 'trigger' });
		const execute = getToolExecute();

		mockEmbedding([0.1, 0.2]);
		mockQdrantSearch.mockResolvedValue([]);

		const results = await execute({ query: 'something obscure' });
		expect(results).toEqual([]);
		expect(mockCohereRerank).not.toHaveBeenCalled();
	});

	it('returns empty array on embedding failure', async () => {
		await ragAgent({ query: 'trigger' });
		const execute = getToolExecute();

		mockEmbeddingsCreate.mockRejectedValue(new Error('API key invalid'));

		const results = await execute({ query: 'anything' });
		expect(results).toEqual([]);
	});

	it('returns empty array on Qdrant failure', async () => {
		await ragAgent({ query: 'trigger' });
		const execute = getToolExecute();

		mockEmbedding([0.1, 0.2]);
		mockQdrantSearch.mockRejectedValue(new Error('Qdrant unreachable'));

		const results = await execute({ query: 'anything' });
		expect(results).toEqual([]);
	});

	it('skips Cohere rerank when only one doc type is present', async () => {
		await ragAgent({ query: 'trigger' });
		const execute = getToolExecute();

		mockEmbedding([0.1, 0.2]);
		mockQdrantSearch.mockResolvedValue([WHITE_PAPER_HIT]);
		mockCohereRerank.mockResolvedValue({
			results: [
				{ index: 0, relevanceScore: 0.9, document: { text: WHITE_PAPER_HIT.payload.content } },
			],
		});

		const results = (await execute({ query: 'AI coding' })) as Array<{
			metadata: Record<string, unknown>;
		}>;

		expect(mockCohereRerank).toHaveBeenCalledTimes(1);
		expect(results).toHaveLength(1);
		expect(results[0].metadata.documentType).toBe('white_paper_chunk');
	});
});
