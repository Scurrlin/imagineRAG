'use client';

import { useRef, useEffect } from 'react';
import { Send, Trash2, MessageSquare } from 'lucide-react';
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

	return (
		<div className={chatOpen ? 'px-4 sm:px-6 pb-4 pt-2' : 'glass rounded-2xl p-4 shadow-2xl'}>
			{/* Open chat button - only when chat is closed and has messages */}
			{!chatOpen && hasMessages && (
				<button
					type="button"
					onClick={onToggleChat}
					className="mb-3 flex items-center gap-2 px-4 py-2 bg-[#4B9CD3] text-white text-sm font-medium rounded-lg hover:bg-[#3A8BC2] transition-colors cursor-pointer"
				>
					<MessageSquare className="w-4 h-4" />
					View Conversation
				</button>
			)}

			<form
				onSubmit={onSubmit}
				className="flex flex-col sm:flex-row gap-3 sm:items-stretch"
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
					className={`w-full h-full resize-none outline-none rounded-xl px-4 py-3 text-white text-base transition-all ${
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
						className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#4B9CD3] text-white rounded-xl font-medium hover:bg-[#3A8BC2] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
					>
						<Send className="w-4 h-4" />
						{isLoading ? 'Sending...' : 'Send'}
					</button>
					<button
						type="button"
						onClick={onClear}
						disabled={isLoading || !hasMessages}
						className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white/10 text-white/70 rounded-xl font-medium hover:bg-white/15 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
					>
						<Trash2 className="w-4 h-4" />
						Clear
					</button>
				</div>
			</form>

			{/* Character counter */}
			{input.length > CHAT_CONFIG.WARNING_THRESHOLD && (
				<div
					className={`text-center text-xs mt-1.5 ${
						input.length >= CHAT_CONFIG.MAX_MESSAGE_LENGTH
							? 'text-red-400'
							: 'text-white/40'
					}`}
				>
					{input.length}/{CHAT_CONFIG.MAX_MESSAGE_LENGTH}
				</div>
			)}
		</div>
	);
}
