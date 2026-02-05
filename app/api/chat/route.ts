import { z } from 'zod';
import { ragAgent } from '@/app/agents/rag';
import { rateLimiter, getClientIp, rateLimitHeaders } from '@/app/libs/rate-limit';

const chatSchema = z.object({
	messages: z
		.array(
			z.object({
				role: z.enum(['user', 'assistant', 'system']),
				content: z.string(),
			})
		)
		.min(1),
});

export async function POST(req: Request) {
	// Rate limiting
	const clientIp = getClientIp(req);
	const rateLimit = rateLimiter.check(clientIp);

	if (!rateLimit.success) {
		return new Response('Too many requests. Please try again later.', {
			status: 429,
			headers: rateLimitHeaders(rateLimit),
		});
	}

	try {
		const body = await req.json();
		const parsed = chatSchema.parse(body);
		const { messages } = parsed;

		// Get the last user message as the query
		const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
		const query = lastUserMessage?.content || '';

		// Execute the RAG agent and get streamed response
		const result = await ragAgent({ query });

		// Add rate limit headers to successful response
		const response = result.toTextStreamResponse();
		const headers = new Headers(response.headers);
		Object.entries(rateLimitHeaders(rateLimit)).forEach(([key, value]) => {
			headers.set(key, value);
		});

		return new Response(response.body, {
			status: response.status,
			headers,
		});
	} catch {
		return new Response('Internal server error', { status: 500 });
	}
}
