# Rate Limit API – Node.js + TypeScript

A simple **Node.js + TypeScript + Express** API demonstrating configurable rate limiting using:

- Token Bucket
- Sliding Window
- Factory Pattern
- Storage abstraction
- JWT authentication
- Memory storage
- File-based persistent storage

---

## Features

- Node.js + TypeScript
- Express.js API
- JWT-based client authentication
- Token Bucket rate limiting
- Sliding Window rate limiting
- Factory Pattern for algorithm selection
- Configurable rate-limit algorithms
- Configurable storage
- Memory storage
- File storage
- HTTP `429` response when the rate limit is exceeded

---

# Architecture Flow

```text
Client
   |
   | Authorization: Bearer <client-id>
   v
Authentication Middleware
   |
   v
Rate Limit Middleware
   |
   v
Rate Limiter Factory
   |
   +-----------------------+
   |                       |
   v                       v
Token Bucket          Sliding Window
   |                       |
   +-----------+-----------+
               |
               v
        RateLimitStore
          /       \
         /         \
     Memory         File
```

---

# Factory Pattern

The project uses the **Factory Pattern** to create the required rate-limiting algorithm.

Instead of creating the limiter directly inside the middleware, the middleware calls:

```typescript
const limiter = createRateLimiter(activeAlgorithm, store);
```

The factory decides which implementation should be created.

### Factory Implementation

```typescript
import { SlidingWindowLimiter } from "../ratelimit/slidingWindow";
import { TokenBuckerLimiter } from "../ratelimit/tokenBucket";
import { RateLimitStore, RateLimiter } from "../types/rateLimit";
import { rateLimitConfig } from "../../config/rateLimit";

export function createRateLimiter(
  algorithm: string,
  store: RateLimitStore,
): RateLimiter {
  switch (algorithm) {
    case rateLimitConfig.algorithms.tokenBucket:
      return new TokenBuckerLimiter(store, rateLimitConfig.bucket);

    case rateLimitConfig.algorithms.slidingWindow:
      return new SlidingWindowLimiter(store, rateLimitConfig.window);

    default:
      throw new Error(`Unsupported rate limit algorithm: ${algorithm}`);
  }
}
```

---

## Why Factory Pattern?

Without the Factory Pattern, the middleware could contain algorithm creation logic:

```typescript
if (algorithm === "token-bucket") {
  // create Token Bucket
}

if (algorithm === "sliding-window") {
  // create Sliding Window
}
```

This makes the middleware responsible for both:

1. Processing HTTP requests
2. Deciding which rate-limit implementation to create

With the Factory Pattern, these responsibilities are separated.

```text
Middleware
    |
    | "I need a rate limiter"
    v
Factory
    |
    |----------------------|
    |                      |
    v                      v
Token Bucket        Sliding Window
```

The middleware does not need to know how the limiter is created.

---

# Factory Pattern Responsibilities

The factory has one main responsibility:

> Create and return the correct `RateLimiter` implementation based on the configured algorithm.

```text
createRateLimiter()
       |
       v
Read algorithm
       |
       +-------------------------+
       |                         |
       v                         v
token-bucket              sliding-window
       |                         |
       v                         v
TokenBuckerLimiter       SlidingWindowLimiter
       |                         |
       +------------+------------+
                    |
                    v
             RateLimiter
```

---

# Algorithm Selection

The active algorithm is configured using:

```env
ACTIVE_RATE_LIMIT_ALGORITHM=token-bucket
```

For Token Bucket:

```env
ACTIVE_RATE_LIMIT_ALGORITHM=token-bucket
```

The factory creates:

```typescript
new TokenBuckerLimiter(store, rateLimitConfig.bucket);
```

For Sliding Window:

```env
ACTIVE_RATE_LIMIT_ALGORITHM=sliding-window
```

The factory creates:

```typescript
new SlidingWindowLimiter(store, rateLimitConfig.window);
```

---

# Factory + Interface

Both algorithms implement the same `RateLimiter` interface.

Conceptually:

```typescript
export interface RateLimiter {
  allow(clientId: string): Promise<boolean>;
}
```

Therefore, the middleware can work with either implementation:

```text
                 RateLimiter
                     |
             +-------+-------+
             |               |
             v               v
     TokenBuckerLimiter   SlidingWindowLimiter
```

The middleware only knows about:

```typescript
limiter.allow(clientId);
```

It does not need to know whether the implementation is Token Bucket or Sliding Window.

---

# Factory + Strategy Design

The implementation can also be understood as a combination of:

- **Factory Pattern** → creates the algorithm
- **Strategy Pattern** → provides interchangeable rate-limiting algorithms

```text
                 Factory
                    |
                    v
             RateLimiter
                    |
        +-----------+-----------+
        |                       |
        v                       v
 Token Bucket Strategy   Sliding Window Strategy
```

This makes algorithms interchangeable without changing the middleware.

---

# Rate Limit Middleware

The middleware reads the active algorithm:

```typescript
const activeAlgorithm = process.env.ACTIVE_RATE_LIMIT_ALGORITHM;
```

Then it uses the factory:

```typescript
const limiter = createRateLimiter(activeAlgorithm, store);
```

For every request:

```typescript
const clientId = req.clientId!;

const allowed = await limiter.allow(`${clientId}`);
```

If the request is rejected:

```typescript
res.status(429).json({
  error: "rate limit exceeded",
});
```

Otherwise:

```typescript
next();
```

### Complete Middleware Flow

```text
HTTP Request
     |
     v
Authentication
     |
     v
Get clientId
     |
     v
Rate Limit Middleware
     |
     v
Factory
     |
     +-----------------------+
     |                       |
     v                       v
Token Bucket          Sliding Window
     |                       |
     +-----------+-----------+
                 |
                 v
          limiter.allow()
                 |
          +------+------+
          |             |
          v             v
       Allowed       Rejected
          |             |
          v             v
       next()         429
```

---

# Adding a New Algorithm

One major advantage of the factory design is that a new algorithm can be added without changing the middleware.

For example, if we want to add **Fixed Window**:

### 1. Create the implementation

```typescript
class FixedWindowLimiter implements RateLimiter {
  async allow(clientId: string): Promise<boolean> {
    // Fixed Window logic
  }
}
```

### 2. Add it to the factory

```typescript
case "fixed-window":

  return new FixedWindowLimiter(
    store,
    rateLimitConfig.fixedWindow
  );
```

### 3. Configure it

```env
ACTIVE_RATE_LIMIT_ALGORITHM=fixed-window
```

The middleware remains unchanged:

```typescript
const limiter = createRateLimiter(activeAlgorithm, store);

const allowed = await limiter.allow(clientId);
```

---

# Rate Limiting Algorithms

## Token Bucket

Configuration:

```env
TOKEN_BUCKET_CAPACITY=5
TOKEN_BUCKET_REFILLPERSECOND=1
```

Meaning:

- Maximum 5 tokens
- Each request consumes 1 token
- 1 token is added every second
- Maximum capacity is always 5

Example:

```text
Initial:

[● ● ● ● ●]
     5

Request
   ↓

[● ● ● ●]
     4
```

---

## Sliding Window

Configuration:

```env
SLIDING_WINDOW_MAXREQUESTS=5
SLIDING_WINDOW_WINDOWMS=10000
```

Meaning:

```text
5 requests
within
10 seconds
```

Example:

```text
10 second window

|--------------------------------|
  R1   R2   R3   R4   R5

Sixth request
      ↓
     429
```

When an old request moves outside the window, a new request can be accepted.

---

# Storage Abstraction

The rate limiter receives a `RateLimitStore`:

```typescript
createRateLimiter(algorithm, store);
```

The algorithm does not need to know whether the data is stored in:

```text
Memory
   or
File
```

Architecture:

```text
RateLimiter
     |
     v
RateLimitStore
     |
     +-------------+
     |             |
     v             v
Memory Store    File Store
```

This keeps the algorithm and storage responsibilities separate.

---

# Environment Configuration

```env
PORT=3000

JWT_SECRET=abc

ACTIVE_RATE_LIMIT_ALGORITHM=token-bucket

TOKEN_BUCKET_ALGORITHM=token-bucket
TOKEN_BUCKET_CAPACITY=5
TOKEN_BUCKET_REFILLPERSECOND=1

SLIDING_WINDOW_ALGORITHM=sliding-window
SLIDING_WINDOW_MAXREQUESTS=5
SLIDING_WINDOW_WINDOWMS=10000

ACTIVE_STORAGE_TYPE=file

FILE_STORAGE_TYPE=file
MEMORY_STORAGE_TYPE=memory

DATA_FILE=./data/rate-limit-state.json
```

---

# Environment Variables

| Variable                       | Description                 | Example                        |
| ------------------------------ | --------------------------- | ------------------------------ |
| `PORT`                         | Application port            | `3000`                         |
| `JWT_SECRET`                   | JWT secret                  | `abc`                          |
| `ACTIVE_RATE_LIMIT_ALGORITHM`  | Active rate-limit algorithm | `token-bucket`                 |
| `TOKEN_BUCKET_ALGORITHM`       | Token Bucket identifier     | `token-bucket`                 |
| `TOKEN_BUCKET_CAPACITY`        | Maximum tokens              | `5`                            |
| `TOKEN_BUCKET_REFILLPERSECOND` | Tokens added per second     | `1`                            |
| `SLIDING_WINDOW_ALGORITHM`     | Sliding Window identifier   | `sliding-window`               |
| `SLIDING_WINDOW_MAXREQUESTS`   | Maximum requests            | `5`                            |
| `SLIDING_WINDOW_WINDOWMS`      | Window duration             | `10000`                        |
| `ACTIVE_STORAGE_TYPE`          | Active storage              | `file`                         |
| `FILE_STORAGE_TYPE`            | File storage identifier     | `file`                         |
| `MEMORY_STORAGE_TYPE`          | Memory storage identifier   | `memory`                       |
| `DATA_FILE`                    | Persistent state file       | `./data/rate-limit-state.json` |

---

# API Example

## Request

```bash
curl http://localhost:3000/foo \
  -H "Authorization: Bearer client-1"
```

## Successful Response

```json
{
  "success": true
}
```

## Rate Limit Exceeded

```json
{
  "error": "rate limit exceeded"
}
```

HTTP status:

```text
429 Too Many Requests
```

---

# Project Structure

```text
src/
│
├── config/
│   └── rateLimit.ts
│
├── middleware/
│   ├── auth.ts
│   └── rateLimit.ts
│
├── routes/
│   └── routes.ts
│
├── shared/
│   │
│   ├── factory/
│   │   └── createRateLimiter.ts
│   │
│   ├── ratelimit/
│   │   ├── tokenBucket.ts
│   │   └── slidingWindow.ts
│   │
│   ├── storage/
│   │   ├── memoryStore.ts
│   │   └── fileStore.ts
│   │
│   └── types/
│       ├── authRequest.ts
│       └── rateLimit.ts
│
├── app.ts
└── server.ts
```

---

# Installation

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Start production:

```bash
npm start
```

---

# Design Summary

The application follows a simple separation of responsibilities:

```text
Authentication
      |
      v
Middleware
      |
      v
Factory
      |
      v
RateLimiter Interface
      |
      +---------------------+
      |                     |
      v                     v
Token Bucket        Sliding Window
      |                     |
      +----------+----------+
                 |
                 v
          RateLimitStore
             /       \
            /         \
        Memory         File
```

### Key Design Principles

- **Factory Pattern** — creates the appropriate rate limiter.
- **Strategy Pattern** — allows different rate-limit algorithms to be used interchangeably.
- **Interface-based design** — both algorithms follow the same `RateLimiter` contract.
- **Storage abstraction** — algorithms are independent of the underlying storage.
- **Configuration-driven** — algorithm and storage can be changed through `.env`.
- **Separation of concerns** — authentication, middleware, factory, algorithms, and storage have separate responsibilities.

---

# Production Consideration

For multiple Node.js instances behind a load balancer, a shared store such as Redis is generally more appropriate than local memory/file storage.

```text
                    Load Balancer
                         |
              +----------+----------+
              |                     |
              v                     v
           Node 1                Node 2
              |                     |
              +----------+----------+
                         |
                         v
                       Redis
```

A shared store ensures that all application instances use the same rate-limit state.
