import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { getUserStats } from "../services/database.js";
import { buildVibeCheckEmbed, buildNoDataEmbed } from "../utils/embeds.js";

export const data = new SlashCommandBuilder()
  .setName("vibecheck")
  .setDescription("Check your (or someone's) vibe ratio")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("User to check (defaults to you)")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser("user") ?? interaction.user;
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: "Only works in servers.", flags: 64 });
    return;
  }

  const stats = getUserStats(target.id, guildId);

  if (!stats || (stats.positive_count + stats.negative_count + stats.neutral_count) === 0) {
    await interaction.reply({ embeds: [buildNoDataEmbed(target.id)] });
    return;
  }

  await interaction.reply({ embeds: [buildVibeCheckEmbed(target.id, stats)] });
}
