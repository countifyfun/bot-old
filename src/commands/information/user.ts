import { Command } from "@/structures/command";
import { cfRatio } from "@/utils/cf-ratio";
import { getGuild } from "@/utils/db";
import { DangerEmbed, Embed } from "@/utils/embed";
import { SlashCommandBuilder } from "discord.js";

export default new Command({
  data: new SlashCommandBuilder()
    .setName("user")
    .setDescription("View a user's statistics.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to view the statistics of.")
        .setRequired(false)
    ),
  run: ({ interaction }) => {
    const user = interaction.options.getUser("user") ?? interaction.user;

    const guild = getGuild(interaction.guild.id);
    if (!guild || !guild.channelId)
      return interaction.reply({
        embeds: [
          new DangerEmbed().setDescription(
            "The counting system has not been enabled in this server."
          ),
        ],
        ephemeral: true,
      });

    const userData = guild.getUser(user.id);

    interaction.reply({
      embeds: [
        new Embed()
          .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL(),
          })
          .addFields(
            {
              name: "Counts",
              value: userData.counts.toLocaleString(),
              inline: true,
            },
            {
              name: "Fails",
              value: userData.fails.toLocaleString(),
              inline: true,
            },
            {
              name: "C/F Ratio",
              value: cfRatio(userData.counts, userData.fails) + "%",
            }
          ),
      ],
      ephemeral: true,
    });
  },
});
