import { EmbedBuilder } from "discord.js";
import type { UserStats, LeaderboardEntry } from "../types.js";

function vibeEmoji(ratio: number): string {
  if (ratio >= 0.8) return "😇";
  if (ratio >= 0.6) return "😊";
  if (ratio >= 0.4) return "😐";
  if (ratio >= 0.2) return "😠";
  return "😈";
}

function ratioBar(ratio: number, length = 10): string {
  const filled = Math.round(ratio * length);
  return "🟩".repeat(filled) + "🟥".repeat(length - filled);
}

export function buildVibeCheckEmbed(
  userId: string,
  stats: UserStats
): EmbedBuilder {
  const total = stats.positive_count + stats.negative_count + stats.neutral_count;
  const ratio =
    stats.positive_count + stats.negative_count === 0
      ? 0.5
      : stats.positive_count / (stats.positive_count + stats.negative_count);

  return new EmbedBuilder()
    .setTitle(`${vibeEmoji(ratio)} Vibe Check`)
    .setDescription(`<@${userId}>`)
    .setColor(ratio >= 0.5 ? 0x57f287 : 0xed4245)
    .addFields(
      { name: "Ratio", value: `${(ratio * 100).toFixed(1)}% positive`, inline: true },
      { name: "Vibe Bar", value: ratioBar(ratio), inline: false },
      { name: "✅ Positive", value: `${stats.positive_count}`, inline: true },
      { name: "❌ Negative", value: `${stats.negative_count}`, inline: true },
      { name: "😐 Neutral", value: `${stats.neutral_count}`, inline: true },
      { name: "Total Messages", value: `${total}`, inline: true },
      { name: "Avg Score", value: `${(stats.total_score / total).toFixed(3)}`, inline: true }
    )
    .setTimestamp();
}

export function buildNoDataEmbed(userId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("❓ No Data")
    .setDescription(`No messages recorded yet for <@${userId}>.`)
    .setColor(0x5865f2);
}

export function buildLeaderboardEmbed(
  best: LeaderboardEntry[],
  worst: LeaderboardEntry[],
  serverVibe: { avgScore: number; totalMessages: number }
): EmbedBuilder {
  const formatEntry = (e: LeaderboardEntry, i: number) =>
    `${i + 1}. <@${e.user_id}> — ${(e.ratio * 100).toFixed(1)}% (${e.total_messages} msgs)`;

  const bestList = best.length > 0
    ? best.map(formatEntry).join("\n")
    : "Not enough data yet.";

  const worstList = worst.length > 0
    ? worst.map(formatEntry).join("\n")
    : "Not enough data yet.";

  const serverEmoji = serverVibe.avgScore > 0.05 ? "😊" : serverVibe.avgScore < -0.05 ? "😠" : "😐";

  return new EmbedBuilder()
    .setTitle("📊 Server Leaderboard")
    .setColor(0x5865f2)
    .addFields(
      { name: "😇 Most Positive", value: bestList, inline: false },
      { name: "😈 Most Negative", value: worstList, inline: false },
      {
        name: `${serverEmoji} Server Vibe`,
        value: `Avg score: ${serverVibe.avgScore.toFixed(3)} | ${serverVibe.totalMessages} total messages`,
        inline: false,
      }
    )
    .setTimestamp();
}
