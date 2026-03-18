'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowDown } from 'lucide-react';
import { Message } from './types';

const TYPEWRITER_SPEED_MS = 30;

function TypewriterText({ text, onComplete, onWordReveal }: { text: string; onComplete: () => void; onWordReveal: () => void }) {
	const [wordCount, setWordCount] = useState(0);
	const onCompleteRef = useRef(onComplete);
	onCompleteRef.current = onComplete;
	const onWordRevealRef = useRef(onWordReveal);
	onWordRevealRef.current = onWordReveal;
	const words = useMemo(() => text.match(/\S+\s*/g) || [], [text]);

	useEffect(() => {
		if (wordCount >= words.length) {
			onCompleteRef.current();
			return;
		}
		onWordRevealRef.current();
		const timer = setTimeout(() => setWordCount((c) => c + 1), TYPEWRITER_SPEED_MS);
		return () => clearTimeout(timer);
	}, [wordCount, words.length]);

	const displayed = words.slice(0, wordCount).join('');

	return <ReactMarkdown>{displayed}</ReactMarkdown>;
}

interface ChatMessagesProps {
	messages: Message[];
	isLoading: boolean;
	typingMessageId: string | null;
	onTypewriterComplete: () => void;
}

export default function ChatMessages({
	messages,
	isLoading,
	typingMessageId,
	onTypewriterComplete,
}: ChatMessagesProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [isAtBottom, setIsAtBottom] = useState(true);

	const scrollToBottom = useCallback(() => {
		containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight });
	}, []);

	const smoothScrollToBottom = useCallback(() => {
		containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
	}, []);

	const handleScroll = useCallback(() => {
		const el = containerRef.current;
		if (!el) return;
		setIsAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 50);
	}, []);

	useEffect(() => {
		if (isLoading || typingMessageId) {
			scrollToBottom();
		}
	}, [messages, isLoading, typingMessageId, scrollToBottom]);

	return (
		<div className="chat-panel-messages relative">
		<div ref={containerRef} onScroll={handleScroll} className="h-full overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
			{messages.map((message, index) => (
				<div
					key={message.id}
					className={`flex ${
						message.role === 'user' ? 'justify-end' : 'justify-start'
					}`}
				>
					<div
						className={`max-w-[85%] rounded-2xl px-5 py-3 ${
							message.role === 'user'
								? 'bg-[#4B9CD3] text-white'
								: 'bg-white/10 text-white/90'
						}`}
					>
						{message.role === 'assistant' ? (
							<div className="prose prose-sm max-w-none">
								{message.id === typingMessageId ? (
								<TypewriterText
									text={message.content}
									onComplete={onTypewriterComplete}
									onWordReveal={scrollToBottom}
								/>
								) : (
									<ReactMarkdown>
										{message.content ||
											(isLoading && index === messages.length - 1
												? 'Thinking...'
												: message.content)}
									</ReactMarkdown>
								)}
							</div>
						) : (
							<p className="whitespace-pre-wrap">{message.content}</p>
						)}
					</div>
				</div>
			))}

			{isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
				<div className="flex justify-start">
					<div className="bg-white/10 rounded-2xl px-5 py-3">
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
		</div>

		<button
			onClick={smoothScrollToBottom}
			className={`absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white/90 text-xs rounded-full backdrop-blur-sm transition-all duration-200 cursor-pointer ${
				isAtBottom || messages.length === 0
					? 'opacity-0 translate-y-2 pointer-events-none'
					: 'opacity-100 translate-y-0'
			}`}
		>
			Latest
			<ArrowDown className="w-3 h-3" />
		</button>
		</div>
	);
}
