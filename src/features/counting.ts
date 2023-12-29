import { BotClient } from "@/structures/client";
import { db } from "@/utils/db";

const isNumber = (str: string) => /^\d+$/.test(str);

export default (client: BotClient) => {
  client.on("messageCreate", (message) => {
    if (message.author.bot || !message.inGuild()) return;

    const guild = db.guilds.get(message.guild.id);
    if (!guild || !guild.channelId || message.channel.id !== guild.channelId)
      return;

    const messageSplit = message.content.split(/[ :\n]+/);
    const messageNumberString = messageSplit[0];
    if (!isNumber(messageNumberString)) return void message.delete();

    const messageNumber = parseInt(messageNumberString, 10);
    if (guild.count + 1 !== messageNumber) return void message.delete();

    db.guilds.set(message.guild.id, messageNumber, "count");
    db.guilds.set(message.guild.id, message.author.id, "previousUserId");
  });
};
