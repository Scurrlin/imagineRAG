'use client';

import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from './types';
import VideoPlayer from './VideoPlayer';

interface ChatMessagesProps {
	messages: Message[];
	isLoading: boolean;
	showYouTube: boolean;
	onPlayClick: () => void;
}

export default function ChatMessages({
	messages,
	isLoading,
	showYouTube,
	onPlayClick,
}: ChatMessagesProps) {
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom of messages (only when there are messages)
	useEffect(() => {
		if (messages.length > 0) {
			messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
		}
	}, [messages]);

	return (
		<div
			className={`p-3 sm:p-4 space-y-3 ${
				messages.length === 0
					? 'min-h-0 overflow-hidden'
					: 'h-[400px] sm:h-[450px] overflow-y-auto'
			}`}
		>
			{/* Welcome content - shown when no messages */}
			{messages.length === 0 && (
				<div className="text-center py-3 sm:py-4">
					<h3 className="text-xl font-medium text-gray-700 mb-3">
						How can we help your practice?
					</h3>
					<p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed mb-6">
						Tell us about your revenue cycle challenges, billing issues, or
						operational goals. We&apos;re here to help you optimize your
						healthcare business.
					</p>
					<VideoPlayer showYouTube={showYouTube} onPlayClick={onPlayClick} />
				</div>
			)}

			{/* Message bubbles */}
			{messages.map((message) => (
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
							<p className="whitespace-pre-wrap">{message.content}</p>
						)}
					</div>
				</div>
			))}

			{/* Loading indicator */}
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
	);
}
