'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';

interface Message {
	id: string;
	role: 'user' | 'assistant';
	content: string;
}

export default function Home() {
	const [input, setInput] = useState('');
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [showYouTube, setShowYouTube] = useState(false);
	const [videoEnded, setVideoEnded] = useState(false);
	const [youtubeKey, setYoutubeKey] = useState(0);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Handle textarea change
	const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInput(e.target.value);
	};

	// Handle Enter key (submit on Enter, new line on Shift+Enter)
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			if (input.trim() && !isLoading) {
				handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
			}
		}
	};

	// Stop video 0.6 seconds before it ends
	const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
		const video = e.currentTarget;
		if (video.duration && video.currentTime >= video.duration - 0.6) {
			video.pause();
		}
	};

	// Auto-scroll to bottom of messages (only when there are messages)
	useEffect(() => {
		if (messages.length > 0) {
			messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
		}
	}, [messages]);

	// Show replay button after YouTube video ends (video is ~90 seconds)
	useEffect(() => {
		if (showYouTube && !videoEnded) {
			const timer = setTimeout(() => {
				setVideoEnded(true);
			}, 29000); // 28 seconds (video is 27 seconds + small buffer)
			return () => clearTimeout(timer);
		}
	}, [showYouTube, videoEnded, youtubeKey]);

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

	const allMessages = messages;

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
				<div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
					{/* Messages Area */}
					<div className={`p-3 sm:p-4 space-y-3 ${allMessages.length === 0 ? 'min-h-0 overflow-hidden' : 'h-[400px] sm:h-[450px] overflow-y-auto'}`}>
						{allMessages.length === 0 && (
							<div className="text-center py-3 sm:py-4">
								<h3 className="text-xl font-medium text-gray-700 mb-3">
									How can we help your practice?
								</h3>
								<p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed mb-6">
									Tell us about your revenue cycle challenges, billing issues, 
									or operational goals. We&apos;re here to help you optimize your 
									healthcare business.
								</p>
								<div className="relative rounded-xl overflow-hidden shadow-lg max-w-full sm:max-w-lg mx-auto bg-black">
									{!showYouTube ? (
										<div
											onClick={() => setShowYouTube(true)}
											className="relative cursor-pointer group"
											aria-label="Watch Video"
										>
											<video
												width="1920"
												height="1080"
												autoPlay
												muted
												playsInline
												onTimeUpdate={handleVideoTimeUpdate}
												className="w-full h-auto"
											>
												<source
													src="https://imagineteam.com/wp-content/uploads/2025/04/ef4b-4206-b344-7937abcb4293.mp4"
													type="video/mp4"
												/>
												Your browser does not support the video tag.
											</video>
									{/* Play button overlay */}
									<div className="absolute inset-0 flex items-center justify-center bg-transparent group-hover:bg-black/30 transition-colors">
										<div className="w-16 h-16 bg-[#4B9CD3] rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
											<svg
												className="w-11 h-11 text-white"
												fill="currentColor"
												viewBox="0 0 24 24"
											>
												<path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z" />
											</svg>
										</div>
									</div>
										</div>
									) : (
										<div className="aspect-video relative">
											<iframe
												key={youtubeKey}
												width="100%"
												height="100%"
												src={`https://www.youtube.com/embed/fCiN0crOXtM?autoplay=1`}
												title="ImagineSoftware Video"
												frameBorder="0"
												allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
												allowFullScreen
											/>
											{/* Replay overlay - only shows when video ends */}
											{videoEnded && (
												<div className="absolute inset-0 bg-black flex items-center justify-center gap-6 p-4 animate-fade-in">
													{/* Logo on the left */}
													<div className="flex-1 flex items-center justify-center">
														<img
															src="/imagine-logo2.webp"
															alt="ImagineSoftware 25 Years"
															className="w-full max-w-[200px] h-auto rounded-xl border border-white/30"
														/>
													</div>
													{/* Replay button and link on the right */}
													<div className="flex-1 flex flex-col items-center justify-center">
														<div
															className="cursor-pointer hover:opacity-80 transition-opacity"
															onClick={() => {
																setVideoEnded(false);
																setYoutubeKey(prev => prev + 1);
															}}
														>
															<svg
																className="w-16 h-16 text-white"
																fill="none"
																stroke="currentColor"
																strokeWidth={2}
																viewBox="0 0 24 24"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
																/>
															</svg>
														</div>
													<a
														href="https://imagineteam.com/contact-us/"
														target="_blank"
														rel="noopener noreferrer"
														className="mt-4 px-5 py-2 bg-gradient-to-r from-[#0A5A7C] to-[#4B9CD3] text-white font-semibold text-sm uppercase tracking-wide rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-md whitespace-nowrap"
													>
														Contact Us
													</a>
													</div>
												</div>
											)}
										</div>
									)}
								</div>
							</div>
						)}

						{allMessages.map((message) => (
							<div
								key={message.id}
								className={`flex ${
									message.role === 'user'
										? 'justify-end'
										: 'justify-start'
								}`}
							>
								<div
									className={`max-w-[85%] rounded-2xl px-5 py-3 ${
										message.role === 'user'
											? 'bg-[#4B9CD3] text-white'
											: 'bg-gray-100 text-gray-800'
									}`}
								>
									{message.role === 'assistant' ? (
										<div className="prose prose-sm max-w-none">
											<ReactMarkdown>
												{message.content || 'Thinking...'}
											</ReactMarkdown>
										</div>
									) : (
										<p className="whitespace-pre-wrap">
											{message.content}
										</p>
									)}
								</div>
							</div>
						))}

						{isLoading && (
							<div className="flex justify-start">
								<div className="bg-gray-100 rounded-2xl px-5 py-3">
									<div className="flex items-center space-x-2">
										<div className="w-2 h-2 bg-[#4B9CD3] rounded-full animate-bounce" />
										<div
											className="w-2 h-2 bg-[#4B9CD3] rounded-full animate-bounce"
											style={{ animationDelay: '0.1s' }}
										/>
										<div
											className="w-2 h-2 bg-[#4B9CD3] rounded-full animate-bounce"
											style={{ animationDelay: '0.2s' }}
										/>
									</div>
								</div>
							</div>
						)}

						<div ref={messagesEndRef} />
					</div>

					{/* Input Area */}
					<div className="border-t border-gray-200 p-4 bg-gray-50/80">
						<form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 sm:items-stretch">
							<div className="w-full sm:flex-1">
								<textarea
									ref={textareaRef}
									value={input}
									onChange={handleTextareaChange}
									onKeyDown={handleKeyDown}
									placeholder="Describe your business challenge here..."
									maxLength={400}
									className="w-full h-full px-5 py-3 rounded-xl border border-gray-300 focus:border-[#4B9CD3] focus:ring-2 focus:ring-[#4B9CD3]/20 outline-none transition-all bg-white text-gray-800 placeholder-gray-400 resize-none"
									disabled={isLoading}
									rows={3}
								/>
							</div>
							<div className="flex gap-3 sm:flex-col sm:w-[120px]">
								<button
									type="submit"
									disabled={isLoading || !input.trim()}
									className="flex-1 px-6 py-3 bg-[#4B9CD3] text-white rounded-xl font-medium hover:bg-[#3A8BC2] disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm"
								>
									{isLoading ? 'Sending...' : 'Send'}
								</button>
								<button
									type="button"
									onClick={() => {
										setMessages([]);
										setShowYouTube(false);
										setVideoEnded(false);
									}}
									disabled={isLoading || messages.length === 0}
									className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer transition-colors"
								>
									Clear
								</button>
							</div>
						</form>
						{input.length > 320 && (
							<div className={`text-center text-xs mt-2 ${input.length >= 400 ? 'text-red-500' : 'text-gray-400'}`}>
								Maximum characters 400: {input.length}/400
							</div>
						)}
					</div>
				</div>

				{/* Footer */}
				<div className="flex justify-center mt-4">
					<a
						href="https://imagineteam.com/imagineone/#form"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#0A5A7C] to-[#4B9CD3] text-white font-semibold text-sm uppercase tracking-wide rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-md"
					>
						<img
							src="/favicon.png"
							alt=""
							className="w-6 h-6"
						/>
						Schedule a Demo
					</a>
				</div>
			</div>
		</div>
	);
}
