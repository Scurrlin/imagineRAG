/**
 * Rate Limiter
 *
 * Simple in-memory rate limiter using sliding window algorithm.
 * For production with multiple instances, upgrade to Redis-backed solution
 * like @upstash/ratelimit.
 *
 * Usage:
 *   const { success, remaining, reset } = rateLimiter.check(identifier);
 *   if (!success) return new Response('Too many requests', { status: 429 });
 */

import { RATE_LIMIT_CONFIG } from '@/app/config';

interface RateLimitEntry {
	count: number;
	resetTime: number;
}

interface RateLimitResult {
	success: boolean;
	limit: number;
	remaining: number;
	reset: number;
}

class RateLimiter {
	private store: Map<string, RateLimitEntry> = new Map();
	private readonly maxRequests: number;
	private readonly windowMs: number;

	constructor(maxRequests: number, windowMs: number) {
		this.maxRequests = maxRequests;
		this.windowMs = windowMs;

		// Clean up expired entries every minute
		setInterval(() => this.cleanup(), 60 * 1000);
	}

	/**
	 * Check if a request should be allowed
	 * @param identifier - Unique identifier (usually IP address)
	 * @returns Rate limit result with success status and metadata
	 */
	check(identifier: string): RateLimitResult {
		const now = Date.now();
		const entry = this.store.get(identifier);

		// No existing entry or window expired - allow and create new entry
		if (!entry || now > entry.resetTime) {
			const resetTime = now + this.windowMs;
			this.store.set(identifier, { count: 1, resetTime });
			return {
				success: true,
				limit: this.maxRequests,
				remaining: this.maxRequests - 1,
				reset: resetTime,
			};
		}

		// Within window - check if under limit
		if (entry.count < this.maxRequests) {
			entry.count++;
			return {
				success: true,
				limit: this.maxRequests,
				remaining: this.maxRequests - entry.count,
				reset: entry.resetTime,
			};
		}

		// Over limit
		return {
			success: false,
			limit: this.maxRequests,
			remaining: 0,
			reset: entry.resetTime,
		};
	}

	/**
	 * Remove expired entries to prevent memory leaks
	 */
	private cleanup(): void {
		const now = Date.now();
		for (const [key, entry] of this.store.entries()) {
			if (now > entry.resetTime) {
				this.store.delete(key);
			}
		}
	}
}

// Singleton instance
export const rateLimiter = new RateLimiter(
	RATE_LIMIT_CONFIG.MAX_REQUESTS,
	RATE_LIMIT_CONFIG.WINDOW_MS
);

/**
 * Get client IP address from request headers
 * Works with proxies (Render, Vercel, Cloudflare, etc.)
 */
export function getClientIp(request: Request): string {
	// Try common proxy headers first
	const forwardedFor = request.headers.get('x-forwarded-for');
	if (forwardedFor) {
		// x-forwarded-for can contain multiple IPs; first one is the client
		return forwardedFor.split(',')[0].trim();
	}

	const realIp = request.headers.get('x-real-ip');
	if (realIp) {
		return realIp;
	}

	// Fallback for local development
	return '127.0.0.1';
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
	return {
		'X-RateLimit-Limit': result.limit.toString(),
		'X-RateLimit-Remaining': result.remaining.toString(),
		'X-RateLimit-Reset': result.reset.toString(),
		...(result.success ? {} : { 'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString() }),
	};
}
