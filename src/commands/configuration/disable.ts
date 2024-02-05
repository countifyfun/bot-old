import { Command } from "@/structures/command";
import { getGuild } from "@/utils/db";
import { DangerEmbed, SuccessEmbed } from "@/utils/embed";
import { SlashCommandBuilder } from "discord.js";

export default new Command({
  data: new SlashCommandBuilder()
    .setName("disable")
    .setDescription("Disable the counting system for this server"),
  run: ({ client, interaction }) => {
    const guild = getGuild(interaction.guild.id);
    if (!guild || !guild.channelId)
      return interaction.reply({
        embeds: [
          new DangerEmbed().setDescription(
            `The counting system is not enabled in this server. Enable it by running </setup:${
              client.getSlashCommand("setup")!.id
            }>.`
          ),
        ],
        ephemeral: true,
      });

    guild.delete();

    interaction.reply({
      embeds: [
        new SuccessEmbed().setDescription(
          "The counting system has been disabled in this server."
        ),
      ],
      ephemeral: true,
    });
  },
});
