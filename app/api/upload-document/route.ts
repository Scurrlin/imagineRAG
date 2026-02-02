import { NextRequest, NextResponse } from 'next/server';
import { openaiClient } from '@/app/libs/openai';
import { qdrantClient } from '@/app/libs/qdrant';
import { z } from 'zod';

const COLLECTION_NAME = 'imagineSoftware';

// Schema for case studies
const caseStudySchema = z.object({
	documentType: z.literal('case_study'),
	content: z.string().min(50, 'Content must be at least 50 characters'),
	client: z.string().optional(),
	location: z.string().optional(),
	challenge: z.string(),
	solution: z.string(),
	result: z.string(),
	relevantPoints: z.array(z.string()).optional(),
});

// Schema for white papers
const whitePaperSchema = z.object({
	documentType: z.literal('white_paper'),
	content: z.string().min(50, 'Content must be at least 50 characters'),
	service: z.string(),
	statusQuo: z.string().optional(),
	keyPoints: z.array(z.string()).optional(),
	challenges: z
		.array(
			z.object({
				problem: z.string(),
				impact: z.string(),
			})
		)
		.optional(),
	potentialRisks: z.array(z.string()).optional(),
	conclusions: z.array(z.string()).optional(),
});

// Combined schema - accepts either type
const uploadDocumentSchema = z.discriminatedUnion('documentType', [
	caseStudySchema,
	whitePaperSchema,
]);

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();

		// Validate the request body
		const document = uploadDocumentSchema.parse(body);

		// Generate embedding for the content
		const embedding = await openaiClient.embeddings.create({
			model: 'text-embedding-3-small',
			dimensions: 512,
			input: document.content,
		});

		// Prepare payload (all fields except content go into metadata)
		const { content, ...metadata } = document;

		// Upsert to Qdrant
		await qdrantClient.upsert(COLLECTION_NAME, {
			wait: true,
			points: [
				{
					id: crypto.randomUUID(),
					vector: embedding.data[0].embedding,
					payload: {
						content,
						...metadata,
					},
				},
			],
		});

		return NextResponse.json(
			{
				success: true,
				message: `${document.documentType === 'case_study' ? 'Case study' : 'White paper'} uploaded successfully`,
				documentType: document.documentType,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error uploading document:', error);

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{
					error: 'Validation error',
					details: error.errors,
				},
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{
				error: 'Failed to upload document',
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
