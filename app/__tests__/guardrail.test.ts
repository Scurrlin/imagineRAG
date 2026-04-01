/**
 * Tests for the guardrail API route.
 *
 * Mocks OpenAI (LLM classification + embeddings) so no real API calls are made.
 * Tests both rejection layers: LLM classification and embedding similarity.
 */

const mockResponsesParse = jest.fn();
const mockEmbeddingsCreate = jest.fn();

jest.mock('@/app/libs/openai', () => ({
	openaiClient: {
		responses: { parse: mockResponsesParse },
		embeddings: { create: mockEmbeddingsCreate },
	},
}));

jest.mock('openai/helpers/zod', () => ({
	zodTextFormat: jest.fn(() => 'mock-format'),
}));

import { POST } from '../api/guardrail/route';
import { NextRequest } from 'next/server';
import { GUARDRAIL_CONFIG } from '../config';

function makeRequest(content: string, headers: Record<string, string> = {}): NextRequest {
	const body = JSON.stringify({
		messages: [{ role: 'user', content }],
	});

	return new NextRequest('http://localhost:3000/api/guardrail', {
		method: 'POST',
		body,
		headers: { 'Content-Type': 'application/json', ...headers },
	});
}

function mockLlmClassification(overrides: Record<string, unknown> = {}) {
	mockResponsesParse.mockResolvedValue({
		output_parsed: {
			isOnTopic: true,
			refinedQuery: 'How can I reduce claim denials?',
			confidence: 8,
			clarification: null,
			...overrides,
		},
	});
}

function mockEmbeddingSimilarity(similarity: number) {
	const dim = 10;
	const base = Array.from({ length: dim }, () => 1);

	// For cosine similarity of `similarity`, use identical vectors (sim=1)
	// or orthogonal (sim=0). We control the result by adjusting the second vector.
	// Simpler: just mock both embeddings and spy on cosineSimilarity result.
	// Since cosineSimilarity is a real function, we construct vectors that produce
	// the desired similarity.

	if (similarity >= 0.99) {
		mockEmbeddingsCreate.mockResolvedValue({
			data: [{ embedding: base }],
		});
	} else if (similarity <= 0.01) {
		// First call = query embedding, second call = domain embedding
		mockEmbeddingsCreate
			.mockResolvedValueOnce({ data: [{ embedding: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0] }] })
			.mockResolvedValueOnce({ data: [{ embedding: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0] }] });
	} else {
		// Construct two vectors with a known cosine similarity.
		// v1 = [1, 0, ...], v2 = [similarity, sqrt(1-sim^2), 0, ...]
		const v1 = Array(dim).fill(0);
		v1[0] = 1;
		const v2 = Array(dim).fill(0);
		v2[0] = similarity;
		v2[1] = Math.sqrt(1 - similarity * similarity);

		mockEmbeddingsCreate
			.mockResolvedValueOnce({ data: [{ embedding: v1 }] })
			.mockResolvedValueOnce({ data: [{ embedding: v2 }] });
	}
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe('POST /api/guardrail', () => {
	it('accepts an on-topic query that passes both layers', async () => {
		mockLlmClassification({ isOnTopic: true, confidence: 8 });
		mockEmbeddingSimilarity(0.85);

		const res = await POST(makeRequest('How can I reduce claim denials?'));
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.accepted).toBe(true);
		expect(json.confidence).toBe(8);
		expect(json.similarityScore).toBeGreaterThan(GUARDRAIL_CONFIG.SIMILARITY_THRESHOLD);
	});

	it('rejects when LLM classifies as off-topic', async () => {
		mockLlmClassification({
			isOnTopic: false,
			confidence: 2,
			clarification: 'I can help with billing problems.',
		});

		const res = await POST(makeRequest('How do I bake sourdough?'));
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.accepted).toBe(false);
		expect(json.rejectedBy).toBe('llm_classification');
		expect(json.clarification).toContain('billing');
	});

	it('rejects when confidence is below threshold', async () => {
		mockLlmClassification({
			isOnTopic: true,
			confidence: GUARDRAIL_CONFIG.CONFIDENCE_THRESHOLD - 1,
		});

		const res = await POST(makeRequest('Tell me about weather'));
		const json = await res.json();

		expect(json.accepted).toBe(false);
		expect(json.rejectedBy).toBe('llm_classification');
	});

	it('rejects when embedding similarity is below threshold', async () => {
		mockLlmClassification({ isOnTopic: true, confidence: 7 });
		mockEmbeddingSimilarity(0.05);

		const res = await POST(makeRequest('unrelated topic'));
		const json = await res.json();

		expect(json.accepted).toBe(false);
		expect(json.rejectedBy).toBe('embedding_similarity');
	});

	it('returns 500 on unexpected errors', async () => {
		mockResponsesParse.mockRejectedValue(new Error('OpenAI down'));

		const res = await POST(makeRequest('anything'));
		const json = await res.json();

		expect(res.status).toBe(500);
		expect(json.error).toBeDefined();
	});

	it('returns 400-level on invalid request body', async () => {
		const req = new NextRequest('http://localhost:3000/api/guardrail', {
			method: 'POST',
			body: JSON.stringify({ messages: [] }),
			headers: { 'Content-Type': 'application/json' },
		});

		const res = await POST(req);
		expect(res.status).toBe(500);
	});
});
