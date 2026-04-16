import "dotenv/config";
import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
  type ChatInputCommandInteraction,
  type SlashCommandBuilder,
} from "discord.js";
import { handleMessageCreate } from "./events/messageCreate.js";
import { OllamaSentimentAnalyzer } from "./services/sentiment.js";
import { OllamaClient } from "./services/ollama.js";
import { MessageQueue } from "./services/queue.js";
import { getDb, closeDb } from "./services/database.js";
import * as moodcheck from "./commands/moodcheck.js";
import * as moodboard from "./commands/moodboard.js";
import * as freerant from "./commands/freerant.js";

// --- Types ---
interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

// --- Setup ---
const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error("Missing BOT_TOKEN, CLIENT_ID, or GUILD_ID in .env");
  process.exit(1);
}

// --- Commands ---
const commands = new Collection<string, Command>();
commands.set(moodcheck.data.name, moodcheck as Command);
commands.set(moodboard.data.name, moodboard as Command);
commands.set(freerant.data.name, freerant as Command);

// --- Sentiment ---
const ollamaClient = new OllamaClient();
const analyzer = new OllamaSentimentAnalyzer(ollamaClient);
const queue = new MessageQueue(analyzer);

// --- Client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// --- Events ---
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ Logged in as ${readyClient.user.tag}`);

  // Init DB
  getDb();

  // Check Ollama
  const available = await ollamaClient.isAvailable();
  if (available) {
    console.log("🧠 Ollama connected");
  } else {
    console.warn("⚠️  Ollama not available — sentiment analysis will return neutral");
  }
});

client.on(Events.MessageCreate, (message) => {
  handleMessageCreate(message, queue);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[Command] ${interaction.commandName} failed:`, error);
    const reply = { content: "Something went wrong.", flags: 64 as const };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// --- Register Slash Commands ---
async function registerCommands(): Promise<void> {
  const rest = new REST().setToken(token!);
  const commandData = [...commands.values()].map((c) => c.data.toJSON());

  try {
    console.log("🔄 Registering slash commands...");
    await rest.put(Routes.applicationGuildCommands(clientId!, guildId!), {
      body: commandData,
    });
    console.log("✅ Slash commands registered");
  } catch (error) {
    console.error("Failed to register commands:", error);
  }
}

// --- Graceful Shutdown ---
function shutdown(): void {
  console.log("Shutting down...");
  closeDb();
  client.destroy();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// --- Start ---
await registerCommands();
await client.login(token);
