import type { Message } from "discord.js";
import { insertMessage, isFreerant } from "../services/database.js";
import type { MessageQueue } from "../services/queue.js";

const MIN_MESSAGE_LENGTH = 3;

export async function handleMessageCreate(
  message: Message,
  queue: MessageQueue
): Promise<void> {
  // Skip bots, commands, short messages
  if (message.author.bot) return;
  if (!message.guild) return;
  if (message.content.startsWith("/")) return;
  if (message.content.length < MIN_MESSAGE_LENGTH) return;

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
  } catch (error) {
    console.error(`[MessageCreate] Failed to process message:`, error);
  }
}
