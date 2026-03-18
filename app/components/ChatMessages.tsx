'use client';

import ReactMarkdown from 'react-markdown';
import { Message } from './types';

interface ChatMessagesProps {
	messages: Message[];
	isLoading: boolean;
}

export default function ChatMessages({
	messages,
	isLoading,
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
								<ReactMarkdown>
									{message.content ||
										(isLoading && index === messages.length - 1
											? 'Thinking...'
											: message.content)}
								</ReactMarkdown>
							</div>
						) : (
							<p className="whitespace-pre-wrap">{message.content}</p>
						)}
					</div>
				</div>
			))}

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
		</div>
	);
}
