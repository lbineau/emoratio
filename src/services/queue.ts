import type { SentimentAnalyzer, SentimentResult } from "../types.js";

interface QueueItem {
  text: string;
  userId: string;
  guildId: string;
  channelId: string;
  resolve: (result: SentimentResult) => void;
  reject: (error: Error) => void;
}

export class MessageQueue {
  private queue: QueueItem[] = [];
  private processing = false;
  private batchSize: number;
  private delayMs: number;
  private analyzer: SentimentAnalyzer;

  constructor(analyzer: SentimentAnalyzer, batchSize = 5, delayMs = 100) {
    this.analyzer = analyzer;
    this.batchSize = batchSize;
    this.delayMs = delayMs;
  }

  enqueue(
    text: string,
    userId: string,
    guildId: string,
    channelId: string
  ): Promise<SentimentResult> {
    return new Promise((resolve, reject) => {
      this.queue.push({ text, userId, guildId, channelId, resolve, reject });
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);

      for (const item of batch) {
        try {
          const result = await this.analyzer.analyze(item.text);
          item.resolve(result);
        } catch (error) {
          item.reject(error instanceof Error ? error : new Error(String(error)));
        }
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
