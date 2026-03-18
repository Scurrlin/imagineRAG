'use client';

import { useState, useEffect, useRef, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { BookOpen } from 'lucide-react';
import { Message } from './types';

const TYPEWRITER_SPEED_MS = 30;
const SOURCES_DELIMITER = /\n---\n\*\*Sources:\*\*/;

function splitSources(content: string): { body: string; sources: string | null } {
	const match = content.match(SOURCES_DELIMITER);
	if (!match || match.index === undefined) return { body: content, sources: null };
	const body = content.slice(0, match.index).trimEnd();
	const sourcesRaw = content.slice(match.index + match[0].length).trim();
	return { body, sources: sourcesRaw };
}

function SourcesBlock({ markdown }: { markdown: string }) {
	const items = markdown
		.split(/\n- /)
		.map((s) => s.replace(/^- /, '').trim())
		.filter(Boolean);

	return (
		<div className="mt-3 pt-3 border-t border-white/10">
			<div className="flex items-center gap-1.5 mb-1.5 text-white/50 text-xs font-medium uppercase tracking-wide">
				<BookOpen className="w-3.5 h-3.5" />
				Sources
			</div>
			<ol className="text-sm text-white/60 list-decimal list-inside space-y-1">
				{items.map((item, i) => (
					<li key={i}>
						<ReactMarkdown components={{ p: ({ children }) => <span>{children}</span> }}>
							{item}
						</ReactMarkdown>
					</li>
				))}
			</ol>
		</div>
	);
}

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

export interface ChatMessagesHandle {
	smoothScrollToBottom: () => void;
}

interface ChatMessagesProps {
	messages: Message[];
	isLoading: boolean;
	typingMessageId: string | null;
	onTypewriterComplete: () => void;
	onScrollStateChange?: (isAtBottom: boolean) => void;
}

const ChatMessages = forwardRef<ChatMessagesHandle, ChatMessagesProps>(function ChatMessages({
	messages,
	isLoading,
	typingMessageId,
	onTypewriterComplete,
	onScrollStateChange,
}, ref) {
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
		const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
		setIsAtBottom(atBottom);
		onScrollStateChange?.(atBottom);
	}, [onScrollStateChange]);

	useImperativeHandle(ref, () => ({ smoothScrollToBottom }), [smoothScrollToBottom]);

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
					{message.role === 'assistant' ? (() => {
						const { body, sources } = splitSources(message.content);
						return (
						<>
							<div className="prose prose-sm max-w-none">
								{message.id === typingMessageId ? (
								<TypewriterText
									text={body}
									onComplete={onTypewriterComplete}
									onWordReveal={scrollToBottom}
								/>
								) : (
									<ReactMarkdown>
										{body ||
											(isLoading && index === messages.length - 1
												? 'Thinking...'
												: body)}
									</ReactMarkdown>
								)}
							</div>
							{sources && message.id !== typingMessageId && (
								<SourcesBlock markdown={sources} />
							)}
						</>
						);
					})() : (
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
		</div>
	);
});

export default ChatMessages;
