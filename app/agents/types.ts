import { z } from 'zod';
import { StreamTextResult } from 'ai';

export const messageSchema = z.object({
	role: z.enum(['user', 'assistant', 'system']),
	content: z.string(),
});

export type Message = z.infer<typeof messageSchema>;

export interface AgentRequest {
	query: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AgentResponse = StreamTextResult<any, any>;

// Document types for ImagineSoftware knowledge base
export type DocumentType = 'case_study' | 'white_paper';

export interface CaseStudyMetadata {
	documentType: 'case_study';
	client?: string;
	location?: string;
	challenge: string;
	solution: string;
	result: string;
	relevantPoints?: string[];
}

export interface WhitePaperMetadata {
	documentType: 'white_paper';
	service: string;
	statusQuo?: string;
	keyPoints?: string[];
	challenges?: Array<{ problem: string; impact: string }>;
	potentialRisks?: string[];
	conclusions?: string[];
}

export type DocumentMetadata = CaseStudyMetadata | WhitePaperMetadata;
