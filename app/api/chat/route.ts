import { z } from 'zod';
import { ragAgent } from '@/app/agents/rag';
import { rateLimiter, getClientIp, rateLimitHeaders } from '@/app/libs/rate-limit';
import { CHAT_CONFIG } from '@/app/config';

const chatSchema = z.object({
	messages: z
		.array(
			z.object({
				role: z.enum(['user', 'assistant', 'system']),
				content: z.string().max(CHAT_CONFIG.MAX_MESSAGE_LENGTH),
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

		return result.toTextStreamResponse({
			headers: {
				'X-Content-Type-Options': 'nosniff',
				'Cache-Control': 'no-cache, no-transform',
				...rateLimitHeaders(rateLimit),
			},
		});
	} catch {
		return new Response('Internal server error', { status: 500 });
	}
}
