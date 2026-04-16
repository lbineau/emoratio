import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { isFreerant, setFreerant } from "../services/database.js";

export const data = new SlashCommandBuilder()
  .setName("freerant")
  .setDescription("Activer/désactiver le freerant (ignore tous les messages négatifs)")
  .addBooleanOption((option) =>
    option
      .setName("enabled")
      .setDescription("Activer ou désactiver le freerant")
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const enabled = interaction.options.getBoolean("enabled", true);
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: "Fonctionne uniquement dans un serveur.", flags: 64 });
    return;
  }

  setFreerant(guildId, enabled);

  const status = enabled ? "✅ activé" : "❌ désactivé";
  await interaction.reply({
    content: `Freerant ${status} sur le serveur. Les messages négatifs ${enabled ? "seront ignorés" : "seront comptés à nouveau"}.`,
  });
}
