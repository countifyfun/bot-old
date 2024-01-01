import { Command } from "@/structures/command";
import { cfRatio } from "@/utils/cf-ratio";
import { db, getGuild, type User } from "@/utils/db";
import { DangerEmbed, Embed } from "@/utils/embed";
import { SlashCommandBuilder } from "discord.js";
import _ from "lodash";

export default new Command({
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View leaderboards.")
    .addSubcommand((subcommand) =>
      subcommand.setName("servers").setDescription("View the top 10 servers.")
    )
    .addSubcommandGroup((group) =>
      group
        .setName("counts")
        .setDescription("View the top 10 users who have successfully counted.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("server")
            .setDescription(
              "View the top 10 users who have successfully counted in this server."
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("global")
            .setDescription(
              "View the top 10 users who have successfully counted globally."
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName("fails")
        .setDescription(
          "View the top 10 users who have unsuccessfully counted."
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("server")
            .setDescription(
              "View the top 10 users who have unsuccessfully counted in this server."
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("global")
            .setDescription(
              "View the top 10 users who have unsuccessfully counted globally."
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName("cf_ratio")
        .setDescription(
          "View the top 10 users who have the highest Count/Fail ratio."
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("server")
            .setDescription(
              "View the top 10 users who have the highest Count/Fail ratio in this server."
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("global")
            .setDescription(
              "View the top 10 users who have the highest Count/Fail Ratio globally."
            )
        )
    ),
  run: ({ client, interaction }) => {
    const group = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    const guild = getGuild(interaction.guild.id);
    const guildUsers = Object.keys(guild.users).map((key) => ({
      id: key,
      ...guild.getUser(key),
    }));
    const allGuilds = db.guilds
      .keyArray()
      .map((key) => ({ id: key, ...getGuild(key) }));
    const allUsers = _.flatten(
      allGuilds.map((guild) =>
        Object.keys(guild.users).map((key) => ({
          id: key,
          ...guild.getUser(key),
        }))
      )
    ).reduce(
      (acc, curr) => {
        const index = acc.findIndex((x) => x.id === curr.id);
        if (index !== -1) {
          acc[index].counts += curr.counts;
          acc[index].fails += curr.fails;
        } else acc.push(curr);
        return acc;
      },
      [] as (User & { id: string })[]
    );

    if (subcommand === "server" && (!guild || !guild.channelId))
      return interaction.reply({
        embeds: [
          new DangerEmbed().setDescription(
            "The counting system has not been enabled in this server."
          ),
        ],
      });

    if (subcommand === "servers") {
      const servers = allGuilds
        .filter((guild) => !guild.settings.unlisted)
        .sort((a, b) => b.count - a.count);
      const total = allGuilds
        .filter((guild) => !guild.settings.unlisted)
        .reduce((acc, curr) => acc + curr.count, 0);

      interaction.reply({
        embeds: [
          new Embed()
            .setAuthor({
              name: "Top 10 Servers",
              iconURL: client.user.displayAvatarURL(),
            })
            .setDescription(
              servers
                .map(
                  (server, index) =>
                    `**${index + 1}**. ${
                      client.guilds.cache.get(server.id)?.name ?? "A server"
                    }: ${server.count.toLocaleString()}`
                )
                .join("\n")
            )
            .setFooter({
              text: `Total: ${total.toLocaleString()}`,
            }),
        ],
        ephemeral: true,
      });
    } else if (group === "counts") {
      switch (subcommand) {
        case "server":
          {
            const users = guildUsers.sort((a, b) => b.counts - a.counts);
            const total = guildUsers.reduce(
              (acc, curr) => acc + curr.counts,
              0
            );

            if (!users.length)
              return interaction.reply({
                embeds: [
                  new DangerEmbed().setDescription(
                    "No one has counted in this server yet."
                  ),
                ],
                ephemeral: true,
              });

            interaction.reply({
              embeds: [
                new Embed()
                  .setAuthor({
                    name: "Top 10 Users (Counts)",
                    iconURL: interaction.guild.iconURL() ?? undefined,
                  })
                  .setDescription(
                    users
                      .map(
                        (user, index) =>
                          `**${index + 1}**. ${
                            interaction.guild.members.cache.get(user.id)?.user
                              .username ?? `<@${user.id}>`
                          }: ${user.counts.toLocaleString()}`
                      )
                      .join("\n")
                  )
                  .setFooter({
                    text: `Total: ${total.toLocaleString()}`,
                  }),
              ],
              ephemeral: true,
            });
          }
          break;
        case "global":
          {
            const users = allUsers.sort((a, b) => b.counts - a.counts);
            const total = allUsers.reduce((acc, curr) => acc + curr.counts, 0);

            interaction.reply({
              embeds: [
                new Embed()
                  .setAuthor({
                    name: "Top 10 Users (Counts)",
                    iconURL: client.user.displayAvatarURL(),
                  })
                  .setDescription(
                    users
                      .map(
                        (user, index) =>
                          `**${index + 1}**. ${
                            client.users.cache.get(user.id)?.username ??
                            `<@${user.id}>`
                          }: ${user.counts.toLocaleString()}`
                      )
                      .join("\n")
                  )
                  .setFooter({
                    text: `Total: ${total.toLocaleString()}`,
                  }),
              ],
              ephemeral: true,
            });
          }
          break;
      }
    } else if (group === "fails") {
      switch (subcommand) {
        case "server":
          {
            const users = guildUsers.sort((a, b) => b.fails - a.fails);
            const total = guildUsers.reduce((acc, curr) => acc + curr.fails, 0);

            if (!users.length)
              return interaction.reply({
                embeds: [
                  new DangerEmbed().setDescription(
                    "No one has counted in this server yet."
                  ),
                ],
                ephemeral: true,
              });

            interaction.reply({
              embeds: [
                new Embed()
                  .setAuthor({
                    name: "Top 10 Users (Fails)",
                    iconURL: interaction.guild.iconURL() ?? undefined,
                  })
                  .setDescription(
                    users
                      .map(
                        (user, index) =>
                          `**${index + 1}**. ${
                            interaction.guild.members.cache.get(user.id)?.user
                              .username ?? `<@${user.id}>`
                          }: ${user.fails.toLocaleString()}`
                      )
                      .join("\n")
                  )
                  .setFooter({
                    text: `Total: ${total.toLocaleString()}`,
                  }),
              ],
              ephemeral: true,
            });
          }
          break;
        case "global":
          {
            const users = allUsers.sort((a, b) => b.fails - a.fails);
            const total = allUsers.reduce((acc, curr) => acc + curr.fails, 0);

            interaction.reply({
              embeds: [
                new Embed()
                  .setAuthor({
                    name: "Top 10 Users (Fails)",
                    iconURL: client.user.displayAvatarURL(),
                  })
                  .setDescription(
                    users
                      .map(
                        (user, index) =>
                          `**${index + 1}**. ${
                            client.users.cache.get(user.id)?.username ??
                            `<@${user.id}>`
                          }: ${user.fails.toLocaleString()}`
                      )
                      .join("\n")
                  )
                  .setFooter({
                    text: `Total: ${total.toLocaleString()}`,
                  }),
              ],
              ephemeral: true,
            });
          }
          break;
      }
    } else if (group === "cf_ratio") {
      switch (subcommand) {
        case "server":
          {
            const users = guildUsers.sort(
              (a, b) => cfRatio(b.counts, b.fails) - cfRatio(a.counts, a.fails)
            );

            if (!users.length)
              return interaction.reply({
                embeds: [
                  new DangerEmbed().setDescription(
                    "No one has counted in this server yet."
                  ),
                ],
                ephemeral: true,
              });

            interaction.reply({
              embeds: [
                new Embed()
                  .setAuthor({
                    name: "Top 10 Users (C/F Ratio)",
                    iconURL: interaction.guild.iconURL() ?? undefined,
                  })
                  .setDescription(
                    users
                      .map(
                        (user, index) =>
                          `**${index + 1}**. ${
                            interaction.guild.members.cache.get(user.id)?.user
                              .username ?? `<@${user.id}>`
                          }: ${cfRatio(user.counts, user.fails)}%`
                      )
                      .join("\n")
                  ),
              ],
              ephemeral: true,
            });
          }
          break;
        case "global":
          {
            const users = allUsers.sort(
              (a, b) => cfRatio(b.counts, b.fails) - cfRatio(a.counts, a.fails)
            );

            interaction.reply({
              embeds: [
                new Embed()
                  .setAuthor({
                    name: "Top 10 Users (C/F Ratio)",
                    iconURL: client.user.displayAvatarURL(),
                  })
                  .setDescription(
                    users
                      .map(
                        (user, index) =>
                          `**${index + 1}**. ${
                            client.users.cache.get(user.id)?.username ??
                            `<@${user.id}>`
                          }: ${cfRatio(user.counts, user.fails)}%`
                      )
                      .join("\n")
                  ),
              ],
              ephemeral: true,
            });
          }
          break;
      }
    }
  },
});
