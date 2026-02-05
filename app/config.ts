/*
 * Centralized configuration for the application.
 * Environment variables are validated at startup.
 */

// =============================================================================
// Environment Variable Validation
// =============================================================================

function getRequiredEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function getOptionalEnv(name: string): string | undefined {
	return process.env[name];
}

export const env = {
	// Required (lazy getters)
	get OPENAI_API_KEY() { return getRequiredEnv('OPENAI_API_KEY'); },
	get QDRANT_URL() { return getRequiredEnv('QDRANT_URL'); },
	get QDRANT_API_KEY() { return getRequiredEnv('QDRANT_API_KEY'); },
	get COHERE_RERANK_API() { return getRequiredEnv('COHERE_RERANK_API'); },

	// Optional
	get HELICONE_API_KEY() { return getOptionalEnv('HELICONE_API_KEY'); },
};

// =============================================================================
// Qdrant Config
// =============================================================================

export const QDRANT_COLLECTION = 'imagineSoftware';
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 512;

// =============================================================================
// RAG Retrieval Config
// =============================================================================

export const RETRIEVAL_CONFIG = {
	// Initial retrieval limits
	TOTAL_RETRIEVE_LIMIT: 14,
	CASE_STUDY_RETRIEVE_LIMIT: 4,
	WHITE_PAPER_RETRIEVE_LIMIT: 10,

	// Re-ranking top N
	CASE_STUDY_RERANK_TOP_N: 1,
	WHITE_PAPER_RERANK_TOP_N: 5,
} as const;

// =============================================================================
// Guardrail Config
// =============================================================================

export const GUARDRAIL_CONFIG = {
	// LLM confidence score minimum (1-10 scale)
	CONFIDENCE_THRESHOLD: 4,

	// Embedding cosine similarity minimum
	SIMILARITY_THRESHOLD: 0.4,

	// Domain description for embedding comparison
	DOMAIN_DESCRIPTION: `Healthcare revenue cycle management. Medical billing challenges. Claims denials and appeals. Payment posting automation. Patient collections. Accounts receivable optimization. Third-party billing problems. In-house billing transition. Practice management software. Healthcare analytics. Radiology billing. Oncology billing. Anesthesiology billing. Pathology billing. Urgent care billing. Outsourced billing vendor issues. Revenue leakage. Days in AR. Clean claim rate. Case study. Client success story. How did you help. Tell me more about. Implementation results. Customer outcomes. Practice management company. Billing company. Medical group. ImagineSoftware products and tools. ImagineOne platform. ImagineBilling system. ImagineAppliance automation. ImaginePay patient payments. ImagineCo-Pilot AI assistant. ImagineIntelligence analytics. AutoCoder coding automation. Charge Central. Criteria Builder. What is ImagineOne. How does ImagineBilling work. Tell me about the tools.`,
} as const;

// =============================================================================
// Rate Limiting
// =============================================================================

export const RATE_LIMIT_CONFIG = {
	// Max requests per window
	MAX_REQUESTS: 20,

	// Time window
	WINDOW_MS: 60 * 1000,
} as const;

// =============================================================================
// Chat Config
// =============================================================================

export const CHAT_CONFIG = {
	MAX_MESSAGE_LENGTH: 400,
	WARNING_THRESHOLD: 320,
} as const;

// =============================================================================
// Video Config
// =============================================================================

export const VIDEO_CONFIG = {
	// Use NEXT_PUBLIC_ prefix for client-side access
	YOUTUBE_VIDEO: process.env.NEXT_PUBLIC_YOUTUBE_VIDEO || 'fCiN0crOXtM',
	PREVIEW_VIDEO:
		process.env.NEXT_PUBLIC_PREVIEW_VIDEO ||
		'https://imagineteam.com/wp-content/uploads/2025/04/ef4b-4206-b344-7937abcb4293.mp4',
	MOBILE_PREVIEW: '/imagine-still.png',
	REPLAY_LOGO: '/imagine-logo2.webp',
};

// =============================================================================
// External Links
// =============================================================================

export const EXTERNAL_LINKS = {
	HOME_PAGE: 'https://imagineteam.com/',
	DEMO_PAGE: 'https://imagineteam.com/imagineone/',
	CONTACT_PAGE: 'https://imagineteam.com/contact-us/',
} as const;
