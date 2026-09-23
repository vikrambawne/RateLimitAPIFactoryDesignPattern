import express from "express";
import router from "./routes/routes";
import authMiddleware from "./middleware/auth";
import rateLimitMiddleware from "./middleware/rateLimit";
import { FileStore } from "./shared/storage/file-store";
import { MemoryStore } from "./shared/storage/memory-store";
import { RateLimitStore } from "./shared/types/rateLimit";

const app = express();

app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    message: "API is healthy",
  });
});

app.get("/", (req, res) => {
  res.status(200).send("Welcome to API!!!");
});

if (!process.env.DATA_FILE) {
  throw new Error("DATA_FILE is required when STORAGE_TYPE=file");
}

const store: RateLimitStore =
  process.env.ACTIVE_STORAGE_TYPE === process.env.FILE_STORAGE_TYPE
    ? new FileStore(process.env.DATA_FILE)
    : new MemoryStore();

app.use(authMiddleware);
app.use(rateLimitMiddleware(store));
app.use("/api", router);

export default app;
