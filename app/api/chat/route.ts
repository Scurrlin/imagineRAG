import { z } from 'zod';
import { ragAgent } from '@/app/agents/rag';
import { rateLimiter, dailyLimiter, getClientIp, rateLimitHeaders, dailyLimitHeaders } from '@/app/libs/rate-limit';
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

	const dailyLimit = dailyLimiter.check(clientIp);
	if (!dailyLimit.success) {
		return new Response(
			JSON.stringify({
				error: 'daily_limit',
				message: "You've reached your daily limit of 100 messages. Please try again tomorrow.",
				reset: dailyLimit.reset,
			}),
			{
				status: 429,
				headers: {
					'Content-Type': 'application/json',
					...dailyLimitHeaders(dailyLimit),
				},
			}
		);
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
