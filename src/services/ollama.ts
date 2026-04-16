import type { SentimentResult } from "../types.js";

const DEFAULT_URL = "http://localhost:11434";
const DEFAULT_MODEL = "llama3.2:3b";

const SYSTEM_PROMPT = `You are a sentiment classifier. For each message, respond with ONLY a JSON object, no other text.
Format: {"label": "positive"|"negative"|"neutral", "score": <float from -1.0 to 1.0>}
Rules:
- score > 0.05 = positive, score < -0.05 = negative, else neutral
- Handle French, English, and mixed languages
- Consider emojis, slang, and internet speak
- Be accurate, not biased toward any label`;

export class OllamaClient {
  private url: string;
  private model: string;

  constructor(url?: string, model?: string) {
    this.url = url ?? process.env.OLLAMA_URL ?? DEFAULT_URL;
    this.model = model ?? process.env.OLLAMA_MODEL ?? DEFAULT_MODEL;
  }

  async analyze(text: string): Promise<SentimentResult> {
    try {
      const response = await fetch(`${this.url}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt: `Classify the sentiment of this message:\n"${text}"`,
          system: SYSTEM_PROMPT,
          stream: false,
          format: "json",
          options: {
            temperature: 0.1,
            num_predict: 64,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { response: string };
      return this.parseResponse(data.response);
    } catch (error) {
      console.warn(`[Ollama] Analysis failed, defaulting neutral:`, error);
      return { label: "neutral", score: 0 };
    }
  }

  private parseResponse(raw: string): SentimentResult {
    try {
      const parsed = JSON.parse(raw) as { label?: string; score?: number };

      const score = typeof parsed.score === "number"
        ? Math.max(-1, Math.min(1, parsed.score))
        : 0;

      let label: SentimentResult["label"];
      if (score > 0.05) label = "positive";
      else if (score < -0.05) label = "negative";
      else label = "neutral";

      return { label, score };
    } catch {
      console.warn(`[Ollama] Failed to parse response: ${raw}`);
      return { label: "neutral", score: 0 };
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.url}/api/tags`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }
}
