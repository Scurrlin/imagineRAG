'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown } from 'lucide-react';
import { Message } from './types';

const CHARS_PER_FRAME = 3;

function useStreamingText(content: string, isStreaming: boolean): string {
	const contentRef = useRef(content);
	const displayedLenRef = useRef(isStreaming ? 0 : content.length);
	const [displayedLength, setDisplayedLength] = useState(
		isStreaming ? 0 : content.length
	);
	const rafRef = useRef<number | null>(null);
	const isStreamingRef = useRef(isStreaming);

	contentRef.current = content;
	isStreamingRef.current = isStreaming;

	useEffect(() => {
		if (displayedLenRef.current >= content.length && !isStreaming) {
			return;
		}

		const animate = () => {
			const target = contentRef.current;
			const currentLen = displayedLenRef.current;

			if (currentLen < target.length) {
				const nextLen = Math.min(
					currentLen + CHARS_PER_FRAME,
					target.length
				);
				displayedLenRef.current = nextLen;
				setDisplayedLength(nextLen);
			}

			const stillStreaming = isStreamingRef.current;
			const caughtUp =
				displayedLenRef.current >= contentRef.current.length;

			if (stillStreaming || !caughtUp) {
				rafRef.current = requestAnimationFrame(animate);
			} else {
				rafRef.current = null;
			}
		};

		rafRef.current = requestAnimationFrame(animate);

		return () => {
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
		};
	}, [isStreaming, content]);

	return content.slice(0, displayedLength);
}

function StreamingMessage({
	content,
	isStreaming,
}: {
	content: string;
	isStreaming: boolean;
}) {
	const displayedContent = useStreamingText(content, isStreaming);
	return <ReactMarkdown>{displayedContent || 'Thinking...'}</ReactMarkdown>;
}

interface ChatMessagesProps {
	messages: Message[];
	isLoading: boolean;
}

export default function ChatMessages({
	messages,
	isLoading,
}: ChatMessagesProps) {
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const isNearBottomRef = useRef(true);
	const [showJumpButton, setShowJumpButton] = useState(false);

	const handleScroll = useCallback(() => {
		const el = containerRef.current;
		if (!el) return;
		const atBottom =
			el.scrollHeight - el.scrollTop - el.clientHeight < 80;
		isNearBottomRef.current = atBottom;
		if (atBottom) {
			setShowJumpButton(false);
		} else if (isLoading) {
			setShowJumpButton(true);
		}
	}, [isLoading]);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
		isNearBottomRef.current = true;
		setShowJumpButton(false);
	}, []);

	useEffect(() => {
		if (messages.length > 0) {
			const lastMsg = messages[messages.length - 1];
			if (lastMsg.role === 'user' || isNearBottomRef.current) {
				messagesEndRef.current?.scrollIntoView({
					behavior: 'smooth',
				});
				isNearBottomRef.current = true;
			}
		}
	}, [messages.length]);

	useEffect(() => {
		if (!isLoading) {
			setShowJumpButton(false);
			return;
		}
		const interval = setInterval(() => {
			if (isNearBottomRef.current) {
				messagesEndRef.current?.scrollIntoView({
					behavior: 'smooth',
				});
			}
		}, 300);
		return () => clearInterval(interval);
	}, [isLoading]);

	return (
		<div
			ref={containerRef}
			onScroll={handleScroll}
			className="chat-panel-messages relative overflow-y-auto px-4 sm:px-6 py-4 space-y-4"
		>
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
								<StreamingMessage
									content={message.content}
									isStreaming={
										isLoading &&
										index === messages.length - 1
									}
								/>
							</div>
						) : (
							<p className="whitespace-pre-wrap">{message.content}</p>
						)}
					</div>
				</div>
			))}

			{/* Loading indicator */}
			{isLoading && (
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

			<div ref={messagesEndRef} />

			{showJumpButton && (
				<button
					onClick={scrollToBottom}
					className="sticky bottom-2 left-1/2 -translate-x-1/2 z-10
						bg-[#4B9CD3]/90 backdrop-blur text-white text-xs
						px-3 py-1.5 rounded-full flex items-center gap-1
						shadow-lg hover:bg-[#4B9CD3] transition-colors"
				>
					<ChevronDown size={14} />
					New message
				</button>
			)}
		</div>
	);
}
