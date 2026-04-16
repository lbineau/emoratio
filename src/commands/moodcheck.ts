import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { getUserStats } from "../services/database.js";
import { buildMoodCheckEmbed, buildNoDataEmbed } from "../utils/embeds.js";

export const data = new SlashCommandBuilder()
  .setName("moodcheck")
  .setDescription("Vérifie ton ratio de mood (ou celui de quelqu'un)")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("Utilisateur à vérifier (par défaut : toi)")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser("user") ?? interaction.user;
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: "Fonctionne uniquement dans un serveur.", flags: 64 });
    return;
  }

  const stats = getUserStats(target.id, guildId);

  if (!stats || (stats.positive_count + stats.negative_count + stats.neutral_count) === 0) {
    await interaction.reply({ embeds: [buildNoDataEmbed(target.id)] });
    return;
  }

  await interaction.reply({ embeds: [buildMoodCheckEmbed(target.id, stats)] });
}
