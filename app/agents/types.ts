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

export type AgentResponse = StreamTextResult<any, any>;

// =============================================================================
// Document Types for ImagineSoftware Knowledge Base
// =============================================================================

export type DocumentType = 'case_study' | 'white_paper_chunk';

/**
 * Case Study - Full doc stored as single vector
 */
export interface CaseStudyDocument {
	documentType: 'case_study';
	title: string;
	client?: string;
	clientDescription?: string;
	clientDetails?: string[];
	location: string;
	challenge: string;
	challengeDescription: string;
	challengeDetails: string[];
	solution: string;
	solutionDetails: string[];
	result: string;
	resultDetails: string[];
	content: string; // Embedded content
}

/**
 * White Paper Chunk - Each white paper section stored as a separate vector
 */
export interface WhitePaperChunkDocument {
	documentType: 'white_paper_chunk';
	chunkType: 'executive_summary' | 'section' | 'key_takeaways';
	// Parent doc metadata
	parentTitle: string;
	subtitle: string;
	theme: string;
	year: string;
	// Section-specific fields
	sectionTitle?: string;
	sectionType?: string;
	keyPoints?: string[];
	quotes?: string[];
	// Actual content for embedding
	content: string;
}

export type DocumentMetadata = CaseStudyDocument | WhitePaperChunkDocument;

// =============================================================================
// Retrieved Document Types (after search and re-ranking)
// =============================================================================

export interface RetrievedDocument {
	content: string;
	relevanceScore: number;
	metadata: Record<string, unknown>;
}
