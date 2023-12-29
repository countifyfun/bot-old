import { Command } from "@/structures/command";
import { getGuild } from "@/utils/db";
import { DangerEmbed, Embed } from "@/utils/embed";
import { SlashCommandBuilder } from "discord.js";

export default new Command({
  data: new SlashCommandBuilder()
    .setName("count")
    .setDescription("View the count in this server."),
  run: ({ interaction }) => {
    const guild = getGuild(interaction.guild.id);
    if (!guild || !guild.channelId)
      return interaction.reply({
        embeds: [
          new DangerEmbed().setDescription(
            "The counting system has not been enabled in this server."
          ),
        ],
      });

    interaction.reply({
      embeds: [
        new Embed()
          .setAuthor({
            name: interaction.guild.name,
            iconURL: interaction.guild.iconURL() ?? undefined,
          })
          .setDescription(
            `The current count is **${guild.count.toLocaleString()}**.\nThe next count is **${(
              guild.count + 1
            ).toLocaleString()}**.`
          ),
      ],
      ephemeral: true,
    });
  },
});
