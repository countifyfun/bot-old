import { Command } from "@/structures/command";
import { getGuild } from "@/utils/db";
import { DangerEmbed, SuccessEmbed } from "@/utils/embed";
import { SlashCommandBuilder } from "discord.js";

export default new Command({
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("Enable and disable settings in this server.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("one_by_one")
        .setDescription("Only allow one count per user.")
        .addBooleanOption((option) =>
          option
            .setName("enabled")
            .setDescription("Whether one by one should be enabled or not.")
            .setRequired(true)
        )
    ),
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

    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case "one_by_one":
        {
          const enabled = interaction.options.getBoolean("enabled", true);
          guild.set(enabled, "settings.oneByOne");

          interaction.reply({
            embeds: [
              new SuccessEmbed().setDescription(
                `${enabled ? "Enabled" : "Disabled"} one by one!`
              ),
            ],
            ephemeral: true,
          });
        }
        break;
    }
  },
});