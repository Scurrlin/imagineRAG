'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from './types';

const TYPEWRITER_SPEED_MS = 30;

function TypewriterText({ text, onComplete }: { text: string; onComplete: () => void }) {
	const [wordCount, setWordCount] = useState(0);
	const onCompleteRef = useRef(onComplete);
	onCompleteRef.current = onComplete;
	const words = useMemo(() => text.match(/\S+\s*/g) || [], [text]);

	useEffect(() => {
		if (wordCount >= words.length) {
			onCompleteRef.current();
			return;
		}
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
	return (
		<div className="chat-panel-messages relative overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
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
	);
}
