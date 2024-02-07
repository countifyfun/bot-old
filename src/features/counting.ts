import type { BotClient } from "@/structures/client";
import { db, getGuild } from "@/utils/db";
import { DangerEmbed } from "@/utils/embed";
import type { Message } from "discord.js";

const isNumber = (str: string) => /^\d+$/.test(str);

export default (client: BotClient) => {
  client.on("ready", async () => {
    const servers = db.guilds
      .keyArray()
      .map((key) => {
        const guild = client.guilds.cache.get(key);
        if (!guild) return;
        const data = getGuild(key);
        return {
          id: key,
          name: guild.name,
          avatar: guild.iconURL({ size: 4096 })?.replace("webp", "png"),
          ...data,
        };
      })
      .filter(Boolean);
    for (const server of servers) {
      try {
        if (!server.channelId || !server.previousMessageId) continue;

        const guild = client.guilds.cache.get(server.id);
        if (!guild) continue;

        const channel = guild.channels.cache.get(server.channelId);
        if (!channel || !channel.isTextBased()) continue;

        let checkedMessages = 0;
        let lastCheckedMessageId = undefined;
        let finished = false;
        let failed = false;

        while (checkedMessages < 100 || !finished) {
          const message: Message<true> | undefined = await channel.messages
            .fetch({ limit: 1, before: lastCheckedMessageId })
            .then((messages) => messages.at(0));
          if (!message) {
            failed = true;
            break;
          }

          const messageSplit = message.content.split(/[ :\n]+/);
          const messageNumberString = messageSplit[0].split(",").join("");
          if (!isNumber(messageNumberString)) {
            lastCheckedMessageId = message.id;
            checkedMessages += 1;
            continue;
          }

          const messageNumber = parseInt(messageNumberString, 10);
          if (messageNumber === server.count) {
            finished = true;
            break;
          }

          server.set(messageNumber, "count");
          finished = true;
          break;
        }

        if (failed || (!finished && checkedMessages > 99))
          channel.send({
            embeds: [
              new DangerEmbed()
                .setTitle("❌ Oh no!")
                .setDescription(
                  `I tried updating this channel's count, but failed. Please ask a staff member to run </update count:${client.getSlashCommand(
                    "update"
                  )}> to update the count.`
                ),
            ],
          });
      } catch (err) {
        console.error(err);
        continue;
      }
    }
  });

  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.inGuild()) return;

    const guild = getGuild(message.guild.id);
    if (!guild || !guild.channelId || message.channel.id !== guild.channelId)
      return;

    const user = guild.getUser(message.author.id);

    if (guild.settings.oneByOne && guild.previousUserId === message.author.id) {
      if (guild.settings.resetOnFail) {
        guild.set(0, "count");
        message.channel.send({
          embeds: [
            new DangerEmbed()
              .setTitle("❌ Oh no!")
              .setDescription(
                `${message.author} counted more than once. The count has been reset to 0!`
              ),
          ],
        });
      } else message.delete();
      user.inc("fails");
      return;
    }

    const messageSplit = message.content.split(/[ :\n]+/);
    if (!guild.settings.talking && messageSplit.length > 1) {
      if (guild.settings.resetOnFail) {
        guild.set(0, "count");
        message.channel.send({
          embeds: [
            new DangerEmbed()
              .setTitle("❌ Oh no!")
              .setDescription(
                `${message.author} talked in their count message. The count has been reset to 0!`
              ),
          ],
        });
      } else message.delete();
      user.inc("fails");
      return;
    }

    const messageNumberString = messageSplit[0].split(",").join("");
    if (!isNumber(messageNumberString)) {
      if (guild.settings.resetOnFail) {
        guild.set(0, "count");
        message.channel.send({
          embeds: [
            new DangerEmbed()
              .setTitle("❌ Oh no!")
              .setDescription(
                `${message.author} got the count wrong. The count has been reset to 0!`
              ),
          ],
        });
      } else message.delete();
      user.inc("fails");
      return;
    }

    const messageNumber = parseInt(messageNumberString, 10);
    const nextCount = guild.count + 1;
    if (guild.settings.resetOnFail) {
      if (nextCount === messageNumber) message.react("✅");
      else {
        message.react("❌");
        guild.set(0, "count");
        user.inc("fails");
        return void message.channel.send({
          embeds: [
            new DangerEmbed()
              .setTitle("❌ Oh no!")
              .setDescription(
                `${message.author} got the count wrong. The count has been reset to 0!`
              ),
          ],
        });
      }
    } else if (nextCount !== messageNumber) {
      message.delete();
      user.inc("fails");
      return;
    }

    guild.inc("count");
    guild.set(message.author.id, "previousUserId");
    guild.set(message.id, "previousMessageId");
    user.inc("counts");

    if (guild.settings.pinMilestones && messageNumber % 10 === 0) {
      const pins = await message.channel.messages.fetchPinned();
      if (pins.size >= 50) await pins.first()?.unpin();
      message.pin();
    }
  });

  client.on("messageDelete", async (message) => {
    if (message.author?.bot || !message.inGuild()) return;

    const guild = getGuild(message.guild.id);
    if (
      !guild ||
      !guild.channelId ||
      message.channel.id !== guild.channelId ||
      !guild.settings.noDeletion ||
      !guild.previousMessageId ||
      guild.previousMessageId !== message.id
    )
      return;

    const messageSplit = message.content.split(/[ :\n]+/);
    const messageNumberString = messageSplit[0].split(",").join("");

    const newMessage = await message.channel.send({
      content: `${message.author}: ${messageNumberString}`,
    });
    guild.set(newMessage.id, "previousMessageId");
    if (message.pinned) newMessage.pin();
  });
};
