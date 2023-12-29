import { BotClient } from "@/structures/client";
import { getGuild } from "@/utils/db";
import { DangerEmbed } from "@/utils/embed";

const isNumber = (str: string) => /^\d+$/.test(str);

export default (client: BotClient) => {
  client.on("messageCreate", (message) => {
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
    user.inc("counts");
  });
};
