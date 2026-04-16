export interface SentimentResult {
  label: "positive" | "negative" | "neutral";
  score: number; // -1.0 to 1.0
}

export interface SentimentAnalyzer {
  analyze(text: string): Promise<SentimentResult>;
  analyzeBatch(texts: string[]): Promise<SentimentResult[]>;
}

export interface MessageRecord {
  id: number;
  user_id: string;
  guild_id: string;
  channel_id: string;
  score: number;
  label: string;
  created_at: string;
}

export interface UserStats {
  user_id: string;
  guild_id: string;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  total_score: number;
}

export interface LeaderboardEntry {
  user_id: string;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  total_score: number;
  ratio: number;
  total_messages: number;
}
