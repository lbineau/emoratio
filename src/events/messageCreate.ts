import type { Message } from "discord.js";
import { insertMessage, isFreerant } from "../services/database.js";
import type { MessageQueue } from "../services/queue.js";

const MIN_MESSAGE_LENGTH = 3;

// SECURITY: cap input length before sending to tokenizer/model.
// Discord allows 2000 chars; tokenizer cost scales linearly with length.
// 500 chars is plenty for sentiment signal and limits CPU per message.
const MAX_MESSAGE_LENGTH = 500;

export async function handleMessageCreate(
  message: Message,
  queue: MessageQueue
): Promise<void> {
  // Skip bots, DMs, short messages. Slash commands never arrive here.
  if (message.author.bot) return;
  if (!message.guild) return;
  if (message.content.length < MIN_MESSAGE_LENGTH) return;

  try {
    // SECURITY: truncate message before enqueue to bound per-message CPU cost.
    const safeText = message.content.slice(0, MAX_MESSAGE_LENGTH);

    const result = await queue.enqueue(safeText, message.author.id);

    // Freerant: skip negative messages for protected users
    if (result.label === "negative" && isFreerant(message.guild.id)) {
      return;
    }

    insertMessage(message.author.id, message.guild.id, message.channel.id, result);
  } catch (error) {
    // Rate-limit / queue-full rejections land here; swallow to avoid log spam.
    if (error instanceof Error && (error.message === "Rate limit exceeded" || error.message === "Queue full")) {
      return;
    }
    console.error(`[MessageCreate] Failed to process message:`, error);
  }
}
