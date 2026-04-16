import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { getLeaderboard, getServerVibeScore } from "../services/database.js";
import { buildLeaderboardEmbed } from "../utils/embeds.js";

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("See the server's most positive & negative users");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: "Only works in servers.", flags: 64 });
    return;
  }

  const best = getLeaderboard(guildId, "best");
  const worst = getLeaderboard(guildId, "worst");
  const serverVibe = getServerVibeScore(guildId);

  await interaction.reply({
    embeds: [buildLeaderboardEmbed(best, worst, serverVibe)],
  });
}
