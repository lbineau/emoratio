import type { SentimentAnalyzer, SentimentResult } from "../types.js";
import { OllamaClient } from "./ollama.js";

export class OllamaSentimentAnalyzer implements SentimentAnalyzer {
  private client: OllamaClient;

  constructor(client?: OllamaClient) {
    this.client = client ?? new OllamaClient();
  }

  async analyze(text: string): Promise<SentimentResult> {
    return this.client.analyze(text);
  }

  async analyzeBatch(texts: string[]): Promise<SentimentResult[]> {
    const results: SentimentResult[] = [];
    for (const text of texts) {
      results.push(await this.client.analyze(text));
    }
    return results;
  }
}
