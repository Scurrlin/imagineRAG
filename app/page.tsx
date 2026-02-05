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
			{/* Background Image */}
			<div
				className="fixed inset-0 z-0"
				style={{
					backgroundImage: 'url(/background.jpg)',
					backgroundSize: 'cover',
					backgroundPosition: 'center',
					backgroundRepeat: 'no-repeat',
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
				<div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
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
