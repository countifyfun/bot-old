import { Command } from "@/structures/command";
import { Embed } from "@/utils/embed";
import { SlashCommandBuilder } from "discord.js";

export default new Command({
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Pings the bot."),
  run: async ({ client, interaction }) => {
    const res = await interaction.deferReply({
      ephemeral: true,
      fetchReply: true,
    });

    const ping = res.createdTimestamp - interaction.createdTimestamp;

    interaction.followUp({
      embeds: [
        new Embed().setTitle("🏓 Pong!").addFields(
          {
            name: "🤖 Bot",
            value: `${ping}ms`,
            inline: true,
          },
          {
            name: "📶 API",
            value: `${client.ws.ping}ms`,
            inline: true,
          }
        ),
      ],
    });
  },
});
