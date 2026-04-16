import Database from "better-sqlite3";
import path from "node:path";
import { mkdirSync } from "node:fs";
import type { SentimentResult, UserStats, MoodBoardEntry } from "../types.js";

const DATA_DIR = path.join(process.cwd(), "data");
mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, "emoratio.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate();
  }
  return db;
}

function migrate(): void {
  const d = getDb();

  d.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      score REAL NOT NULL,
      label TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_stats (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      positive_count INTEGER DEFAULT 0,
      negative_count INTEGER DEFAULT 0,
      neutral_count INTEGER DEFAULT 0,
      total_score REAL DEFAULT 0,
      PRIMARY KEY (user_id, guild_id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_user_guild ON messages(user_id, guild_id);
    CREATE INDEX IF NOT EXISTS idx_user_stats_guild ON user_stats(guild_id);

    CREATE TABLE IF NOT EXISTS freerant (
      guild_id TEXT NOT NULL PRIMARY KEY,
      enabled_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function insertMessage(
  userId: string,
  guildId: string,
  channelId: string,
  result: SentimentResult
): void {
  const d = getDb();

  const insertMsg = d.prepare(`
    INSERT INTO messages (user_id, guild_id, channel_id, score, label)
    VALUES (?, ?, ?, ?, ?)
  `);

  const upsertStats = d.prepare(`
    INSERT INTO user_stats (user_id, guild_id, positive_count, negative_count, neutral_count, total_score)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, guild_id) DO UPDATE SET
      positive_count = positive_count + excluded.positive_count,
      negative_count = negative_count + excluded.negative_count,
      neutral_count = neutral_count + excluded.neutral_count,
      total_score = total_score + excluded.total_score
  `);

  const posInc = result.label === "positive" ? 1 : 0;
  const negInc = result.label === "negative" ? 1 : 0;
  const neuInc = result.label === "neutral" ? 1 : 0;

  const transaction = d.transaction(() => {
    insertMsg.run(userId, guildId, channelId, result.score, result.label);
    upsertStats.run(userId, guildId, posInc, negInc, neuInc, result.score);
  });

  transaction();
}

export function getUserStats(userId: string, guildId: string): UserStats | undefined {
  const d = getDb();
  return d.prepare(`
    SELECT * FROM user_stats WHERE user_id = ? AND guild_id = ?
  `).get(userId, guildId) as UserStats | undefined;
}

export function getMoodboard(
  guildId: string,
  order: "best" | "worst",
  limit = 10,
  minMessages = 10
): MoodBoardEntry[] {
  const d = getDb();
  const orderClause = order === "best" ? "DESC" : "ASC";

  return d.prepare(`
    SELECT *,
      (positive_count + negative_count + neutral_count) as total_messages,
      CASE
        WHEN (positive_count + negative_count) = 0 THEN 0.5
        ELSE CAST(positive_count AS REAL) / (positive_count + negative_count)
      END as ratio
    FROM user_stats
    WHERE guild_id = ?
      AND (positive_count + negative_count + neutral_count) >= ?
    ORDER BY ratio ${orderClause}, total_messages DESC
    LIMIT ?
  `).all(guildId, minMessages, limit) as MoodBoardEntry[];
}

export function getServerMoodScore(guildId: string): { avgScore: number; totalMessages: number } {
  const d = getDb();
  const row = d.prepare(`
    SELECT
      COALESCE(AVG(score), 0) as avgScore,
      COUNT(*) as totalMessages
    FROM messages WHERE guild_id = ?
  `).get(guildId) as { avgScore: number; totalMessages: number };
  return row;
}

export function isFreerant(guildId: string): boolean {
  const d = getDb();
  const row = d.prepare(`
    SELECT 1 FROM freerant WHERE guild_id = ?
  `).get(guildId);
  return row !== undefined;
}

export function setFreerant(guildId: string, enabled: boolean): void {
  const d = getDb();
  if (enabled) {
    d.prepare(`
      INSERT OR IGNORE INTO freerant (guild_id) VALUES (?)
    `).run(guildId);
  } else {
    d.prepare(`
      DELETE FROM freerant WHERE guild_id = ?
    `).run(guildId);
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
