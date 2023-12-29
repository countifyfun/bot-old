import { Command } from "@/structures/command";
import { getGuild } from "@/utils/db";
import { DangerEmbed, SuccessEmbed } from "@/utils/embed";
import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

export default new Command({
  data: new SlashCommandBuilder()
    .setName("update")
    .setDescription("Update the counting system in this server.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("channel")
        .setDescription("Update the counting channel in this server.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The new counting channel.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("count")
        .setDescription("Update the count in this server.")
        .addNumberOption((option) =>
          option
            .setName("count")
            .setDescription("The new count.")
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
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
      case "channel":
        {
          let channel = interaction.options.getChannel("channel");
          if (
            !channel ||
            !channel.isTextBased() ||
            channel.type !== ChannelType.GuildText
          )
            return interaction.reply({
              embeds: [
                new DangerEmbed().setDescription(
                  "The counting channel must be a text channel."
                ),
              ],
              ephemeral: true,
            });

          guild.set(channel.id, "channelId");

          interaction.reply({
            embeds: [
              new SuccessEmbed().setDescription(
                `The counting channel has been set to ${channel}.`
              ),
            ],
            ephemeral: true,
          });
        }
        break;
      case "count":
        {
          const count = interaction.options.getNumber("count", true);
          guild.set(count, "count");

          interaction.reply({
            embeds: [
              new SuccessEmbed().setDescription(
                `The count has been set to ${count.toLocaleString()}.`
              ),
            ],
            ephemeral: true,
          });
        }
        break;
    }
  },
});
