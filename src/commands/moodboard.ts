import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { getMoodboard, getServerMoodScore } from "../services/database.js";
import { buildMoodboardEmbed } from "../utils/embeds.js";

export const data = new SlashCommandBuilder()
  .setName("moodboard")
  .setDescription("Voir les utilisateurs les plus positifs et négatifs du serveur");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: "Fonctionne uniquement dans un serveur.", flags: 64 });
    return;
  }

  const best = getMoodboard(guildId, "best");
  const worst = getMoodboard(guildId, "worst");
  const serverMood = getServerMoodScore(guildId);

  await interaction.reply({
    embeds: [buildMoodboardEmbed(best, worst, serverMood)],
  });
}
