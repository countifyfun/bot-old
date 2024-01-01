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
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("reset_on_fail")
        .setDescription("Reset the count if a user gets the count wrong.")
        .addBooleanOption((option) =>
          option
            .setName("enabled")
            .setDescription("Whether reset on fail should be enabled or not.")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("talking")
        .setDescription(
          "Allow members to talk to each other in the counting channel."
        )
        .addBooleanOption((option) =>
          option
            .setName("enabled")
            .setDescription("Whether talking should be allowed or not.")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("no_deletion")
        .setDescription(
          "Resend the last count if it gets deleted accidentally."
        )
        .addBooleanOption((option) =>
          option
            .setName("enabled")
            .setDescription("Whether no deletion should be enabled or not.")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("pin_milestones")
        .setDescription(
          "Pin a message every time a new milestone is reached. (10, 20, 30, 40, 50, etc.)"
        )
        .addBooleanOption((option) =>
          option
            .setName("enabled")
            .setDescription(
              "Whether milestone pinning should be enabled or not."
            )
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("visibility")
        .setDescription("Update the visibility for this server.")
        .addStringOption((option) =>
          option
            .setName("visibility")
            .setDescription("The visibility for this server.")
            .addChoices(
              { name: "Public", value: "public" },
              { name: "Unlisted", value: "unlisted" }
            )
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
          const enabled =
            interaction.options.getBoolean("enabled") ??
            !guild.settings.oneByOne;
          guild.set(enabled, "settings.oneByOne");

          interaction.reply({
            embeds: [
              new SuccessEmbed().setDescription(
                `${enabled ? "Enabled" : "Disabled"} one by one.`
              ),
            ],
            ephemeral: true,
          });
        }
        break;
      case "reset_on_fail":
        {
          const enabled =
            interaction.options.getBoolean("enabled") ??
            !guild.settings.resetOnFail;
          guild.set(enabled, "settings.resetOnFail");

          interaction.reply({
            embeds: [
              new SuccessEmbed().setDescription(
                `${enabled ? "Enabled" : "Disabled"} reset on fail.`
              ),
            ],
            ephemeral: true,
          });
        }
        break;
      case "talking":
        {
          const enabled =
            interaction.options.getBoolean("enabled") ??
            !guild.settings.talking;
          guild.set(enabled, "settings.talking");

          interaction.reply({
            embeds: [
              new SuccessEmbed().setDescription(
                `${enabled ? "Enabled" : "Disabled"} talking.`
              ),
            ],
            ephemeral: true,
          });
        }
        break;
      case "no_deletion":
        {
          const enabled =
            interaction.options.getBoolean("enabled") ??
            !guild.settings.noDeletion;
          guild.set(enabled, "settings.noDeletion");

          interaction.reply({
            embeds: [
              new SuccessEmbed().setDescription(
                `${enabled ? "Enabled" : "Disabled"} no deletion.`
              ),
            ],
            ephemeral: true,
          });
        }
        break;
      case "pin_milestones":
        {
          const enabled =
            interaction.options.getBoolean("enabled") ??
            !guild.settings.pinMilestones;
          guild.set(enabled, "settings.pinMilestones");

          interaction.reply({
            embeds: [
              new SuccessEmbed().setDescription(
                `${enabled ? "Enabled" : "Disabled"} milestone pinning.`
              ),
            ],
            ephemeral: true,
          });
        }
        break;
      case "visiblity":
        {
          const enabled =
            interaction.options.getString("visibility", true) === "unlisted"
              ? true
              : false;
          guild.set(enabled, "settings.unlisted");

          interaction.reply({
            embeds: [
              new SuccessEmbed().setDescription(
                `This server is now ${enabled ? "unlisted" : "public"}.`
              ),
            ],
            ephemeral: true,
          });
        }
        break;
    }
  },
});
