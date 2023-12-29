import { Command } from "@/structures/command";
import { SlashCommandBuilder } from "discord.js";

export default new Command({
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Pings the bot."),
  run: ({ interaction }) => interaction.reply("Pong!"),
});
