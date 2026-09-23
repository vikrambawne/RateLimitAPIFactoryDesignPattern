export const rateLimitConfig = {
  algorithms: {
    tokenBucket: process.env.TOKEN_BUCKET_ALGORITHM,
    slidingWindow: process.env.SLIDING_WINDOW_ALGORITHM,
  },
  bucket: {
    capacity: Number(process.env.TOKEN_BUCKET_CAPACITY),
    refillPerSecond: Number(process.env.TOKEN_BUCKET_REFILLPERSECOND),
  },
  window: {
    maxRequests: Number(process.env.SLIDING_WINDOW_MAXREQUESTS),
    windowMs: Number(process.env.SLIDING_WINDOW_WINDOWMS),
  },
};
