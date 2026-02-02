# ImagineSoftware RAG Assistant

A RAG-powered chat interface for ImagineSoftware business development. Potential clients can describe their business challenges and receive relevant case studies and white paper references.

## Features

- **Stateless Chat Interface** - Clean, single-turn Q&A
- **Two-Layer Guardrails** - LLM classification + embedding similarity to keep queries on-topic
- **Cohere Re-ranking** - Retrieves candidates then re-ranks for the top 3 most relevant documents
- **Streaming Responses** - Real-time response streaming using Vercel AI SDK

## Tech Stack

- **Framework**: Next.js 15, React 19, TypeScript
- **Vector Database**: Qdrant
- **Embeddings**: OpenAI `text-embedding-3-small` (512 dimensions)
- **LLM**: OpenAI GPT-4o
- **Re-ranking**: Cohere `rerank-english-v3.0`
- **Styling**: TailwindCSS

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your API keys:

```bash
cp .env.example .env
```

Required keys:
- `OPENAI_API_KEY` - For embeddings and chat completions
- `QDRANT_URL` - Your Qdrant cluster URL
- `QDRANT_API_KEY` - Your Qdrant API key
- `COHERE_RERANK_API` - For re-ranking search results

### 3. Prepare Your Documents

Add your documents to the appropriate files:

**Case Studies** - `app/scripts/data/case_studies.json`:
```json
[
  {
    "documentType": "case_study",
    "title": "Case Study Title",
    "client": "Client Name",
    "clientDescription": "Description of the client...",
    "clientDetails": ["Detail 1", "Detail 2"],
    "location": "City, State",
    "challenge": "The problem they faced",
    "challengeDescription": "Detailed challenge description...",
    "challengeDetails": ["Challenge 1", "Challenge 2"],
    "solution": "How ImagineSoftware helped",
    "solutionDetails": ["Solution detail 1", "Solution detail 2"],
    "result": "The outcome",
    "resultDetails": ["Result 1", "Result 2"]
  }
]
```

**White Papers** - `app/scripts/data/white_papers.json`:
```json
[
  {
    "documentType": "white_paper",
    "title": "White Paper Title",
    "content": "Full text content that will be embedded...",
    "service": "Service Name",
    "statusQuo": "Current industry state",
    "keyPoints": ["Point 1", "Point 2"],
    "challenges": [{ "problem": "Problem", "impact": "Impact" }],
    "potentialRisks": ["Risk 1"],
    "conclusions": ["Conclusion 1"]
  }
]
```

### 4. Upload Documents to Qdrant

```bash
npm run upload-documents
```

This will:
- Create the `imagineSoftware` collection if it doesn't exist
- Generate embeddings for each document
- Upload to Qdrant with metadata

### 5. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/
├── agents/
│   ├── rag.ts          # Main RAG agent with retrieval tool
│   └── types.ts        # TypeScript types for documents
├── api/
│   ├── chat/           # Main chat endpoint
│   ├── guardrail/      # Query validation endpoint
│   └── upload-document/ # Document upload API
├── libs/
│   ├── cohere.ts       # Cohere re-ranking client
│   ├── openai/         # OpenAI client configuration
│   └── qdrant.ts       # Qdrant client
├── scripts/
│   ├── data/
│   │   ├── case_studies.json  # Case studies
│   │   └── white_papers.json  # White papers
│   └── upload-documents.ts    # Upload script
└── page.tsx            # Main chat UI
```

## Document Schemas

### Case Study

```typescript
{
  documentType: 'case_study',
  content: string,           // Full text for embedding
  client?: string,           // Client name (optional)
  location?: string,
  challenge: string,         // Business challenge
  solution: string,          // ImagineSoftware's solution
  result: string,            // Outcome
  relevantPoints?: string[]  // Additional context
}
```

### White Paper

```typescript
{
  documentType: 'white_paper',
  content: string,           // Full text for embedding
  service: string,           // Service/product covered
  statusQuo?: string,
  keyPoints?: string[],
  challenges?: Array<{ problem: string, impact: string }>,
  potentialRisks?: string[],
  conclusions?: string[]
}
```

## API Endpoints

### POST /api/guardrail
Validates if a query is on-topic for ImagineSoftware's services.

### POST /api/chat
Main chat endpoint. Streams RAG-powered responses.

### POST /api/upload-document
Upload individual documents (case studies or white papers).

## Configuration

Key thresholds in `app/api/guardrail/route.ts`:
- `CONFIDENCE_THRESHOLD`: 4 (LLM confidence score minimum)
- `SIMILARITY_THRESHOLD`: 0.45 (Embedding cosine similarity minimum)

Re-ranking settings in `app/agents/rag.ts`:
- Retrieves top 15 candidates from Qdrant
- Re-ranks to top 3 with Cohere
