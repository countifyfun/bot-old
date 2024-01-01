import type { ClientOptions } from "discord.js";
import { ActivityType, GatewayIntentBits, Partials } from "discord.js";

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
  partials: [
    Partials.Channel,
    Partials.GuildMember,
    Partials.GuildScheduledEvent,
    Partials.Message,
    Partials.Reaction,
    Partials.ThreadMember,
    Partials.User,
  ],
  allowedMentions: {
    parse: [],
    roles: [],
    users: [],
    repliedUser: true,
  },
};
