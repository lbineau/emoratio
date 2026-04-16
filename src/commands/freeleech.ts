import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { isFreeleech, setFreeleech } from "../services/database.js";

export const data = new SlashCommandBuilder()
  .setName("freeleech")
  .setDescription("Toggle server-wide freeleech (ignores all negative messages)")
  .addBooleanOption((option) =>
    option
      .setName("enabled")
      .setDescription("Enable or disable freeleech")
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const enabled = interaction.options.getBoolean("enabled", true);
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: "Only works in servers.", flags: 64 });
    return;
  }

  setFreeleech(guildId, enabled);

  const status = enabled ? "✅ enabled" : "❌ disabled";
  await interaction.reply({
    content: `Server-wide freeleech ${status}. Negative messages ${enabled ? "will be ignored" : "will count again"}.`,
  });
}
