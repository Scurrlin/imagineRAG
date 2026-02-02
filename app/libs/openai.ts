/**
 * OpenAI Client Configuration
 *
 * Includes Helicone integration for observability (optional).
 * If you don't have a Helicone API key, remove the baseURL and defaultHeaders.
 */

import OpenAI from 'openai';

const useHelicone = !!process.env.HELICONE_API_KEY;

export const openaiClient = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY as string,
	...(useHelicone && {
		baseURL: 'https://oai.helicone.ai/v1',
		defaultHeaders: {
			'Helicone-Auth': `Bearer ${process.env.HELICONE_API_KEY}`,
			'Helicone-Cache-Enabled': 'true',
		},
	}),
});
