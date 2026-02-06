'use client';

import { useState, useRef, useEffect } from 'react';
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

	// Track current request to handle race conditions
	const abortControllerRef = useRef<AbortController | null>(null);

	// Auto-open chat panel when first message is sent
	useEffect(() => {
		if (messages.length > 0 && !chatOpen) {
			setChatOpen(true);
		}
	}, [messages.length, chatOpen]);

	const handleClear = () => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
		setMessages([]);
		setIsLoading(false);
		setChatOpen(false);
	};

	const handleToggleChat = () => {
		setChatOpen((prev) => !prev);
	};

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
		setIsLoading(true);

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

			const guardrailResult = await guardrailResponse.json();

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
				signal: abortController.signal,
			});

			if (abortController.signal.aborted) return;

			if (!response.ok) {
				throw new Error('Chat API error');
			}

			const assistantMessageId = crypto.randomUUID();
			setMessages((prev) => [
				...prev,
				{ id: assistantMessageId, role: 'assistant', content: '' },
			]);

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
			if (error instanceof Error && error.name === 'AbortError') {
				return;
			}

			setMessages((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					role: 'assistant',
					content: 'Sorry, I encountered an error. Please try again.',
				},
			]);
		} finally {
			if (abortControllerRef.current === abortController) {
				setIsLoading(false);
				abortControllerRef.current = null;
			}
		}
	};

	return (
		<div className="relative min-h-screen">
			{/* Hero section — full viewport height */}
			<Hero />

			{/* ============================================
			    Below-hero content (<1400px): centered text
			    + chat input, all in the black zone
			    ============================================ */}
			<div className="below-hero-content hide-xxl">
				<p className="text-[#4B9CD3] text-xs sm:text-sm md:text-base font-semibold uppercase tracking-[0.2em] mb-4 animate-hero-text">
					Activate the Power of ImagineOne&reg;
				</p>
				<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight animate-hero-text-delay-1">
					Take a Quantum Leap in
					<br className="hidden sm:inline" /> Healthcare Systems Technology
				</h1>
			</div>

			{/* ============================================
			    Chat Input Area — sits in the black zone
			    ============================================ */}
			{!chatOpen && (
				<div className="chat-input-section animate-fade-in">
					<div className="chat-input-container">
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
			)}

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
