import type { SentimentAnalyzer, SentimentResult } from "../types.js";

interface QueueItem {
  text: string;
  userId: string;
  resolve: (result: SentimentResult) => void;
  reject: (error: Error) => void;
}

// SECURITY: hard cap on queue size to prevent memory exhaustion from spam floods.
// If a malicious user (or bug) enqueues faster than we can process, we reject
// new items rather than grow unbounded until OOM.
const MAX_QUEUE_SIZE = 1000;

// SECURITY: per-user rate limit to prevent a single account from monopolizing
// the queue / CPU. Sliding window: max N messages per window.
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 min
const RATE_LIMIT_MAX = 30; // 30 msg/user/min

export class MessageQueue {
  private queue: QueueItem[] = [];
  private processing = false;
  private batchSize: number;
  private delayMs: number;
  private analyzer: SentimentAnalyzer;

  // SECURITY: per-user timestamp ring for rate limiting.
  private userHits = new Map<string, number[]>();

  constructor(analyzer: SentimentAnalyzer, batchSize = 5, delayMs = 100) {
    this.analyzer = analyzer;
    this.batchSize = batchSize;
    this.delayMs = delayMs;
  }

  enqueue(text: string, userId: string): Promise<SentimentResult> {
    return new Promise((resolve, reject) => {
      // SECURITY: reject when queue full → bounded memory use under flood.
      if (this.queue.length >= MAX_QUEUE_SIZE) {
        reject(new Error("Queue full"));
        return;
      }

      // SECURITY: enforce per-user rate limit to stop single-user spam.
      if (this.isRateLimited(userId)) {
        reject(new Error("Rate limit exceeded"));
        return;
      }

      this.queue.push({ text, userId, resolve, reject });
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  // SECURITY: sliding-window rate limiter. Drops timestamps older than window,
  // rejects if remaining hits >= max. Prevents queue monopolization + CPU abuse.
  private isRateLimited(userId: string): boolean {
    const now = Date.now();
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    const hits = this.userHits.get(userId) ?? [];
    const recent = hits.filter((t) => t > cutoff);

    if (recent.length >= RATE_LIMIT_MAX) {
      this.userHits.set(userId, recent);
      return true;
    }

    recent.push(now);
    this.userHits.set(userId, recent);
    return false;
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);

      try {
        // Real batched inference: single tokenizer+forward pass for whole batch.
        const results = await this.analyzer.analyzeBatch(batch.map((i) => i.text));
        for (let i = 0; i < batch.length; i++) {
          batch[i]!.resolve(results[i] ?? { label: "neutral", score: 0 });
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        for (const item of batch) item.reject(err);
      }

      if (this.queue.length > 0) {
        await new Promise((r) => setTimeout(r, this.delayMs));
      }
    }

    this.processing = false;
  }

  get pending(): number {
    return this.queue.length;
  }
}
