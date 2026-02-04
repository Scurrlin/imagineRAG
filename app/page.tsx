'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Message } from './components/types';
import ChatMessages from './components/ChatMessages';
import ChatInput from './components/ChatInput';

export default function Home() {
	const [input, setInput] = useState('');
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [showYouTube, setShowYouTube] = useState(false);

	const handleClear = () => {
		setMessages([]);
		setShowYouTube(false);
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!input.trim() || isLoading) return;

		const userInput = input;
		setInput('');

		// Add user message to UI
		const userMessage: Message = {
			id: crypto.randomUUID(),
			role: 'user',
			content: userInput,
		};

		setMessages((prev) => [...prev, userMessage]);
		setIsLoading(true);

		try {
			// Step 1: Check guardrail
			const guardrailResponse = await fetch('/api/guardrail', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages: [{ role: 'user', content: userInput }],
				}),
			});

			const guardrailResult = await guardrailResponse.json();

			// If query rejected, show clarification
			if (!guardrailResult.accepted) {
				setMessages((prev) => [
					...prev,
					{
						id: crypto.randomUUID(),
						role: 'assistant',
						content: guardrailResult.clarification,
					},
				]);
				return;
			}

			// Step 2: Query accepted - call chat API
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages: [{ role: 'user', content: userInput }],
				}),
			});

			if (!response.ok) {
				throw new Error('Chat API error');
			}

			// Create assistant message for streaming
			const assistantMessageId = crypto.randomUUID();
			setMessages((prev) => [
				...prev,
				{ id: assistantMessageId, role: 'assistant', content: '' },
			]);

			// Stream the plain text response
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();
			let assistantResponse = '';

			if (reader) {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					// toTextStreamResponse() sends plain UTF-8 text chunks
					const chunk = decoder.decode(value, { stream: true });
					assistantResponse += chunk;

					setMessages((prev) =>
						prev.map((msg) =>
							msg.id === assistantMessageId
								? { ...msg, content: assistantResponse }
								: msg
						)
					);
				}
			}
		} catch (error) {
			console.error('Error in chat:', error);
			setMessages((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					role: 'assistant',
					content: 'Sorry, I encountered an error. Please try again.',
				},
			]);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen relative">
			{/* CSS Sky & Clouds Background */}
			<div
				className="fixed inset-0 z-0"
				style={{
					background: `
						/* Cloud layer 1 - large fluffy clouds at bottom */
						radial-gradient(ellipse 120% 60% at 10% 105%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 30%, transparent 60%),
						radial-gradient(ellipse 100% 50% at 30% 100%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 25%, transparent 55%),
						radial-gradient(ellipse 140% 55% at 60% 108%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.75) 30%, transparent 58%),
						radial-gradient(ellipse 90% 45% at 85% 102%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 28%, transparent 52%),
						radial-gradient(ellipse 110% 50% at 95% 105%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.6) 25%, transparent 50%),
						
						/* Cloud layer 2 - mid clouds with slight gray tint */
						radial-gradient(ellipse 80% 35% at 20% 95%, rgba(240,245,250,0.8) 0%, rgba(230,238,245,0.5) 30%, transparent 55%),
						radial-gradient(ellipse 70% 30% at 50% 92%, rgba(245,248,252,0.75) 0%, rgba(235,242,248,0.4) 28%, transparent 50%),
						radial-gradient(ellipse 85% 38% at 75% 96%, rgba(240,246,250,0.8) 0%, rgba(228,238,246,0.5) 32%, transparent 55%),
						
						/* Cloud wisps - higher, thinner clouds */
						radial-gradient(ellipse 60% 15% at 15% 75%, rgba(255,255,255,0.4) 0%, transparent 50%),
						radial-gradient(ellipse 50% 12% at 45% 70%, rgba(255,255,255,0.35) 0%, transparent 45%),
						radial-gradient(ellipse 55% 14% at 80% 72%, rgba(255,255,255,0.38) 0%, transparent 48%),
						
						/* Sky gradient - blue tones matching brand */
						linear-gradient(to bottom, 
							#0A5A7C 0%, 
							#1a6d8f 15%,
							#3d8db5 35%, 
							#4B9CD3 50%,
							#6eb5e0 65%,
							#a8d4ef 80%,
							#d0e8f5 90%,
							#e8f4fa 100%
						)
					`,
				}}
			/>

			{/* Content */}
			<div className="relative z-10 max-w-4xl mx-auto px-4 pb-4">
				{/* Header */}
				<div className="text-center mb-4">
					<div className="flex justify-center mb-3">
						<a
							href="https://imagineteam.com/"
							target="_blank"
							rel="noopener noreferrer"
						>
							<Image
								src="/imagine_logo.svg"
								alt="ImagineSoftware"
								width={280}
								height={60}
								priority
								className="h-auto cursor-pointer"
							/>
						</a>
					</div>
					<h1 className="text-2xl font-semibold text-white tracking-wide drop-shadow-lg">
						Take a Quantum Leap in Healthcare Systems Technology
					</h1>
				</div>

				{/* Chat Container */}
				<div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
					<ChatMessages
						messages={messages}
						isLoading={isLoading}
						showYouTube={showYouTube}
						onPlayClick={() => setShowYouTube(true)}
					/>
					<ChatInput
						input={input}
						isLoading={isLoading}
						hasMessages={messages.length > 0}
						onInputChange={setInput}
						onSubmit={handleSubmit}
						onClear={handleClear}
					/>
				</div>

				{/* Footer */}
				<div className="flex justify-center mt-4">
					<a
						href="https://imagineteam.com/imagineone/"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#0A5A7C] to-[#4B9CD3] text-white font-semibold text-sm uppercase tracking-wide rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-md"
					>
						<img src="/favicon.png" alt="" className="w-6 h-6" />
						Schedule a Demo
					</a>
				</div>
			</div>
		</div>
	);
}
