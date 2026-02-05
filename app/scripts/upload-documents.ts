/**
 * Upload Documents Script
 *
 * This script uploads your curated case studies and white papers to Qdrant.
 *
 * Place your documents in:
 *   - app/scripts/data/case_studies.json (case studies)
 *   - app/scripts/data/white_papers.json (white papers)
 *
 * Run with: npm run upload-documents
 */

import 'dotenv/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

// Configuration constants (mirrored from app/config.ts for script usage)
const COLLECTION_NAME = 'imagineSoftware';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const VECTOR_SIZE = 512;

// Validate required environment variables
function getRequiredEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

// Initialize clients with validated env vars
const qdrantClient = new QdrantClient({
	url: getRequiredEnv('QDRANT_URL'),
	apiKey: getRequiredEnv('QDRANT_API_KEY'),
});

const openaiClient = new OpenAI({
	apiKey: getRequiredEnv('OPENAI_API_KEY'),
});

// Type definitions matching your schema
interface CaseStudy {
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
}

interface WhitePaperSection {
	sectionTitle: string;
	sectionType: string;
	content: string;
	keyPoints: string[];
	quotes: string[];
}

interface WhitePaper {
	documentType: 'white_paper';
	title: string;
	subtitle: string;
	theme: string;
	year: string;
	executiveSummary: string;
	sections: WhitePaperSection[];
	keyTakeaways: string;
}

// Chunked document for upload (a section from a white paper)
interface WhitePaperChunk {
	documentType: 'white_paper_chunk';
	chunkType: 'executive_summary' | 'section' | 'key_takeaways';
	// Parent document metadata
	parentTitle: string;
	subtitle: string;
	theme: string;
	year: string;
	// Section-specific fields (for section chunks)
	sectionTitle?: string;
	sectionType?: string;
	keyPoints?: string[];
	quotes?: string[];
	// The actual content for embedding
	content: string;
}

type Document = CaseStudy | WhitePaperChunk;

/**
 * Build embeddable content from structured case study fields
 */
function buildCaseStudyContent(doc: CaseStudy): string {
	const sections: string[] = [doc.title];

	// Optional client info
	if (doc.client) {
		sections.push(`Client: ${doc.client}`);
	}
	if (doc.clientDescription) {
		sections.push(doc.clientDescription);
	}
	if (doc.clientDetails && doc.clientDetails.length > 0) {
		sections.push(`Client Details: ${doc.clientDetails.join('. ')}`);
	}

	// Location and challenge
	sections.push(`Location: ${doc.location}`);
	sections.push(`Challenge: ${doc.challenge}`);
	sections.push(doc.challengeDescription);
	sections.push(`Challenge Details: ${doc.challengeDetails.join('. ')}`);

	// Solution
	sections.push(`Solution: ${doc.solution}`);
	sections.push(doc.solutionDetails.join(' '));

	// Results
	sections.push(`Result: ${doc.result}`);
	sections.push(doc.resultDetails.join('. '));

	return sections.join('\n\n');
}

/**
 * Chunk a white paper into separate embeddable documents
 * Creates chunks for: executive summary, each section, and key takeaways
 */
function chunkWhitePaper(doc: WhitePaper): WhitePaperChunk[] {
	const chunks: WhitePaperChunk[] = [];
	const parentMetadata = {
		parentTitle: doc.title,
		subtitle: doc.subtitle,
		theme: doc.theme,
		year: doc.year,
	};

	// Chunk 1: Executive Summary
	if (doc.executiveSummary && doc.executiveSummary.trim()) {
		const summaryContent = [
			`${doc.title}`,
			`Topic: ${doc.subtitle} | Theme: ${doc.theme}`,
			``,
			`Executive Summary:`,
			doc.executiveSummary,
		].join('\n');

		chunks.push({
			documentType: 'white_paper_chunk',
			chunkType: 'executive_summary',
			...parentMetadata,
			content: summaryContent,
		});
	}

	// Chunk 2-N: Each Section
	for (const section of doc.sections) {
		const sectionParts: string[] = [
			`${doc.title} - ${section.sectionTitle}`,
			`Topic: ${doc.subtitle} | Section Type: ${section.sectionType}`,
			``,
			section.content,
		];

		if (section.keyPoints && section.keyPoints.length > 0) {
			sectionParts.push(`\nKey Points:`);
			sectionParts.push(section.keyPoints.map((kp) => `• ${kp}`).join('\n'));
		}

		if (section.quotes && section.quotes.length > 0) {
			sectionParts.push(`\nNotable Quotes:`);
			sectionParts.push(section.quotes.map((q) => `"${q}"`).join('\n'));
		}

		chunks.push({
			documentType: 'white_paper_chunk',
			chunkType: 'section',
			...parentMetadata,
			sectionTitle: section.sectionTitle,
			sectionType: section.sectionType,
			keyPoints: section.keyPoints,
			quotes: section.quotes,
			content: sectionParts.join('\n'),
		});
	}

	// Final Chunk: Key Takeaways (if present)
	if (doc.keyTakeaways && doc.keyTakeaways.trim()) {
		const takeawaysContent = [
			`${doc.title} - Key Takeaways`,
			`Topic: ${doc.subtitle} | Theme: ${doc.theme}`,
			``,
			`Key Takeaways:`,
			doc.keyTakeaways,
		].join('\n');

		chunks.push({
			documentType: 'white_paper_chunk',
			chunkType: 'key_takeaways',
			...parentMetadata,
			content: takeawaysContent,
		});
	}

	return chunks;
}

/**
 * Build embeddable content from a white paper chunk
 */
function buildWhitePaperChunkContent(chunk: WhitePaperChunk): string {
	return chunk.content;
}

async function ensureCollectionExists() {
	try {
		const collections = await qdrantClient.getCollections();
		const exists = collections.collections.some(
			(c) => c.name === COLLECTION_NAME
		);

		if (!exists) {
			// eslint-disable-next-line no-console
			console.log(`Creating collection: ${COLLECTION_NAME}`);
			await qdrantClient.createCollection(COLLECTION_NAME, {
				vectors: {
					size: VECTOR_SIZE,
					distance: 'Cosine',
				},
			});
			// eslint-disable-next-line no-console
			console.log('Collection created successfully');
		} else {
			// eslint-disable-next-line no-console
			console.log(`Collection ${COLLECTION_NAME} already exists`);
		}
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Error ensuring collection exists:', error);
		throw error;
	}
}

async function generateEmbedding(text: string): Promise<number[]> {
	const response = await openaiClient.embeddings.create({
		model: EMBEDDING_MODEL,
		dimensions: VECTOR_SIZE,
		input: text,
	});
	return response.data[0].embedding;
}

async function uploadDocument(
	document: Document,
	index: number,
	total: number
) {
	let label: string;
	let content: string;

	if (document.documentType === 'case_study') {
		label = document.client || document.title;
		content = buildCaseStudyContent(document);
	} else {
		// white_paper_chunk
		const chunkLabel =
			document.chunkType === 'executive_summary'
				? 'Executive Summary'
				: document.chunkType === 'key_takeaways'
					? 'Key Takeaways'
					: document.sectionTitle || 'Section';
		label = `${document.parentTitle} → ${chunkLabel}`;
		content = buildWhitePaperChunkContent(document);
	}

	// eslint-disable-next-line no-console
	console.log(`Uploading [${index + 1}/${total}]: ${label}`);

	const embedding = await generateEmbedding(content);

	await qdrantClient.upsert(COLLECTION_NAME, {
		wait: true,
		points: [
			{
				id: crypto.randomUUID(),
				vector: embedding,
				payload: {
					content,
					...document,
				},
			},
		],
	});
}

function loadJsonFile<T>(filePath: string): T[] {
	if (!fs.existsSync(filePath)) {
		return [];
	}
	const raw = fs.readFileSync(filePath, 'utf-8');
	return JSON.parse(raw);
}

async function main() {
	// eslint-disable-next-line no-console
	console.log('Starting document upload...\n');

	// Ensure collection exists
	await ensureCollectionExists();

	// Load documents from both JSON files
	const caseStudiesPath = path.join(__dirname, 'data', 'case_studies.json');
	const whitePapersPath = path.join(__dirname, 'data', 'white_papers.json');

	const caseStudies = loadJsonFile<CaseStudy>(caseStudiesPath);
	const whitePapers = loadJsonFile<WhitePaper>(whitePapersPath);

	if (caseStudies.length === 0 && whitePapers.length === 0) {
		// eslint-disable-next-line no-console
		console.log('\n⚠️  No documents found!');
		// eslint-disable-next-line no-console
		console.log('Create your documents at:');
		// eslint-disable-next-line no-console
		console.log('  - app/scripts/data/case_studies.json (case studies)');
		// eslint-disable-next-line no-console
		console.log('  - app/scripts/data/white_papers.json (white papers)');
		return;
	}

	// Chunk white papers into sections for better retrieval
	const whitePaperChunks: WhitePaperChunk[] = [];
	for (const wp of whitePapers) {
		const chunks = chunkWhitePaper(wp);
		whitePaperChunks.push(...chunks);
	}

	// Combine all documents
	const documents: Document[] = [...caseStudies, ...whitePaperChunks];

	// eslint-disable-next-line no-console
	console.log(`Found ${caseStudies.length} case studies`);
	// eslint-disable-next-line no-console
	console.log(
		`Found ${whitePapers.length} white papers → chunked into ${whitePaperChunks.length} sections`
	);
	// eslint-disable-next-line no-console
	console.log(`Total: ${documents.length} documents to upload\n`);

	// Upload each document
	for (let i = 0; i < documents.length; i++) {
		try {
			await uploadDocument(documents[i], i, documents.length);
			// Small delay to avoid rate limiting
			await new Promise((resolve) => setTimeout(resolve, 200));
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error(`Error uploading document ${i + 1}:`, error);
		}
	}

	// eslint-disable-next-line no-console
	console.log('\n✅ Upload complete!');

	// Show collection stats
	const collectionInfo = await qdrantClient.getCollection(COLLECTION_NAME);
	// eslint-disable-next-line no-console
	console.log(`\nCollection stats:`);
	// eslint-disable-next-line no-console
	console.log(`  - Points count: ${collectionInfo.points_count}`);
	// eslint-disable-next-line no-console
	console.log(`  - Vector size: ${collectionInfo.config.params.vectors}`);
}

main().catch(console.error);
