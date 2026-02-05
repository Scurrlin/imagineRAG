'use client';

interface ChatInputProps {
	input: string;
	isLoading: boolean;
	hasMessages: boolean;
	onInputChange: (value: string) => void;
	onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
	onClear: () => void;
}

export default function ChatInput({
	input,
	isLoading,
	hasMessages,
	onInputChange,
	onSubmit,
	onClear,
}: ChatInputProps) {
	// Handle textarea change
	const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		onInputChange(e.target.value);
	};

	// Handle Enter key (submit on Enter, new line on Shift+Enter)
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			if (input.trim() && !isLoading) {
				onSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
			}
		}
	};

	return (
		<div className="p-4 bg-gradient-to-r from-[#0A5A7C] to-[#4B9CD3] shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
			<form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 sm:items-stretch">
				<div className="w-full sm:flex-1">
					<textarea
						value={input}
						onChange={handleTextareaChange}
						onKeyDown={handleKeyDown}
						placeholder="What's your biggest billing or revenue cycle challenge right now?"
						maxLength={400}
						className="w-full h-full px-5 py-3 rounded-xl border border-gray-300 focus:border-white focus:ring-2 focus:ring-white/40 outline-none transition-all bg-white text-gray-800 placeholder-gray-400 resize-none"
						disabled={isLoading}
						rows={3}
					/>
				</div>
				<div className="flex gap-3 sm:flex-col sm:w-[120px]">
					<button
						type="submit"
						disabled={isLoading || !input.trim()}
						className="flex-1 px-6 py-3 bg-white text-[#0A5A7C] rounded-xl font-medium disabled:bg-white disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm"
					>
						{isLoading ? 'Sending...' : 'Send'}
					</button>
					<button
						type="button"
						onClick={onClear}
						disabled={isLoading || !hasMessages}
						className="flex-1 px-6 py-3 bg-white text-[#0A5A7C] rounded-xl font-medium disabled:bg-white disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm"
					>
						Clear
					</button>
				</div>
			</form>
			{input.length > 320 && (
				<div
					className={`text-center text-xs mt-2 ${
						input.length >= 400 ? 'text-red-300' : 'text-white/70'
					}`}
				>
					Maximum characters 400: {input.length}/400
				</div>
			)}
		</div>
	);
}
