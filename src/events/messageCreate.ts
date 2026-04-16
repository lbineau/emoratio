import type { Message } from "discord.js";
import { insertMessage, isFreerant } from "../services/database.js";
import type { MessageQueue } from "../services/queue.js";

const MIN_MESSAGE_LENGTH = 3;

export async function handleMessageCreate(
  message: Message,
  queue: MessageQueue
): Promise<void> {
  // Skip bots, commands, short messages
  if (message.author.bot) {
    console.log(`[MessageCreate] Skipped bot message from ${message.author.tag}`);
    return;
  }
  if (!message.guild) {
    console.log(`[MessageCreate] Skipped DM from ${message.author.tag}`);
    return;
  }
  if (message.content.startsWith("/")) {
    console.log(`[MessageCreate] Skipped command: ${message.content}`);
    return;
  }
  if (message.content.length < MIN_MESSAGE_LENGTH) {
    console.log(`[MessageCreate] Skipped short message (${message.content.length} chars) from ${message.author.tag}`);
    return;
  }
  if (!message.content) {
    console.log(`[MessageCreate] Empty content from ${message.author.tag} — MessageContent intent missing?`);
    return;
  }

  console.log(`[MessageCreate] Processing message from ${message.author.tag} in guild ${message.guild.id}: "${message.content.substring(0, 50)}"`);

  try {
    const result = await queue.enqueue(
      message.content,
      message.author.id,
      message.guild.id,
      message.channel.id
    );

    // Freerant: skip negative messages for protected users
    if (result.label === "negative" && isFreerant(message.guild.id)) {
      return;
    }

    insertMessage(message.author.id, message.guild.id, message.channel.id, result);
    console.log(`[MessageCreate] Stored: ${message.author.tag} → ${result.label} (${result.score})`);
  } catch (error) {
    console.error(`[MessageCreate] Failed to process message:`, error);
  }
}
