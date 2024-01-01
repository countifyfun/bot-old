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
    .setName("setup")
    .setDescription("Setup the counting system for this server.")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The counting channel.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addNumberOption((option) =>
      option
        .setName("count")
        .setDescription("The count for the channel.")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  run: async ({ interaction }) => {
    const guild = getGuild(interaction.guild.id);

    if (guild && guild.channelId)
      return interaction.reply({
        embeds: [
          new DangerEmbed().setDescription(
            "The counting system is already enabled in this server."
          ),
        ],
        ephemeral: true,
      });

    let channel = interaction.options.getChannel("channel");
    if (!channel)
      channel = await interaction.guild.channels.create({
        name: "counting",
        type: ChannelType.GuildText,
      });
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

    const count = interaction.options.getNumber("count");

    guild.set(channel.id, "channelId");
    if (count) guild.set(count, "count");

    interaction.reply({
      embeds: [
        new SuccessEmbed().setDescription(
          "The counting system has been enabled in this server."
        ),
      ],
      ephemeral: true,
    });
  },
});
