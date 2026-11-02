import { rateLimit, RateLimitConfig } from '@/lib/rate-limit';
import { headers } from 'next/headers';

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMIT_CONFIGS = {
  auth: {
    maxRequests: 5, // 5 attempts
    windowMs: 15 * 60 * 1000, // per 15 minutes
  } as RateLimitConfig,
  api: {
    maxRequests: 100, // 100 requests
    windowMs: 60 * 1000, // per minute
  } as RateLimitConfig,
  mutation: {
    maxRequests: 20, // 20 mutations
    windowMs: 60 * 1000, // per minute
  } as RateLimitConfig,
} as const;

/**
 * Get client identifier from request headers
 * Uses X-Forwarded-For for proxied requests, falls back to other headers
 */
export async function getClientIdentifier(): Promise<string> {
  const headersList = await headers();

  // Try to get IP from various headers
  const forwarded = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const cfConnectingIp = headersList.get('cf-connecting-ip');

  // Use the first available IP
  const ip =
    forwarded?.split(',')[0]?.trim() || realIp || cfConnectingIp || 'unknown';

  return ip;
}

/**
 * Apply rate limiting with configurable strategy
 * @param identifier - Unique identifier for the client
 * @param config - Rate limit configuration
 * @returns Rate limit result or throws error
 */
export async function applyRateLimit(
  identifier: string,
  config: RateLimitConfig
) {
  const result = rateLimit(identifier, config);

  if (!result.success) {
    const waitTime = Math.ceil((result.resetTime - Date.now()) / 1000);

    throw new RateLimitError(
      `Too many requests. Please try again in ${waitTime} seconds.`,
      result
    );
  }

  return result;
}

/**
 * Custom error class for rate limiting
 */
export class RateLimitError extends Error {
  public readonly limit: number;
  public readonly remaining: number;
  public readonly resetTime: number;

  constructor(
    message: string,
    rateLimitResult: { limit: number; remaining: number; resetTime: number }
  ) {
    super(message);

    this.name = 'RateLimitError';
    this.limit = rateLimitResult.limit;
    this.remaining = rateLimitResult.remaining;
    this.resetTime = rateLimitResult.resetTime;
  }
}
