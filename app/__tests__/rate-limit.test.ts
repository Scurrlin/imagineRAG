import {
	rateLimiter,
	dailyLimiter,
	getClientIp,
	rateLimitHeaders,
	dailyLimitHeaders,
} from '../libs/rate-limit';
import { RATE_LIMIT_CONFIG, DAILY_LIMIT_CONFIG } from '../config';

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

describe('rateLimiter', () => {
	it('allows requests under the limit', () => {
		const ip = 'test-allow-' + Date.now();
		const result = rateLimiter.check(ip);

		expect(result.success).toBe(true);
		expect(result.limit).toBe(RATE_LIMIT_CONFIG.MAX_REQUESTS);
		expect(result.remaining).toBe(RATE_LIMIT_CONFIG.MAX_REQUESTS - 1);
	});

	it('blocks requests when limit is reached', () => {
		const ip = 'test-block-' + Date.now();

		for (let i = 0; i < RATE_LIMIT_CONFIG.MAX_REQUESTS; i++) {
			rateLimiter.check(ip);
		}

		const blocked = rateLimiter.check(ip);
		expect(blocked.success).toBe(false);
		expect(blocked.remaining).toBe(0);
	});

	it('resets after the window expires', () => {
		const ip = 'test-reset-' + Date.now();

		for (let i = 0; i < RATE_LIMIT_CONFIG.MAX_REQUESTS; i++) {
			rateLimiter.check(ip);
		}
		expect(rateLimiter.check(ip).success).toBe(false);

		jest.advanceTimersByTime(RATE_LIMIT_CONFIG.WINDOW_MS + 1);

		const afterReset = rateLimiter.check(ip);
		expect(afterReset.success).toBe(true);
		expect(afterReset.remaining).toBe(RATE_LIMIT_CONFIG.MAX_REQUESTS - 1);
	});
});

describe('dailyLimiter', () => {
	it('uses the daily limit config', () => {
		const ip = 'test-daily-' + Date.now();
		const result = dailyLimiter.check(ip);

		expect(result.success).toBe(true);
		expect(result.limit).toBe(DAILY_LIMIT_CONFIG.MAX_MESSAGES);
	});
});

describe('getClientIp', () => {
	function makeRequest(headers: Record<string, string> = {}): Request {
		return {
			headers: {
				get: (name: string) => headers[name.toLowerCase()] ?? null,
			},
		} as unknown as Request;
	}

	it('extracts IP from x-forwarded-for (first entry)', () => {
		const req = makeRequest({ 'x-forwarded-for': '203.0.113.1, 10.0.0.1' });
		expect(getClientIp(req)).toBe('203.0.113.1');
	});

	it('extracts IP from x-real-ip', () => {
		const req = makeRequest({ 'x-real-ip': '198.51.100.5' });
		expect(getClientIp(req)).toBe('198.51.100.5');
	});

	it('prefers x-forwarded-for over x-real-ip', () => {
		const req = makeRequest({
			'x-forwarded-for': '203.0.113.1',
			'x-real-ip': '198.51.100.5',
		});
		expect(getClientIp(req)).toBe('203.0.113.1');
	});

	it('falls back to 127.0.0.1 when no headers present', () => {
		const req = makeRequest();
		expect(getClientIp(req)).toBe('127.0.0.1');
	});
});

describe('rateLimitHeaders', () => {
	it('includes standard rate limit headers', () => {
		const headers = rateLimitHeaders({
			success: true,
			limit: 20,
			remaining: 15,
			reset: 1700000000000,
		});

		expect(headers).toEqual(
			expect.objectContaining({
				'X-RateLimit-Limit': '20',
				'X-RateLimit-Remaining': '15',
				'X-RateLimit-Reset': '1700000000000',
			})
		);
	});

	it('includes Retry-After when rate limited', () => {
		const futureReset = Date.now() + 30000;
		const headers = rateLimitHeaders({
			success: false,
			limit: 20,
			remaining: 0,
			reset: futureReset,
		});

		expect(headers).toHaveProperty('Retry-After');
	});
});

describe('dailyLimitHeaders', () => {
	it('includes daily limit headers', () => {
		const headers = dailyLimitHeaders({
			success: true,
			limit: 100,
			remaining: 50,
			reset: 1700000000000,
		});

		expect(headers).toEqual(
			expect.objectContaining({
				'X-DailyLimit-Limit': '100',
				'X-DailyLimit-Remaining': '50',
				'X-DailyLimit-Reset': '1700000000000',
			})
		);
	});
});
