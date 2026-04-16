import { EmbedBuilder } from "discord.js";
import type { UserStats, MoodBoardEntry } from "../types.js";

function moodEmoji(ratio: number): string {
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

export function buildMoodCheckEmbed(
  userId: string,
  stats: UserStats
): EmbedBuilder {
  const total = stats.positive_count + stats.negative_count + stats.neutral_count;
  const ratio =
    stats.positive_count + stats.negative_count === 0
      ? 0.5
      : stats.positive_count / (stats.positive_count + stats.negative_count);

  return new EmbedBuilder()
    .setTitle(`${moodEmoji(ratio)} Mood Check`)
    .setDescription(`<@${userId}>`)
    .setColor(ratio >= 0.5 ? 0x57f287 : 0xed4245)
    .addFields(
      { name: "Ratio", value: `${(ratio * 100).toFixed(1)}% positif`, inline: true },
      { name: "Mood bar", value: ratioBar(ratio), inline: false },
      { name: "✅ Positif", value: `${stats.positive_count}`, inline: true },
      { name: "❌ Négatif", value: `${stats.negative_count}`, inline: true },
      { name: "😐 Neutre", value: `${stats.neutral_count}`, inline: true },
      { name: "Total messages", value: `${total}`, inline: true },
      { name: "Score moyen", value: `${(stats.total_score / total).toFixed(3)}`, inline: true }
    )
    .setTimestamp();
}

export function buildNoDataEmbed(userId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("❓ Aucune donnée")
    .setDescription(`Aucun message enregistré pour <@${userId}>.`)
    .setColor(0x5865f2);
}

export function buildMoodboardEmbed(
  best: MoodBoardEntry[],
  worst: MoodBoardEntry[],
  serverMood: { avgScore: number; totalMessages: number }
): EmbedBuilder {
  const formatEntry = (e: MoodBoardEntry, i: number) =>
    `${i + 1}. <@${e.user_id}> — ${(e.ratio * 100).toFixed(1)}% (${e.total_messages} msgs)`;

  const bestList = best.length > 0
    ? best.map(formatEntry).join("\n")
    : "Pas encore assez de données.";

  const worstList = worst.length > 0
    ? worst.map(formatEntry).join("\n")
    : "Pas encore assez de données.";

  const serverEmoji = serverMood.avgScore > 0.05 ? "😊" : serverMood.avgScore < -0.05 ? "😠" : "😐";

  return new EmbedBuilder()
    .setTitle("📊 Classement du serveur")
    .setColor(0x5865f2)
    .addFields(
      { name: "😇 Les plus positifs", value: bestList, inline: false },
      { name: "😈 Les plus négatifs", value: worstList, inline: false },
      {
        name: `${serverEmoji} Mood du serveur`,
        value: `Score moyen : ${serverMood.avgScore.toFixed(3)} | ${serverMood.totalMessages} messages au total`,
        inline: false,
      }
    )
    .setTimestamp();
}
