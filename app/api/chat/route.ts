import { z } from 'zod';
import { ragAgent } from '@/app/agents/rag';

const chatSchema = z.object({
	messages: z.array(z.object({
		role: z.enum(['user', 'assistant', 'system']),
		content: z.string(),
	})).min(1),
});

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const parsed = chatSchema.parse(body);
		const { messages } = parsed;

		// Get the last user message as the query
		const lastUserMessage = messages.filter(m => m.role === 'user').pop();
		const query = lastUserMessage?.content || '';

		// Execute the RAG agent and get streamed response
		const result = await ragAgent({ query });

		return result.toTextStreamResponse();
	} catch (error) {
		console.error('Error in chat API:', error);
		return new Response('Internal server error', { status: 500 });
	}
}
