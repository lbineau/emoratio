import { pipeline, env, type TextClassificationPipeline } from "@huggingface/transformers";
import type { SentimentAnalyzer, SentimentResult } from "../types.js";

// Allow local cache; prevent network per-call after first download
env.allowLocalModels = true;
env.allowRemoteModels = true;

const DEFAULT_MODEL = "onnx-community/twitter-xlm-roberta-base-sentiment-ONNX";

// Labels from cardiffnlp/twitter-xlm-roberta-base-sentiment
// id2label: 0=negative, 1=neutral, 2=positive
const LABEL_MAP: Record<string, SentimentResult["label"]> = {
  negative: "negative",
  neutral: "neutral",
  positive: "positive",
  LABEL_0: "negative",
  LABEL_1: "neutral",
  LABEL_2: "positive",
};

// SECURITY: cap tokenizer input to bound inference cost regardless of char-level
// truncation upstream. 128 tokens = ample for tweet-length sentiment signal.
const MAX_TOKENS = 128;

interface ClassOutput {
  label: string;
  score: number;
}

function normalizeText(text: string): string {
  return text
    .replace(/<a?:\w+:\d+>/g, "") // custom Discord emotes
    .replace(/<@!?\d+>/g, "@user") // user mentions
    .replace(/<#\d+>/g, "#channel") // channel mentions
    .replace(/<@&\d+>/g, "@role") // role mentions
    .replace(/https?:\/\/\S+/g, "http") // URLs
    .trim();
}

function toResult(scores: ClassOutput[]): SentimentResult {
  if (scores.length === 0) return { label: "neutral", score: 0 };

  // Find max
  let best: ClassOutput = scores[0]!;
  for (const s of scores) if (s.score > best.score) best = s;

  const label = LABEL_MAP[best.label] ?? "neutral";

  // Signed score in [-1, 1]: positive prob - negative prob
  const pos = scores.find((s) => LABEL_MAP[s.label] === "positive")?.score ?? 0;
  const neg = scores.find((s) => LABEL_MAP[s.label] === "negative")?.score ?? 0;
  const score = Math.max(-1, Math.min(1, pos - neg));

  return { label, score };
}

export class TransformersSentimentAnalyzer implements SentimentAnalyzer {
  private modelId: string;
  private classifier: TextClassificationPipeline | null = null;
  private loading: Promise<TextClassificationPipeline> | null = null;

  constructor(modelId?: string) {
    this.modelId = modelId ?? process.env.SENTIMENT_MODEL ?? DEFAULT_MODEL;
  }

  private async getPipeline(): Promise<TextClassificationPipeline> {
    if (this.classifier) return this.classifier;
    if (!this.loading) {
      this.loading = pipeline("text-classification", this.modelId, {
        // Quantized ONNX → small + fast on CPU/Pi
        dtype: "q8",
      }) as Promise<TextClassificationPipeline>;
    }
    this.classifier = await this.loading;
    return this.classifier;
  }

  async warmup(): Promise<void> {
    await this.getPipeline();
  }

  async analyze(text: string): Promise<SentimentResult> {
    try {
      const clean = normalizeText(text);
      if (!clean) return { label: "neutral", score: 0 };

      const clf = await this.getPipeline();
      // topk: return all 3 class probs
      const raw = (await clf(clean, {
        top_k: 3,
        truncation: true,
        max_length: MAX_TOKENS,
      })) as ClassOutput[] | ClassOutput[][];
      const scores = (Array.isArray(raw[0]) ? raw[0] : raw) as ClassOutput[];
      return toResult(scores);
    } catch (error) {
      console.warn(`[Sentiment] Analysis failed, defaulting neutral:`, error);
      return { label: "neutral", score: 0 };
    }
  }

  async analyzeBatch(texts: string[]): Promise<SentimentResult[]> {
    if (texts.length === 0) return [];
    try {
      const clf = await this.getPipeline();
      const cleaned = texts.map(normalizeText);
      const raw = (await clf(cleaned, {
        top_k: 3,
        truncation: true,
        max_length: MAX_TOKENS,
      })) as ClassOutput[][];
      return raw.map((r) => toResult(r));
    } catch (error) {
      console.warn(`[Sentiment] Batch analysis failed, defaulting neutral:`, error);
      return texts.map(() => ({ label: "neutral", score: 0 }));
    }
  }
}
