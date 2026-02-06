// Chat message type
export interface Message {
	id: string;
	role: 'user' | 'assistant';
	content: string;
}
