import { Request, Response, NextFunction } from "express";
import { RateLimitStore } from "../shared/types/rateLimit";
import { createRateLimiter } from "../shared/factory/createRateLimiter";
import { AuthRequest } from "../shared/types/authRequest";

export default function rateLimitMiddleware(store: RateLimitStore) {
  const activeAlgorithm = process.env.ACTIVE_RATE_LIMIT_ALGORITHM;

  if (!activeAlgorithm) {
    throw new Error("ACTIVE_RATE_LIMIT_ALGORITHM is not configured");
  }

  const limiter = createRateLimiter(activeAlgorithm, store);

  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const clientId = req.clientId!;
    const allowed = await limiter.allow(`${clientId}`);

    if (!allowed) {
      res.status(429).json({
        error: "rate limit exceeded",
      });
      return;
    }

    next();
  };
}
