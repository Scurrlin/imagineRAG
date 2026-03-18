'use client';

import { useRef, useEffect } from 'react';
import { Send, Trash2, MessageSquare, CircleHelp } from 'lucide-react';
import { CHAT_CONFIG } from '@/app/config';

interface ChatInputProps {
	input: string;
	isLoading: boolean;
	hasMessages: boolean;
	chatOpen: boolean;
	onInputChange: (value: string) => void;
	onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
	onClear: () => void;
	onToggleChat: () => void;
}

export default function ChatInput({
	input,
	isLoading,
	hasMessages,
	chatOpen,
	onInputChange,
	onSubmit,
	onClear,
	onToggleChat,
}: ChatInputProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const lastQuestionIndexRef = useRef(-1);

	// Focus textarea when chat opens
	useEffect(() => {
		if (chatOpen && textareaRef.current) {
			textareaRef.current.focus();
		}
	}, [chatOpen]);

	const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		onInputChange(e.target.value);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			if (input.trim() && !isLoading) {
				onSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
			}
		}
	};

	const handleSampleQuestion = () => {
		const questions = CHAT_CONFIG.SAMPLE_QUESTIONS;
		let index;
		do {
			index = Math.floor(Math.random() * questions.length);
		} while (index === lastQuestionIndexRef.current && questions.length > 1);
		lastQuestionIndexRef.current = index;
		onInputChange(questions[index]);
	};

	return (
		<div className={chatOpen ? 'px-4 sm:px-6 pb-4 pt-2' : 'glass rounded-2xl p-4 shadow-2xl'}>
			{/* Action buttons row - only when chat is closed */}
			{!chatOpen && (
				<div className="mb-3 flex gap-2">
					<button
						type="button"
						onClick={handleSampleQuestion}
						disabled={isLoading}
						className="h-10 flex-1 sm:flex-initial flex items-center justify-center sm:justify-start gap-2 px-2 py-2 bg-[#4B9CD3] text-white text-sm font-medium rounded-lg hover:bg-[#3A8BC2] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
					>
						<CircleHelp className="w-4 h-4" />
						Sample Question
					</button>
					{hasMessages && (
						<button
							type="button"
							onClick={onToggleChat}
							className="h-10 flex-1 sm:flex-initial flex items-center justify-center sm:justify-start gap-2 px-2 py-2 bg-white/10 text-white/80 text-sm font-medium rounded-lg hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
						>
							<MessageSquare className="w-4 h-4" />
							View Chat
						</button>
					)}
				</div>
			)}

			<form
				onSubmit={onSubmit}
				className="flex flex-col sm:flex-row gap-1.5 sm:gap-3 sm:items-stretch"
			>
				{/* Textarea */}
				<div className="flex-1">
					<textarea
						ref={textareaRef}
						value={input}
						onChange={handleTextareaChange}
						onKeyDown={handleKeyDown}
						placeholder="What's your biggest billing or revenue cycle challenge right now?"
						maxLength={CHAT_CONFIG.MAX_MESSAGE_LENGTH}
					className={`chat-textarea w-full h-full resize-none outline-none rounded-xl px-4 py-3 text-white text-base transition-all ${
					chatOpen
						? 'bg-white/10 border border-white/30 placeholder-white/40 focus:border-white/50 focus:bg-white/15'
						: 'bg-white/10 border border-white placeholder-white/70 focus:border-white focus:bg-white/15'
					}`}
						disabled={isLoading}
						rows={3}
					/>
				</div>

				{/* Labeled buttons */}
				<div className="flex gap-3 sm:flex-col sm:w-[120px]">
					<button
						type="submit"
						disabled={isLoading || !input.trim()}
						className="flex-1 h-10 sm:h-auto flex items-center justify-center gap-2 px-5 py-2 sm:py-3 text-sm sm:text-base bg-[#4B9CD3] text-white rounded-xl font-medium hover:bg-[#3A8BC2] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
					>
						<Send className="w-4 h-4" />
						{isLoading ? 'Sending...' : 'Send'}
					</button>
					<button
						type="button"
						onClick={onClear}
						disabled={isLoading || !hasMessages}
						className="flex-1 h-10 sm:h-auto flex items-center justify-center gap-2 px-5 py-2 sm:py-3 text-sm sm:text-base bg-white/10 text-white/70 rounded-xl font-medium hover:bg-white/15 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
					>
						<Trash2 className="w-4 h-4" />
						Clear
					</button>
				</div>
			</form>

			{/* Character limit warning */}
			{input.length > CHAT_CONFIG.WARNING_THRESHOLD && (
				<div
					className={`text-center text-xs mt-2 font-medium ${
						input.length >= CHAT_CONFIG.MAX_MESSAGE_LENGTH
							? 'text-red-400'
							: 'text-white/50'
					}`}
				>
					{input.length >= CHAT_CONFIG.MAX_MESSAGE_LENGTH
						? `Character limit reached: ${input.length}/${CHAT_CONFIG.MAX_MESSAGE_LENGTH}`
						: `Maximum ${CHAT_CONFIG.MAX_MESSAGE_LENGTH} characters: ${input.length}/${CHAT_CONFIG.MAX_MESSAGE_LENGTH}`}
				</div>
			)}
		</div>
	);
}
