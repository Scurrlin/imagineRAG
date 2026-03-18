'use client';

import { useState, useRef, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { Message } from './components/types';
import Hero from './components/Hero';
import ChatMessages from './components/ChatMessages';
import ChatInput from './components/ChatInput';

export default function Home() {
	const [input, setInput] = useState('');
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [chatOpen, setChatOpen] = useState(false);
	const [typingMessageId, setTypingMessageId] = useState<string | null>(null);

	const abortControllerRef = useRef<AbortController | null>(null);

	const handleClear = () => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
		setMessages([]);
		setIsLoading(false);
		setTypingMessageId(null);
		setChatOpen(false);
	};

	const handleToggleChat = () => {
		setChatOpen((prev) => !prev);
	};

	const handleTypewriterComplete = useCallback(() => {
		setTypingMessageId(null);
		setIsLoading(false);
	}, []);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!input.trim() || isLoading) return;

		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}

		const abortController = new AbortController();
		abortControllerRef.current = abortController;

		const userInput = input;
		setInput('');

		const userMessage: Message = {
			id: crypto.randomUUID(),
			role: 'user',
			content: userInput,
		};

		setMessages((prev) => [...prev, userMessage]);
		setChatOpen(true);
		setIsLoading(true);

		let startedTypewriter = false;

		try {
			// Step 1: Check guardrail
			const guardrailResponse = await fetch('/api/guardrail', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages: [{ role: 'user', content: userInput }],
				}),
				signal: abortController.signal,
			});

			if (abortController.signal.aborted) return;

			if (!guardrailResponse.ok) {
				const errorMsg = guardrailResponse.status === 429
					? 'You\'re sending messages too quickly. Please wait a moment and try again.'
					: 'Sorry, I encountered an error. Please try again.';
				setMessages((prev) => [
					...prev,
					{ id: crypto.randomUUID(), role: 'assistant', content: errorMsg },
				]);
				return;
			}

			const guardrailResult = await guardrailResponse.json();

			if (!guardrailResult.accepted) {
				setMessages((prev) => [
					...prev,
					{
						id: crypto.randomUUID(),
						role: 'assistant',
						content: guardrailResult.clarification ||
							'I can help you understand how ImagineSoftware addresses healthcare revenue cycle challenges. What billing or RCM problem are you facing?',
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
				signal: abortController.signal,
			});

			if (abortController.signal.aborted) return;

			if (!response.ok) {
				const errorMsg = response.status === 429
					? 'You\'re sending messages too quickly. Please wait a moment and try again.'
					: 'Sorry, I encountered an error. Please try again.';
				throw new Error(errorMsg);
			}

			const reader = response.body?.getReader();
			const decoder = new TextDecoder();
			let assistantResponse = '';

			if (reader) {
				while (true) {
					if (abortController.signal.aborted) {
						reader.cancel();
						return;
					}

					const { done, value } = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value, { stream: true });
					assistantResponse += chunk;
				}
			}

			const assistantMessageId = crypto.randomUUID();
			setMessages((prev) => [
				...prev,
				{ id: assistantMessageId, role: 'assistant', content: assistantResponse },
			]);
			setTypingMessageId(assistantMessageId);
			startedTypewriter = true;
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				return;
			}

			setMessages((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					role: 'assistant',
					content: error instanceof Error && error.message
						? error.message
						: 'Sorry, I encountered an error. Please try again.',
				},
			]);
		} finally {
			if (abortControllerRef.current === abortController) {
				if (!startedTypewriter) {
					setIsLoading(false);
				}
				abortControllerRef.current = null;
			}
		}
	};

	return (
		<div className="relative min-h-screen">
			<Hero>
				<div className="hero-decorative-text text-center px-6">
					<h1 className="sm:text-3xl md:text-4xl font-bold text-white leading-tight animate-hero-text-delay-2">
						Take a Quantum Leap in
						<br /> Healthcare Systems Technology
					</h1>
				</div>

				<div className={`px-4 pb-6 flex justify-center animate-hero-text-delay-3 ${chatOpen ? 'invisible pointer-events-none' : ''}`}>
						<div className="w-full max-w-4xl">
							<ChatInput
								input={input}
								isLoading={isLoading}
								hasMessages={messages.length > 0}
								chatOpen={false}
								onInputChange={setInput}
								onSubmit={handleSubmit}
								onClear={handleClear}
								onToggleChat={handleToggleChat}
							/>
						</div>
					</div>
			</Hero>

			{/* ============================================
			    Chat Panel (fixed overlay — slides up when open)
			    ============================================ */}
			{chatOpen && (
				<div className="chat-panel animate-slide-up">
					{/* Panel header */}
					<div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10">
						<h3 className="text-white/80 text-sm font-medium">
							Imagine Digital Consultant
						</h3>
						<button
							onClick={handleToggleChat}
							className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
							aria-label="Minimize chat"
						>
							<ChevronDown className="w-5 h-5" />
						</button>
					</div>

					{/* Messages */}
					<ChatMessages
						messages={messages}
						isLoading={isLoading}
						typingMessageId={typingMessageId}
						onTypewriterComplete={handleTypewriterComplete}
					/>

					{/* Input inside panel */}
					<ChatInput
						input={input}
						isLoading={isLoading}
						hasMessages={messages.length > 0}
						chatOpen={true}
						onInputChange={setInput}
						onSubmit={handleSubmit}
						onClear={handleClear}
						onToggleChat={handleToggleChat}
					/>
				</div>
			)}
		</div>
	);
}
