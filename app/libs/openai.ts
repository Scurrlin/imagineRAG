/**
 * OpenAI Client Configuration
 *
 * Includes Helicone integration for observability (optional).
 * If you don't have a Helicone API key, the client uses OpenAI directly.
 */

import OpenAI from 'openai';
import { env } from '@/app/config';

const useHelicone = !!env.HELICONE_API_KEY;

export const openaiClient = new OpenAI({
	apiKey: env.OPENAI_API_KEY,
	...(useHelicone && {
		baseURL: 'https://oai.helicone.ai/v1',
		defaultHeaders: {
			'Helicone-Auth': `Bearer ${env.HELICONE_API_KEY}`,
			'Helicone-Cache-Enabled': 'true',
		},
	}),
});
