import type { ClientOptions } from "discord.js";
import { ActivityType, GatewayIntentBits } from "discord.js";

export const botOptions: ClientOptions = {
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  presence: {
    activities: [
      {
        name: "lunatics count",
        type: ActivityType.Watching,
      },
    ],
  },
  allowedMentions: {
    parse: [],
    roles: [],
    users: [],
    repliedUser: true,
  },
};
